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

const SHIPPING_COST = 0;

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
        customer_phone: "",
        shipping_address: "",
        shipping_city: "",
        shipping_notes: "",
    });

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

    const total = subtotal + SHIPPING_COST;

    function handleChange(event) {
        const { name, value } = event.target;

        setForm((current) => ({
            ...current,
            [name]: value,
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
                cart,
                shipping_cost: SHIPPING_COST,
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
                <div className="rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center">
                    <ShoppingBag
                        size={42}
                        className="mx-auto text-slate-400"
                    />

                    <h1 className="mt-5 text-2xl font-extrabold text-slate-900">
                        Your Cart Is Empty
                    </h1>

                    <p className="mt-3 text-slate-500">
                        Add your favorite items before proceeding to checkout.
                    </p>

                    <Link
                        to="/products"
                        className="mt-6 inline-flex rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700"
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
                className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
            >
                <ArrowLeft size={17} />
                Back to Cart
            </Link>

            <header className="mb-8">
                <p className="text-sm font-bold uppercase tracking-widest text-pink-500">
                    Kids & Co
                </p>

                <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                    Checkout
                </h1>

                <p className="mt-3 text-slate-500">
                    Enter your details to complete your order.
                </p>
            </header>

            <form
                onSubmit={handleSubmit}
                className="grid items-start gap-8 lg:grid-cols-[1fr_380px]"
            >
                <div className="space-y-6">
                    {/* Customer Information */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                <ShoppingBag size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Customer Information
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Your contact details
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-5 sm:grid-cols-2">
                            <div className="sm:col-span-2">
                                <label
                                    htmlFor="customer_name"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
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
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="customer_phone"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Phone Number *
                                </label>

                                <input
                                    id="customer_phone"
                                    name="customer_phone"
                                    type="tel"
                                    autoComplete="tel"
                                    required
                                    maxLength={25}
                                    value={form.customer_phone}
                                    onChange={handleChange}
                                    placeholder="Your phone number"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="customer_email"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Email Address
                                    <span className="font-normal text-slate-400">
                                        {" "}(Optional)
                                    </span>
                                </label>

                                <input
                                    id="customer_email"
                                    name="customer_email"
                                    type="email"
                                    autoComplete="email"
                                    maxLength={254}
                                    value={form.customer_email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Shipping Information */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                        <div className="mb-6 flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pink-50 text-pink-600">
                                <MapPin size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Shipping Address
                                </h2>
                                <p className="text-sm text-slate-500">
                                    Where should we deliver your order?
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div>
                                <label
                                    htmlFor="shipping_city"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    City *
                                </label>

                                <input
                                    id="shipping_city"
                                    name="shipping_city"
                                    type="text"
                                    autoComplete="address-level2"
                                    required
                                    maxLength={100}
                                    value={form.shipping_city}
                                    onChange={handleChange}
                                    placeholder="Enter your city"
                                    className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="shipping_address"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
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
                                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="shipping_notes"
                                    className="mb-2 block text-sm font-semibold text-slate-700"
                                >
                                    Delivery Notes
                                    <span className="font-normal text-slate-400">
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
                                    className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Payment Method */}
                    <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
                        <div className="flex items-start gap-4">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-600">
                                <Truck size={21} />
                            </div>

                            <div>
                                <h2 className="text-lg font-bold text-slate-900">
                                    Payment Method
                                </h2>

                                <p className="mt-1 text-sm text-slate-500">
                                    Cash on Delivery
                                </p>

                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                    Pay for your order when it arrives at your
                                    delivery address.
                                </p>
                            </div>
                        </div>
                    </section>

                    {error && (
                        <div
                            role="alert"
                            className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                        >
                            {error}
                        </div>
                    )}
                </div>

                {/* Order Summary */}
                <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 lg:sticky lg:top-6">
                    <h2 className="text-xl font-extrabold text-slate-900">
                        Order Summary
                    </h2>

                    <p className="mt-2 text-sm text-slate-500">
                        {totalQuantity}{" "}
                        {totalQuantity === 1 ? "item" : "items"} in your order
                    </p>

                    <div className="my-6 space-y-5">
                        {cart.map((item) => (
                            <div
                                key={item.variant_id}
                                className="flex gap-3"
                            >
                                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
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
                                                className="text-slate-400"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <h3 className="line-clamp-2 text-sm font-bold text-slate-800">
                                        {item.name}
                                    </h3>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Color: {item.color_name || "N/A"}
                                    </p>

                                    <p className="text-xs text-slate-500">
                                        Size: {item.size_name || "N/A"}
                                    </p>

                                    <p className="mt-1 text-xs text-slate-500">
                                        Qty: {item.quantity}
                                    </p>
                                </div>

                                <p className="shrink-0 text-sm font-bold text-slate-900">
                                    {formatPrice(
                                        Number(item.price || 0) *
                                        Number(item.quantity || 0)
                                    )}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="space-y-4 border-t border-slate-200 pt-5">
                        <div className="flex justify-between gap-3 text-sm text-slate-600">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>

                        <div className="flex justify-between gap-3 text-sm text-slate-600">
                            <span>Shipping</span>
                            <span>
                                {SHIPPING_COST === 0
                                    ? "Free"
                                    : formatPrice(SHIPPING_COST)}
                            </span>
                        </div>

                        <div className="flex justify-between gap-3 border-t border-slate-200 pt-4 text-lg font-extrabold text-slate-900">
                            <span>Total</span>
                            <span>{formatPrice(total)}</span>
                        </div>
                    </div>

                    {priceChanges.length > 0 && (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
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
                                className="mt-3 rounded-lg bg-amber-600 px-4 py-2 font-bold text-white disabled:opacity-60"
                            >
                                {approving ? "Approving..." : "Approve new prices"}
                            </button>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting || cart.length === 0}
                        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-4 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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

                    <p className="mt-4 text-center text-xs leading-5 text-slate-500">
                        By placing your order, you confirm that your contact
                        and delivery details are correct.
                    </p>
                </aside>
            </form>
        </main>
    );
}
