import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router";
import { CheckCircle2 } from "lucide-react";
import { saveRecentOrder } from "../../utils/recentOrders";

export default function OrderSuccess() {
    const { state } = useLocation();
    const orderNumber = state?.orderNumber;

    // Remember the order number on this device so it can be found again.
    useEffect(() => {
        saveRecentOrder(orderNumber);
    }, [orderNumber]);

    // Opened directly (not from checkout): nothing to confirm.
    if (!state?.orderNumber) {
        return <Navigate to="/" replace />;
    }

    return (
        <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
            <CheckCircle2 size={64} strokeWidth={1.5} className="text-[var(--color-success)]" />

            <h1 className="mt-5 text-2xl font-extrabold text-[var(--color-text-strong)] sm:text-3xl">
                Thank you for your order!
            </h1>

            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                We've received your order and will contact you soon to confirm
                the details.
            </p>

            <div className="mt-6 w-full rounded-2xl bg-[var(--color-page)] px-5 py-4 text-sm">
                <p className="text-[var(--color-muted)]">Order number</p>
                <p className="mt-1 text-lg font-extrabold text-[var(--color-text-strong)]">
                    {state.orderNumber}
                </p>

                {state.total != null && (
                    <p className="mt-3 text-[var(--color-muted)]">
                        Total:{" "}
                        <span className="font-bold text-[var(--color-text-strong)]">
                            {Number(state.total).toFixed(2)} EGP
                        </span>
                    </p>
                )}
            </div>

            <p className="mt-4 text-xs leading-6 text-[var(--color-subtle)]">
                Keep your order number and the phone number you used. You can
                use them to track or cancel your order.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                    to={`/track-order?order=${encodeURIComponent(state.orderNumber)}`}
                    className="rounded-full bg-(--color-primary) px-6 py-3 text-sm font-bold text-(--color-on-primary)! transition hover:bg-(--color-primary-hover)"
                >
                    Track your order
                </Link>
                <Link
                    to="/products"
                    className="rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-blue-300)] hover:text-[var(--color-primary)]"
                >
                    Continue shopping
                </Link>
            </div>
        </section>
    );
}
