import { supabase } from "./supabase";

/**
 * Fetch all orders.
 */
export async function getOrders() {
    const { data, error } = await supabase
        .from("orders")
        .select(`
            *,
            order_items (
                id,
                variant_id,
                product_name,
                color_name,
                size_name,
                sku,
                unit_price,
                quantity,
                line_total
            )
        `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching orders:", error);
        throw new Error("Unable to fetch orders.");
    }

    return data ?? [];
}

/**
 * Update an order's status.
 */
export async function updateOrderStatus(orderId, status, { reason } = {}) {
    const allowedStatuses = [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid order status.");
    }

    const now = new Date().toISOString();
    const changes = { status, updated_at: now };

    if (status === "cancelled") {
        changes.cancelled_at = now;
        changes.cancelled_by = "admin";
        changes.cancel_reason = reason || null;
    }

    const { data, error } = await supabase
        .from("orders")
        .update(changes)
        .eq("id", orderId)
        .select()
        .single();

    if (error) {
        console.error("Error updating order status:", error);
        throw new Error("Unable to update order status.");
    }

    return data;
}

/**
 * Fetch best-selling products.
 * Aggregates quantities from order items belonging to orders
 * that have not been cancelled.
 */
export async function getBestSellingProducts(limit = 5) {
    const safeLimit = Number.isInteger(Number(limit))
        ? Math.max(1, Math.min(Number(limit), 50))
        : 5;

    const { data, error } = await supabase
        .from("order_items")
        .select(`
            product_name,
            variant_id,
            quantity,
            line_total,
            orders!inner (
                status
            )
        `)
        .neq("orders.status", "cancelled");

    if (error) {
        console.error("Error fetching best-selling products:", error);
        throw new Error("Unable to fetch best-selling products.");
    }

    const productsMap = new Map();

    for (const item of data ?? []) {
        const key = item.variant_id
            ? `variant-${item.variant_id}`
            : item.product_name;

        const existing = productsMap.get(key) ?? {
            variant_id: item.variant_id,
            product_name: item.product_name,
            total_quantity: 0,
            total_sales: 0,
        };

        existing.total_quantity += Number(item.quantity) || 0;
        existing.total_sales += Number(item.line_total) || 0;

        productsMap.set(key, existing);
    }

    return [...productsMap.values()]
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, safeLimit);
}

/**
 * Create a new cash-on-delivery order.
 *
 * IMPORTANT:
 * This client-side function uses prices stored in the cart.
 * For production, calculate prices and validate stock on the server
 * using a Supabase RPC/database function.
 */
export async function createOrder({
    customer_name, customer_email = "", marketing_consent = false, customer_phone, shipping_address,
    shipping_city, shipping_governorate = "", shipping_governorate_id = "",
    shipping_city_id = "", shipping_notes = "", shipping_mode = "governorate", cart,
}) {
    if (!Array.isArray(cart) || cart.length === 0) throw new Error("Your cart is empty.");
    const common = { customer_name, customer_email, customer_phone, shipping_address, shipping_city };
    for (const value of Object.values(common)) {
        if (!String(value ?? "").trim()) throw new Error("Please complete all required customer details.");
    }

    const cleanEmail = String(customer_email ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(cleanEmail)) {
        throw new Error("Please enter a valid email address.");
    }
    const cleanPhone = String(customer_phone ?? "").replace(/\D/g, "");
    if (cleanPhone.length !== 11) {
        throw new Error("Please enter a phone number with exactly 11 digits.");
    }
    if (shipping_mode === "governorate" && (!shipping_governorate_id || !shipping_city_id)) {
        throw new Error("Please select a governorate and city.");
    }
    if (shipping_mode === "fixed" && !String(shipping_governorate).trim()) {
        throw new Error("Please enter your governorate.");
    }
    const items = cart.map((item) => {
        const quantity = Number(item.quantity);
        if (item.variant_id == null || !Number.isInteger(quantity) || quantity < 1) {
            throw new Error("One or more cart items contain invalid information.");
        }
        return { variant_id: Number(item.variant_id), quantity };
    });
    const { data, error } = await supabase.rpc("submit_checkout_order_v2", {
        p_customer_name: customer_name.trim(),
        p_customer_phone: cleanPhone,
        p_shipping_address: shipping_address.trim(),
        p_shipping_mode: shipping_mode,
        p_governorate_id: shipping_mode === "governorate" ? Number(shipping_governorate_id) : null,
        p_city_id: shipping_mode === "governorate" ? Number(shipping_city_id) : null,
        p_manual_governorate: shipping_mode === "fixed" ? shipping_governorate.trim() : null,
        p_manual_city: shipping_city.trim(),
        p_items: items,
        p_customer_email: cleanEmail,
        p_marketing_consent: Boolean(marketing_consent),
        p_shipping_notes: String(shipping_notes ?? "").trim() || null,
    });
    if (error) {
        console.error("Error creating order:", error);
        throw new Error(error.message || "Unable to create your order. Please try again.");
    }
    return data;
}

const TRACKING_ERRORS = {
    ORDER_NOT_FOUND:
        "We couldn't find an order with those details. Check the order number and phone number.",
    ORDER_NOT_CANCELLABLE:
        "This order can no longer be cancelled online. Please contact us.",
    REASON_REQUIRED: "Please tell us why you are cancelling.",
};

function trackingMessage(error) {
    const code = Object.keys(TRACKING_ERRORS).find((key) =>
        String(error?.message || "").includes(key)
    );

    return code
        ? TRACKING_ERRORS[code]
        : "Something went wrong. Please try again.";
}

/**
 * Look up one order by order number + the phone used at checkout.
 * Returns null when nothing matches.
 */
export async function trackOrder(orderNumber, phone) {
    const { data, error } = await supabase.rpc("track_order", {
        p_order_number: orderNumber,
        p_phone: phone,
    });

    if (error) {
        console.error("Error tracking order:", error);
        throw new Error(trackingMessage(error));
    }

    return data ?? null;
}

/**
 * Cancel an order on behalf of the customer. Returns the updated order.
 */
export async function cancelOrderByCustomer(orderNumber, phone, reason) {
    const { data, error } = await supabase.rpc("cancel_order", {
        p_order_number: orderNumber,
        p_phone: phone,
        p_reason: reason,
    });

    if (error) {
        console.error("Error cancelling order:", error);
        throw new Error(trackingMessage(error));
    }

    return data;
}
