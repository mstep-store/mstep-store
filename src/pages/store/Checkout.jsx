import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
    ArrowLeft,
    CheckCircle2,
    MapPin,
    Package,
    ShoppingBag,
    Truck,
} from "lucide-react";
import { createOrder } from "../../services/orderService";
import { supabase } from "../../services/supabase";
import { getEffectivePrice, getOriginalPrice } from "../../utils/pricing";
import { getShippingLocations, getShippingSettings } from "../../services/shippingService";

function getSavedCart() {
    try {
        const saved = JSON.parse(localStorage.getItem("cart") || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function formatPrice(price) {
    return `${Number(price || 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} EGP`;
}

export default function Checkout() {
    const navigate = useNavigate();

    const [cart, setCart] = useState(getSavedCart);
    const [shippingLocations, setShippingLocations] = useState([]);
    const [shippingLoading, setShippingLoading] = useState(true);
    const [shippingSettings, setShippingSettings] = useState({ mode: "governorate", fixed_price: 100 });

    const [priceChanges, setPriceChanges] = useState([]);
    const [approving, setApproving] = useState(false);

    async function revalidatePrices(currentCart) {
        const items = currentCart ?? cart;
        if (!items.length) {
            setPriceChanges([]);
            return;
        }

        const variantIds = [
            ...new Set(items.map((item) => item.variant_id).filter(Boolean)),
        ];

        if (!variantIds.length) {
            setPriceChanges([]);
            return;
        }

        const { data, error } = await supabase
            .from("product_variants")
            .select(
                "id, price, products (discount_type, discount_value, discount_start_at, discount_end_at)"
            )
            .in("id", variantIds);

        if (error || !data) {
            return;
        }

        const byId = new Map(data.map((variant) => [String(variant.id), variant]));

        const changes = [];
        for (const item of items) {
            const variant = byId.get(String(item.variant_id));
            if (!variant) continue;
            const newPrice = getEffectivePrice(variant, variant.products);
            const oldPrice = Number(item.price || 0);
            if (Math.abs(newPrice - oldPrice) > 0.0001) {
                changes.push({
                    variant_id: item.variant_id,
                    name: item.name,
                    oldPrice,
                    newPrice,
                });
            }
        }

        setPriceChanges(changes);
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            revalidatePrices(cart);
        }, 0);
        return () => clearTimeout(timer);
    }, [cart]); // eslint-disable-line react-hooks/exhaustive-deps

    const [form, setForm] = useState({
        customer_name: "",
        customer_email: "",
        marketing_consent: true,
        customer_phone: "",
        shipping_address: "",
        shipping_city: "",
        shipping_governorate_id: "",
        shipping_city_id: "",
        shipping_notes: "",
    });

    useEffect(() => {
        let mounted = true;
        Promise.all([getShippingLocations(), getShippingSettings()])
            .then(([rows, settings]) => {
                if (!mounted) return;
                setShippingLocations(rows);
                setShippingSettings(settings);
            })
            .catch((err) => { if (mounted) setError(err.message || "Unable to load shipping options."); })
            .finally(() => { if (mounted) setShippingLoading(false); });
        return () => { mounted = false; };
    }, []);

    const selectedGovernorate = shippingLocations.find((item) => String(item.id) === String(form.shipping_governorate_id));
    const availableCities = selectedGovernorate?.shipping_cities ?? [];
    const shippingCost = shippingSettings.mode === "fixed"
        ? Number(shippingSettings.fixed_price)
        : (selectedGovernorate ? Number(selectedGovernorate.shipping_price) : 0);

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cart-updated"));
    }, [cart]);

    const subtotal = useMemo(
        () =>
            cart.reduce(
                (sum, item) =>
                    sum +
                    Number(item.price || 0) *
                    Number(item.quantity || 0),
                0
            ),
        [cart]
    );

    const totalQuantity = useMemo(
        () =>
            cart.reduce(
                (sum, item) => sum + Number(item.quantity || 0),
                0
            ),
        [cart]
    );

    const total = subtotal + shippingCost;

    function handleGovernorateChange(event) {
        const governorateId = event.target.value;
        setForm((current) => ({
            ...current,
            shipping_governorate_id: governorateId,
            shipping_governorate: shippingLocations.find((item) => String(item.id) === String(governorateId))?.name ?? "",
            shipping_city_id: "",
            shipping_city: "",
        }));
    }

    function handleCityChange(event) {
        const cityId = event.target.value;
        const city = availableCities.find((item) => String(item.id) === String(cityId));
        setForm((current) => ({ ...current, shipping_city_id: cityId, shipping_city: city?.name ?? "" }));
    }

    function handleChange(event) {
        const { name, value, type, checked } = event.target;
        const fieldValue =
            type === "checkbox"
                ? checked
                : name === "customer_phone"
                    ? value.replace(/\D/g, "").slice(0, 11)
                    : value;

        setForm((current) => ({
            ...current,
            [name]: fieldValue,
        }));
    }

    async function handleApprovePrices() {
        setApproving(true);
        setError("");

        try {
            const { data } = await supabase
                .from("product_variants")
                .select(
                    "id, price, products (discount_type, discount_value, discount_start_at, discount_end_at)"
                )
                .in(
                    "id",
                    priceChanges.map((change) => change.variant_id)
                );

            const byId = new Map((data ?? []).map((v) => [String(v.id), v]));

            setCart((current) => {
                const updated = current.map((item) => {
                    const variant = byId.get(String(item.variant_id));
                    if (!variant) return item;
                    const newPrice = getEffectivePrice(variant, variant.products);
                    const change = priceChanges.find(
                        (c) => String(c.variant_id) === String(item.variant_id)
                    );
                    if (change && Math.abs(change.newPrice - newPrice) < 0.0001) {
                        return {
                            ...item,
                            price: newPrice,
                            original_price: getOriginalPrice(variant),
                        };
                    }
                    return item;
                });
                localStorage.setItem("cart", JSON.stringify(updated));
                window.dispatchEvent(new Event("cart-updated"));
                return updated;
            });

            // Revalidate after approval.
            setTimeout(() => revalidatePrices(), 0);
        } catch {
            setError("تعذر تحديث الأسعار. حاول مرة أخرى.");
        } finally {
            setApproving(false);
        }
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");

        if (submitting) return;

        if (cart.length === 0) {
            setError("Your cart is empty. Add products before checkout.");
            return;
        }

        if (shippingSettings.mode === "fixed") {
            if (!form.shipping_governorate.trim() || !form.shipping_city.trim() || !form.shipping_address.trim()) {
                setError("Please enter your governorate, city, and full address.");
                return;
            }
        } else if (!form.shipping_governorate_id || !form.shipping_city_id) {
            setError("Please select your governorate and city.");
            return;
        }

        if (priceChanges.length > 0) {
            setError(
                "Some prices changed. Please review and approve the new prices before placing the order."
            );
            return;
        }

        setSubmitting(true);

        try {
            const order = await createOrder({
                ...form,
                shipping_mode: shippingSettings.mode,
                cart,
            });

            // Clear the cart only after the order has been saved.
            localStorage.removeItem("cart");
            window.dispatchEvent(new Event("cart-updated"));
            setCart([]);

            navigate("/order-success", {
                state: {
                    orderNumber: order.order_number,
                    total: order.total,
                },
            });
        } catch (err) {
            setError(
                err.message ||
                "Something went wrong. Please try again."
            );
        } finally {
            setSubmitting(false);
        }
    }

    if (cart.length === 0) {
        return (
            <main className="mx-auto max-w-4xl px-4 py-16">
                <div className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center">
                    <ShoppingBag
                        size={42}
                        className="mx-auto text-[var(--color-subtle)]"
                    />

                    <h1 className="mt-5 text-2xl font-extrabold text-[var(--color-text-strong)]">
                        Your Cart Is Empty
                    </h1>

                    <p className="mt-3 text-[var(--color-muted)]">
                        Add your favorite items before proceeding to checkout.
                    </p>

                    <Link
                        to="/products"
                        className="mt-6 inline-flex rounded-xl bg-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-dark)]"
                    >
                        Browse Products
                    </Link>
                </div>
            </main>
        );
    }

    return (
        <main
            dir="ltr"
            className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:py-12"
        >
            <Link
                to="/cart"
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-primary)]"
            >
                <ArrowLeft size={17} />
                Back to Cart
            </Link>

            <header className="mb-8">
                <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-pink)]">
                    M.STEP
                </p>

                <h1 className="mt-2 text-3xl font-extrabold text-[var(--color-text-strong)] sm:text-4xl">
                    Checkout
                </h1>

                <p className="mt-3 text-[var(--color-muted)]">
                    Enter your details to complete your order.
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="grid items-start gap-8 lg:grid-cols-[1fr_380px]"
            >
                <div className="space-y-6">
                    {/* Customer Information */}
                    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-blue-50)] text-[var(--color-primary)]">
                                <ShoppingBag size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                                    Customer Information
                                </h2>
                                <p className="text-sm text-[var(--color-muted)]">
                                    Your contact details
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="customer_name"
                                    className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                >
                                    Full Name *
                                </label>

                                <input
                                    id="customer_name"
                                    name="customer_name"
                                    type="text"
                                    autoComplete="name"
                                    required
                                    minLength={2}
                                    maxLength={120}
                                    value={form.customer_name}
                                    onChange={handleChange}
                                    placeholder="Enter your full name"
                                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none! transition focus:border-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-blue-100)]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="customer_phone"
                                    className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                >
                                    Phone Number *
                                </label>

                                <input
                                    id="customer_phone"
                                    name="customer_phone"
                                    type="tel"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                    required
                                    maxLength={11}
                                    pattern="[0-9]{11}"
                                    value={form.customer_phone}
                                    onChange={handleChange}
                                    placeholder="Your phone number"
                                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none! transition focus:border-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-blue-100)]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="customer_email"
                                    className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                >
                                    Email Address *
                                </label>

                                <input
                                    id="customer_email"
                                    name="customer_email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    maxLength={254}
                                    value={form.customer_email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none! transition focus:border-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-blue-100)]"
                                />
                            </div>
                        </div>

                        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--color-border)] p-3 text-sm leading-6 text-[var(--color-text-secondary)]">
                            <input
                                type="checkbox"
                                name="marketing_consent"
                                checked={Boolean(form.marketing_consent)}
                                onChange={handleChange}
                                className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-navy)]"
                            />
                            <span dir="ltr" className="text-left">
                                I agree to receive offers and discounts via email.
                            </span>
                        </label>
                    </section>

                    {/* Shipping Information */}
                    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-pink-50)] text-[var(--color-pink-dark)]">
                                <MapPin size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                                    Shipping Address
                                </h2>
                                <p className="text-sm text-[var(--color-muted)]">
                                    Where should we deliver your order?
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            {shippingSettings.mode === "fixed" ? (
                                <div className="space-y-5">
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="shipping_governorate" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">Governorate *</label>
                                            <input id="shipping_governorate" name="shipping_governorate" required value={form.shipping_governorate} onChange={handleChange} placeholder="Enter governorate" className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none! focus:border-[var(--color-primary-hover)]" />
                                        </div>
                                        <div>
                                            <label htmlFor="shipping_city" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">City / District *</label>
                                            <input id="shipping_city" name="shipping_city" required value={form.shipping_city} onChange={handleChange} placeholder="Enter city or district" className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none! focus:border-[var(--color-primary-hover)]" />
                                        </div>
                                    </div>
                                    <div dir="ltr" className="rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] px-4 py-3 text-left text-sm">
                                        <span className="text-[var(--color-text-secondary)]">Flat shipping fee: </span>
                                        <strong className="text-[var(--color-success)]">{formatPrice(shippingCost)}</strong>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-5 sm:grid-cols-2">
                                        <div>
                                            <label htmlFor="shipping_governorate_id" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">Governorate *</label>
                                            <select id="shipping_governorate_id" required value={form.shipping_governorate_id} onChange={handleGovernorateChange} disabled={shippingLoading} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none! focus:border-[var(--color-primary-hover)]">
                                                <option value="">{shippingLoading ? "Loading governorates..." : "Select governorate"}</option>
                                                {shippingLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="shipping_city_id" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">City / District *</label>
                                            <select id="shipping_city_id" required value={form.shipping_city_id} onChange={handleCityChange} disabled={!selectedGovernorate || availableCities.length === 0} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none! focus:border-[var(--color-primary-hover)]">
                                                <option value="">{!selectedGovernorate ? "Select a governorate first" : "Select city"}</option>
                                                {availableCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    {selectedGovernorate && <div dir="ltr" className="rounded-xl border border-[var(--color-success)]/20 bg-[var(--color-success-bg)] px-4 py-3 text-left text-sm"><span className="text-[var(--color-text-secondary)]">Shipping to {selectedGovernorate.name}: </span><strong className="text-[var(--color-success)]">{formatPrice(shippingCost)}</strong></div>}
                                    {!shippingLoading && shippingLocations.length === 0 && <p className="text-sm text-[var(--color-danger)]">No shipping locations are currently available. Please contact the store.</p>}
                                </>
                            )}

                            <div>
                                <label
                                    htmlFor="shipping_address"
                                    className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                >
                                    Full Address *
                                </label>

                                <textarea
                                    id="shipping_address"
                                    name="shipping_address"
                                    autoComplete="street-address"
                                    required
                                    minLength={5}
                                    maxLength={500}
                                    rows={3}
                                    value={form.shipping_address}
                                    onChange={handleChange}
                                    placeholder="Street, building number, apartment, and area"
                                    className="w-full resize-y rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none transition focus:border-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-blue-100)]"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="shipping_notes"
                                    className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]"
                                >
                                    Delivery Notes
                                    <span className="font-normal text-[var(--color-subtle)]">
                                        {" "}(Optional)
                                    </span>
                                </label>

                                <textarea
                                    id="shipping_notes"
                                    name="shipping_notes"
                                    rows={2}
                                    maxLength={1000}
                                    value={form.shipping_notes}
                                    onChange={handleChange}
                                    placeholder="Landmarks or special delivery instructions"
                                    className="w-full resize-y rounded-xl border border-[var(--color-border)] px-4 py-3 outline-none transition focus:border-[var(--color-primary-hover)] focus:ring-2 focus:ring-[var(--color-blue-100)]"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Payment Method */}
                    <section className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-success-bg)] text-[var(--color-success)]">
                                <Truck size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-[var(--color-text-strong)]">
                                    Payment Method
                                </h2>

                                <p className="mt-1 text-sm text-[var(--color-muted)]">
                                    Cash on Delivery
                                </p>

                                <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
                                    Pay for your order when it arrives at your
                                    delivery address.
                                </p>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm leading-6 text-[var(--color-danger-dark)]"
                        >
                            {error}
                        </div>
                    )}
                </div>

                {/* Order Summary */}
                <aside className="h-fit rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 sm:p-7 lg:sticky lg:top-6">
                    <h2 className="text-xl font-extrabold text-[var(--color-text-strong)]">
                        Order Summary
                    </h2>

                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {totalQuantity}{" "}
                        {totalQuantity === 1 ? "item" : "items"} in your order
                    </p>

                    <div className="my-6 space-y-5">
                        {cart.map((item) => (
                            <div
                                key={item.variant_id}
                                className="flex gap-3"
                            >
                                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-slate-100)]">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name || "Product"}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <Package
                                                size={20}
                                                className="text-[var(--color-subtle)]"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-sm font-bold text-[var(--color-text)]">
                                        {item.name}
                                    </h3>

                                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                                        Color: {item.color_name || "N/A"}
                                    </p>

                                    <p className="text-xs text-[var(--color-muted)]">
                                        Size: {item.size_name || "N/A"}
                                    </p>

                                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                                        Qty: {item.quantity}
                                    </p>
                                </div>

                                <p className="shrink-0 text-sm font-bold text-[var(--color-text-strong)]">
                                    {formatPrice(
                                        Number(item.price || 0) *
                                        Number(item.quantity || 0)
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 border-t border-[var(--color-border)] pt-5">
                        <div className="flex justify-between gap-3 text-sm text-[var(--color-text-muted)]">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>

                        <div className="flex justify-between gap-3 text-sm text-[var(--color-text-muted)]">
                            <span>Shipping</span>
                            <span>
                                {shippingSettings.mode === "fixed"
                                    ? formatPrice(shippingCost)
                                    : selectedGovernorate
                                        ? formatPrice(shippingCost)
                                        : "Select governorate"}
                            </span>
                        </div>

                        <div className="flex justify-between gap-3 border-t border-[var(--color-border)] pt-4 text-lg font-extrabold text-[var(--color-text-strong)]">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>

                    {priceChanges.length > 0 && (
                        <div className="rounded-xl border border-[var(--color-warning-border)] bg-[var(--color-warning-bg)] p-4 text-sm text-[var(--color-warning-text)]">
                            <p className="font-bold">Price changes detected</p>
                            <ul className="mt-2 space-y-1">
                                {priceChanges.map((change) => (
                                    <li key={change.variant_id}>
                                        {change.name}: {formatPrice(change.oldPrice)} →{" "}
                                        {formatPrice(change.newPrice)}
                                    </li>
                                ))}
                            </ul>
                            <button
                                type="button"
                                onClick={handleApprovePrices}
                                disabled={approving}
                                className="mt-3 rounded-lg bg-[var(--color-warning)] px-4 py-2 font-bold text-[var(--color-on-primary)] disabled:opacity-60"
                            >
                                {approving ? "Approving..." : "Approve new prices"}
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={
                            submitting ||
                            cart.length === 0 ||
                            shippingLoading ||
                            (shippingSettings.mode === "governorate" &&
                                (!form.shipping_governorate_id || !form.shipping_city_id))
                        }
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 py-4 font-bold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {submitting ? (
                            "Placing Order..."
                        ) : (
                            <>
                                <CheckCircle2 size={19} />
                                Place Order
                            </>
                        )}
                    </button>


                    <p className="mt-5! text-center text-xs leading-5 text-[var(--color-muted)]">
                        By placing your order, you confirm that your contact
                        and delivery details are correct.
                    </p>

                    <Link
                        to="/products"
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-3.5 font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary)] hover:bg-[var(--color-page)] hover:text-[var(--color-primary)]"
                    >
                        <ArrowLeft size={18} />
                        Continue Shopping
                    </Link>

                </aside>
            </form>
        </main>
    );
}
