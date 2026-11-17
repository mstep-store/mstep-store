
import { useEffect, useState } from "react";
import { Link } from "react-router";

function getSavedCart() {
    try {
        const saved = JSON.parse(localStorage.getItem("cart") || "[]");
        return Array.isArray(saved) ? saved : [];
    } catch {
        return [];
    }
}

function Cart() {
    const [cart, setCart] = useState(getSavedCart);

    useEffect(() => {
        localStorage.setItem("cart", JSON.stringify(cart));
        window.dispatchEvent(new Event("cart-updated"));
    }, [cart]);

    function updateQuantity(variantId, amount) {
        setCart((currentCart) =>
            currentCart.map((item) => {
                if (String(item.variant_id) !== String(variantId)) {
                    return item;
                }

                return {
                    ...item,
                    quantity: Math.max(
                        1,
                        Number(item.quantity || 1) + amount
                    ),
                };
            })
        );
    }

    function removeItem(variantId) {
        setCart((currentCart) =>
            currentCart.filter(
                (item) => String(item.variant_id) !== String(variantId)
            )
        );
    }

    function clearCart() {
        setCart([]);
    }

    const totalQuantity = cart.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0
    );

    const subtotal = cart.reduce(
        (total, item) =>
            total +
            Number(item.price || 0) * Number(item.quantity || 0),
        0
    );

    const formatPrice = (price) =>
        `${Number(price || 0).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })} EGP`;

    return (
        <main
            className="mx-auto max-w-6xl px-4 py-10"
            dir="ltr"
        >
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">
                        Shopping Cart
                    </h1>
                    <p className="mt-2 text-gray-500">
                        {totalQuantity} {totalQuantity === 1 ? "item" : "items"} in your cart
                    </p>
                </div>

                {cart.length > 0 && (
                    <button
                        type="button"
                        onClick={clearCart}
                        className="text-sm text-red-600 underline transition hover:text-red-700"
                    >
                        Clear Cart
                    </button>
                )}
            </div>

            {cart.length === 0 ? (
                <section className="rounded-2xl border border-gray-200 px-6 py-16 text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50 text-3xl">
                        🛍️
                    </div>

                    <h2 className="mt-5 text-xl font-semibold text-slate-900">
                        Your Cart Is Empty
                    </h2>

                    <p className="mt-3 text-gray-500">
                        Explore our collection and find something you love.
                    </p>

                    <Link
                        to="/products"
                        className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-white! transition hover:bg-blue-700"
                    >
                        Browse Products
                    </Link>
                </section>
            ) : (
                <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
                    <section className="space-y-4">
                        {cart.map((item) => (
                            <article
                                key={item.variant_id}
                                className="flex flex-col gap-4 rounded-2xl border border-gray-200 p-4 sm:flex-row"
                            >
                                <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-gray-100 sm:w-32">
                                    {item.image_url ? (
                                        <img
                                            src={item.image_url}
                                            alt={item.name || "Product"}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                            No Image Available
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-1 flex-col justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-slate-900">
                                            {item.name}
                                        </h2>

                                        <p className="mt-2 text-sm text-gray-500">
                                            Color: {item.color_name || "Not specified"}
                                            {" · "}
                                            Size: {item.size_name || "Not specified"}
                                        </p>

                                        <p className="mt-2 font-medium text-slate-800">
                                            {formatPrice(item.price)}
                                            {Number(item.original_price) >
                                                Number(item.price) && (
                                                <span className="ml-2 text-sm font-normal text-gray-400 line-through">
                                                    {formatPrice(
                                                        item.original_price
                                                    )}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateQuantity(item.variant_id, -1)
                                                }
                                                disabled={Number(item.quantity) <= 1}
                                                aria-label="Decrease quantity"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition hover:bg-gray-50 disabled:opacity-40"
                                            >
                                                −
                                            </button>

                                            <span className="min-w-6 text-center">
                                                {item.quantity}
                                            </span>

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    updateQuantity(item.variant_id, 1)
                                                }
                                                aria-label="Increase quantity"
                                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 transition hover:bg-gray-50"
                                            >
                                                +
                                            </button>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => removeItem(item.variant_id)}
                                            className="text-sm text-red-600 underline transition hover:text-red-700"
                                        >
                                            Remove Item
                                        </button>
                                    </div>
                                </div>

                                <div className="font-bold text-slate-900 sm:min-w-28 sm:text-right">
                                    {formatPrice(
                                        Number(item.price || 0) *
                                        Number(item.quantity || 0)
                                    )}
                                </div>
                            </article>
                        ))}
                    </section>

                    <aside className="h-fit rounded-2xl border border-gray-200 p-6">
                        <h2 className="text-xl font-bold text-slate-900">
                            Order Summary
                        </h2>

                        <div className="mt-6 flex justify-between gap-3 text-gray-600">
                            <span>Total Items</span>
                            <span>{totalQuantity}</span>
                        </div>

                        <div className="mt-4 flex justify-between gap-3 text-gray-600">
                            <span>Subtotal</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>

                        <p className="mt-3 text-sm text-gray-500">
                            Shipping costs will be calculated at checkout.
                        </p>

                        <div className="my-6 border-t border-gray-200" />

                        <div className="flex justify-between gap-3 text-lg font-bold text-slate-900">
                            <span>Total</span>
                            <span>{formatPrice(subtotal)}</span>
                        </div>

                        <Link
                            to="/checkout"
                            className="mt-6 block rounded-lg bg-blue-600 px-5 py-3 text-center font-semibold text-white! transition hover:bg-blue-700"
                        >
                            Proceed to Checkout
                        </Link>

                        <Link
                            to="/products"
                            className="mt-4 block text-center text-sm text-slate-600 underline transition hover:text-blue-600"
                        >
                            Continue Shopping
                        </Link>
                    </aside>
                </div>
            )}
        </main>
    );
}

export default Cart;
