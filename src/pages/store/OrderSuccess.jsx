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
            <CheckCircle2 size={64} strokeWidth={1.5} className="text-green-500" />

            <h1 className="mt-5 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                Thank you for your order!
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                We've received your order and will contact you soon to confirm
                the details.
            </p>

            <div className="mt-6 w-full rounded-2xl bg-slate-50 px-5 py-4 text-sm">
                <p className="text-slate-500">Order number</p>
                <p className="mt-1 text-lg font-extrabold text-slate-900">
                    {state.orderNumber}
                </p>

                {state.total != null && (
                    <p className="mt-3 text-slate-500">
                        Total:{" "}
                        <span className="font-bold text-slate-900">
                            {Number(state.total).toFixed(2)} EGP
                        </span>
                    </p>
                )}
            </div>

            <p className="mt-4 text-xs leading-6 text-slate-400">
                Keep your order number and the phone number you used. You can
                use them to track or cancel your order.
            </p>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link
                    to={`/track-order?order=${encodeURIComponent(state.orderNumber)}`}
                    className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                    Track your order
                </Link>
                <Link
                    to="/products"
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                    Continue shopping
                </Link>
            </div>
        </section>
    );
}
