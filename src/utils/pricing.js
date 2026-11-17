/**
 * Client-side price helpers (product-level discounts).
 *
 * A discount is configured once per product (discount_type, discount_value,
 * discount_start_at, discount_end_at on the `products` row) and applies to the
 * price of every variant of that product. Variant-level discount columns are
 * not used.
 *
 * IMPORTANT: These use the client clock for DISPLAY only. Order creation
 * authoritatively recomputes prices on the server using database time
 * (submit_checkout_order). Money is computed in integer cents so the result
 * matches PostgreSQL round(numeric, 2).
 */

function toCents(n) {
    return Math.round(Number(n) * 100);
}

function timeOf(value) {
    if (!value) return null;
    const time = new Date(value).getTime();
    return Number.isFinite(time) ? time : null;
}

function round2(n) {
    return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

/**
 * Whether the product's discount is configured and inside its date window
 * (start inclusive, end exclusive).
 *
 * @param {object} product - product row with discount_* fields
 * @param {number} [nowMs=Date.now()] - client timestamp in ms
 */
export function isDiscountActive(product, nowMs = Date.now()) {
    if (!product) return false;

    const type = product.discount_type;
    if (type !== "percentage" && type !== "fixed") return false;

    if (product.discount_value == null) return false;
    const value = Number(product.discount_value);
    if (!Number.isFinite(value) || value < 0) return false;

    const now = Number.isFinite(nowMs) ? nowMs : Date.now();
    const start = timeOf(product.discount_start_at);
    const end = timeOf(product.discount_end_at);

    return (start === null || now >= start) && (end === null || now < end);
}

/**
 * "none" | "active" | "scheduled" | "expired" - used by the admin list.
 */
export function getDiscountStatus(product, nowMs = Date.now()) {
    const type = product?.discount_type;
    if (type !== "percentage" && type !== "fixed") return "none";
    if (isDiscountActive(product, nowMs)) return "active";

    const start = timeOf(product.discount_start_at);
    if (start !== null && nowMs < start) return "scheduled";

    return "expired";
}

/**
 * Short label such as "20%" or "50 EGP".
 */
export function describeDiscount(product) {
    if (!product?.discount_type || product.discount_value == null) return "";
    const value = Number(product.discount_value);
    return product.discount_type === "percentage"
        ? `${value}%`
        : `${value} EGP`;
}

/**
 * Original (non-discounted) variant price.
 */
export function getOriginalPrice(variant) {
    if (!variant) return 0;
    const price = Number(variant.price);
    return Number.isFinite(price) ? round2(price) : 0;
}

/**
 * Effective unit price of a variant, after the product's active discount.
 * A discount that would make the price zero or negative is ignored (the
 * server does the same).
 *
 * @param {object} variant - variant row (price)
 * @param {object|null} product - product row with discount_* fields
 * @param {number} [nowMs=Date.now()]
 * @returns {number} price rounded to 2 decimals
 */
export function getEffectivePrice(variant, product = null, nowMs = Date.now()) {
    if (!variant) return 0;

    const price = Number(variant.price);
    if (!Number.isFinite(price)) return 0;

    const originalCents = toCents(price);

    if (!isDiscountActive(product, nowMs)) {
        return originalCents / 100;
    }

    const valueCents = toCents(product.discount_value);
    let cents;

    if (product.discount_type === "percentage") {
        // round(price * (1 - value / 100), 2), half rounded up, in integers.
        cents = Math.floor(
            (originalCents * (10000 - valueCents) + 5000) / 10000
        );
    } else {
        cents = originalCents - valueCents;
    }

    if (!Number.isFinite(cents) || cents <= 0) {
        return originalCents / 100;
    }

    return cents / 100;
}

/**
 * { original, effective, discounted, percentOff } for one variant.
 */
export function getPriceInfo(variant, product = null, nowMs = Date.now()) {
    const original = getOriginalPrice(variant);
    const effective = getEffectivePrice(variant, product, nowMs);
    const discounted = effective > 0 && effective < original;
    const percentOff = discounted
        ? Math.round((1 - effective / original) * 100)
        : 0;

    return { original, effective, discounted, percentOff };
}

/**
 * Price shown on listing cards: the cheapest purchasable variant with the
 * product discount applied. Products with no purchasable variant fall back to
 * base_price and never claim a discount.
 *
 * @param {object} product - product with `variants` (purchasable) and discount_*
 */
export function getListingPriceInfo(product, nowMs = Date.now()) {
    const variants = product?.variants ?? [];

    if (!variants.length) {
        const base = round2(Number(product?.base_price) || 0);
        return {
            original: base,
            effective: base,
            discounted: false,
            percentOff: 0,
        };
    }

    let best = null;
    for (const variant of variants) {
        const info = getPriceInfo(variant, product, nowMs);
        if (!best || info.effective < best.effective) {
            best = info;
        }
    }

    return best;
}
