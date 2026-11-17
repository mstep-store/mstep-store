import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Check, PackageSearch, XCircle } from "lucide-react";
import { cancelOrderByCustomer, trackOrder } from "../../services/orderService";
import { getRecentOrders } from "../../utils/recentOrders";

const STEPS = [
    { value: "pending", label: "Order placed" },
    { value: "processing", label: "Preparing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
];

// How often an open order page re-checks its status.
const POLL_MS = 60000;
const TERMINAL_STATUSES = ["delivered", "cancelled"];

function describeChange(next) {
    if (next.status === "cancelled") {
        return "Your order has been cancelled.";
    }

    const step = STEPS.find((item) => item.value === next.status);

    return step
        ? `Update: your order is now "${step.label}".`
        : "Your order was updated.";
}

const CANCEL_REASONS = [
    "I changed my mind",
    "I ordered by mistake",
    "I need a different size or color",
    "I found a better price elsewhere",
    "Delivery is taking too long",
    "Other",
];

const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100";

function formatDate(value) {
    if (!value) return "";

    return new Date(value).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function money(value) {
    return `${Number(value || 0).toFixed(2)} EGP`;
}

function Timeline({ status }) {
    const currentIndex = STEPS.findIndex((step) => step.value === status);

    return (
        <ol className="flex items-start">
            {STEPS.map((step, index) => {
                const done = index <= currentIndex;
                const isLast = index === STEPS.length - 1;

                return (
                    <li
                        key={step.value}
                        className={`flex ${isLast ? "" : "flex-1"} items-start`}
                    >
                        <div className="flex w-16 flex-col items-center text-center sm:w-20">
                            <span
                                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${done
                                        ? "border-blue-600 bg-blue-600 text-white"
                                        : "border-slate-200 bg-white text-slate-300"
                                    }`}
                            >
                                {done ? <Check size={18} /> : index + 1}
                            </span>
                            <span
                                className={`mt-2 text-xs font-semibold ${done ? "text-slate-900" : "text-slate-400"
                                    }`}
                            >
                                {step.label}
                            </span>
                        </div>

                        {!isLast && (
                            <span
                                aria-hidden="true"
                                className={`mt-4.25 h-0.5 flex-1 ${index < currentIndex
                                        ? "bg-blue-600"
                                        : "bg-slate-200"
                                    }`}
                            />
                        )}
                    </li>
                );
            })}
        </ol>
    );
}

export default function TrackOrder() {
    const [searchParams] = useSearchParams();

    const [orderNumber, setOrderNumber] = useState(
        searchParams.get("order") || ""
    );
    const [phone, setPhone] = useState("");
    const [recentOrders] = useState(getRecentOrders);

    // Latest order + a counter that changes whenever the user's own action
    // (search / cancel) replaces it, so a slow background refresh can never
    // overwrite a newer result with stale data.
    const orderRef = useRef(null);
    const versionRef = useRef(0);
    const [lastChecked, setLastChecked] = useState(null);
    const [changeNotice, setChangeNotice] = useState("");

    // The values that were actually verified, used for cancelling.
    const [verified, setVerified] = useState(null);
    const [order, setOrder] = useState(null);

    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState("");

    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState("");

    function applyOrder(next) {
        versionRef.current += 1;
        orderRef.current = next;
        setOrder(next);
        setLastChecked(next ? new Date() : null);
        setChangeNotice("");
    }

    const hasOrder = Boolean(order);
    const orderStatus = order?.status;

    // Keep an open order up to date without a manual refresh.
    useEffect(() => {
        if (!verified || !hasOrder || TERMINAL_STATUSES.includes(orderStatus)) {
            return undefined;
        }

        let active = true;
        let inFlight = false;

        async function refresh() {
            if (inFlight || document.hidden) return;

            inFlight = true;
            const version = versionRef.current;

            try {
                const latest = await trackOrder(
                    verified.orderNumber,
                    verified.phone
                );

                if (!active || !latest || version !== versionRef.current) {
                    return;
                }

                const previous = orderRef.current;
                const changed =
                    !previous ||
                    latest.status !== previous.status ||
                    latest.updated_at !== previous.updated_at;

                setLastChecked(new Date());

                if (changed) {
                    if (previous && latest.status !== previous.status) {
                        setChangeNotice(describeChange(latest));
                    }

                    if (!latest.can_cancel) {
                        setCancelOpen(false);
                    }

                    orderRef.current = latest;
                    setOrder(latest);
                }
            } catch {
                // Keep showing the last known status; try again next time.
            } finally {
                inFlight = false;
            }
        }

        function handleVisibility() {
            if (!document.hidden) refresh();
        }

        const timer = setInterval(refresh, POLL_MS);
        document.addEventListener("visibilitychange", handleVisibility);
        window.addEventListener("online", refresh);

        return () => {
            active = false;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", handleVisibility);
            window.removeEventListener("online", refresh);
        };
    }, [verified, hasOrder, orderStatus]);

    async function handleSearch(event) {
        event.preventDefault();
        setSearchError("");

        if (!orderNumber.trim() || !phone.trim()) {
            setSearchError("Please enter your order number and phone number.");
            return;
        }

        setSearching(true);
        applyOrder(null);
        setCancelOpen(false);

        try {
            const found = await trackOrder(orderNumber, phone);

            if (!found) {
                setSearchError(
                    "We couldn't find an order with those details. Check the order number and the phone number used at checkout."
                );
                return;
            }

            applyOrder(found);
            setVerified({ orderNumber, phone });
        } catch (err) {
            setSearchError(err.message);
        } finally {
            setSearching(false);
        }
    }

    function openCancel() {
        setReason("");
        setDetails("");
        setCancelError("");
        setCancelOpen(true);
    }

    async function handleCancel(event) {
        event.preventDefault();
        setCancelError("");

        if (!reason) {
            setCancelError("Please choose a reason for cancelling.");
            return;
        }

        if (reason === "Other" && details.trim().length < 3) {
            setCancelError("Please tell us a little more about your reason.");
            return;
        }

        const fullReason =
            reason === "Other"
                ? details.trim()
                : details.trim()
                    ? `${reason} — ${details.trim()}`
                    : reason;

        setCancelling(true);

        try {
            const updated = await cancelOrderByCustomer(
                verified.orderNumber,
                verified.phone,
                fullReason
            );

            applyOrder(updated);
            setCancelOpen(false);
        } catch (err) {
            setCancelError(err.message);
        } finally {
            setCancelling(false);
        }
    }

    const cancelled = order?.status === "cancelled";
    const isLive = hasOrder && !TERMINAL_STATUSES.includes(orderStatus);

    return (
        <div className="bg-white pb-12">
            <section className="bg-slate-50">
                <div className="mx-auto max-w-7xl px-4 py-12 text-center sm:px-6 lg:py-16">
                    <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                        Track your order
                    </h1>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-500 sm:text-base">
                        Enter your order number and the phone number you used at
                        checkout.
                    </p>
                </div>
            </section>

            <div className="mx-auto mt-10 max-w-2xl px-4 sm:px-6">
                <form
                    onSubmit={handleSearch}
                    noValidate
                    className="space-y-4 rounded-2xl border border-slate-100 p-5 shadow-sm sm:p-8"
                >
                    <div>
                        <label
                            htmlFor="order-number"
                            className="mb-1.5 block text-sm font-bold text-slate-700"
                        >
                            Order number
                        </label>
                        <input
                            id="order-number"
                            value={orderNumber}
                            onChange={(e) => setOrderNumber(e.target.value)}
                            placeholder="KC-1234567890123-1234"
                            autoComplete="off"
                            className={inputClass}
                        />

                        {recentOrders.length > 0 && (
                            <div className="mt-3">
                                <p className="text-xs text-slate-500">
                                    Recent orders on this device:
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {recentOrders.map((recent) => (
                                        <button
                                            key={recent.orderNumber}
                                            type="button"
                                            onClick={() =>
                                                setOrderNumber(recent.orderNumber)
                                            }
                                            className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${orderNumber === recent.orderNumber
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 text-slate-600 hover:border-blue-300"
                                                }`}
                                        >
                                            {recent.orderNumber}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <p className="mt-3 text-xs leading-5 text-slate-500">
                            Forgot your order number?{" "}
                            <Link
                                to="/contact"
                                className="font-bold text-blue-600! underline!"
                            >
                                Contact us
                            </Link>{" "}
                            with the phone number and date of your order and
                            we'll find it for you.
                        </p>
                    </div>

                    <div>
                        <label
                            htmlFor="order-phone"
                            className="mb-1.5 block text-sm font-bold text-slate-700"
                        >
                            Phone number
                        </label>
                        <input
                            id="order-phone"
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            autoComplete="tel"
                            className={inputClass}
                        />
                    </div>

                    {searchError && (
                        <p
                            role="alert"
                            className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
                        >
                            {searchError}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={searching}
                        className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <PackageSearch size={18} />
                        {searching ? "Searching..." : "Track order"}
                    </button>
                </form>

                {order && (
                    <section
                        aria-live="polite"
                        className="mt-8 rounded-2xl border border-slate-100 p-5 shadow-sm sm:p-8"
                    >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                                <p className="text-xs text-slate-400">
                                    Order number
                                </p>
                                <p className="text-lg font-extrabold text-slate-900">
                                    {order.order_number}
                                </p>
                            </div>
                            <p className="text-sm text-slate-500">
                                Placed {formatDate(order.created_at)}
                            </p>
                        </div>

                        {isLive && (
                            <p className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                                <span className="relative flex h-2 w-2">
                                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                                </span>
                                Live — this page updates automatically
                                {lastChecked &&
                                    ` · checked ${lastChecked.toLocaleTimeString(
                                        "en-GB",
                                        { hour: "2-digit", minute: "2-digit" }
                                    )}`}
                            </p>
                        )}

                        {changeNotice && (
                            <p
                                role="status"
                                className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-700"
                            >
                                {changeNotice}
                            </p>
                        )}

                        <div className="mt-8">
                            {cancelled ? (
                                <div className="rounded-2xl bg-red-50 p-5">
                                    <p className="flex items-center gap-2 font-extrabold text-red-700">
                                        <XCircle size={20} />
                                        This order was cancelled
                                    </p>
                                    {order.cancelled_at && (
                                        <p className="mt-1 text-xs text-red-600/80">
                                            {formatDate(order.cancelled_at)}
                                            {order.cancelled_by === "customer"
                                                ? " · cancelled by you"
                                                : order.cancelled_by === "admin"
                                                    ? " · cancelled by the store"
                                                    : ""}
                                        </p>
                                    )}
                                    {order.cancel_reason && (
                                        <p className="mt-3 text-sm leading-6 text-red-700">
                                            <span className="font-bold">
                                                Reason:
                                            </span>{" "}
                                            {order.cancel_reason}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <Timeline status={order.status} />
                            )}
                        </div>

                        <ul className="mt-8 divide-y divide-slate-100 border-y border-slate-100">
                            {order.items.map((item, index) => (
                                <li
                                    key={index}
                                    className="flex items-start justify-between gap-4 py-3 text-sm"
                                >
                                    <div>
                                        <p className="font-bold text-slate-800">
                                            {item.product_name}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-500">
                                            {[item.color_name, item.size_name]
                                                .filter(Boolean)
                                                .join(" · ")}
                                            {(item.color_name || item.size_name) &&
                                                " · "}
                                            Qty {item.quantity}
                                        </p>
                                    </div>
                                    <p className="shrink-0 font-bold text-slate-800">
                                        {money(item.line_total)}
                                    </p>
                                </li>
                            ))}
                        </ul>

                        <dl className="mt-4 space-y-1.5 text-sm">
                            <div className="flex justify-between text-slate-500">
                                <dt>Subtotal</dt>
                                <dd>{money(order.subtotal)}</dd>
                            </div>
                            <div className="flex justify-between text-slate-500">
                                <dt>Shipping</dt>
                                <dd>{money(order.shipping_cost)}</dd>
                            </div>
                            <div className="flex justify-between text-base font-extrabold text-slate-900">
                                <dt>Total</dt>
                                <dd>{money(order.total)}</dd>
                            </div>
                        </dl>

                        {order.can_cancel && !cancelOpen && (
                            <button
                                type="button"
                                onClick={openCancel}
                                className="mt-8 rounded-full border border-red-200 px-6 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                            >
                                Cancel this order
                            </button>
                        )}

                        {!order.can_cancel && !cancelled && (
                            <p className="mt-8 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500!">
                                This order can no longer be cancelled online.
                                Please{" "}
                                <Link
                                    to="/contact"
                                    className="font-bold text-blue-600! underline!"
                                >
                                    contact us
                                </Link>{" "}
                                if you need help.
                            </p>
                        )}

                        {cancelOpen && (
                            <form
                                onSubmit={handleCancel}
                                noValidate
                                className="mt-8 space-y-4 rounded-2xl border border-red-100 bg-red-50/40 p-5"
                            >
                                <fieldset>
                                    <legend className="text-sm font-extrabold text-slate-900">
                                        Why are you cancelling?
                                    </legend>

                                    <div className="mt-3 space-y-2">
                                        {CANCEL_REASONS.map((option) => (
                                            <label
                                                key={option}
                                                className="flex cursor-pointer items-center gap-3 text-sm text-slate-700"
                                            >
                                                <input
                                                    type="radio"
                                                    name="cancel-reason"
                                                    value={option}
                                                    checked={reason === option}
                                                    onChange={() =>
                                                        setReason(option)
                                                    }
                                                    className="h-4 w-4 accent-red-600"
                                                />
                                                {option}
                                            </label>
                                        ))}
                                    </div>
                                </fieldset>

                                <div>
                                    <label
                                        htmlFor="cancel-details"
                                        className="mb-1.5 block text-sm font-bold text-slate-700"
                                    >
                                        {reason === "Other"
                                            ? "Tell us more"
                                            : "Anything else? (optional)"}
                                    </label>
                                    <textarea
                                        id="cancel-details"
                                        rows={3}
                                        maxLength={400}
                                        value={details}
                                        onChange={(e) =>
                                            setDetails(e.target.value)
                                        }
                                        className={`${inputClass} resize-y`}
                                    />
                                </div>

                                {cancelError && (
                                    <p
                                        role="alert"
                                        className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600"
                                    >
                                        {cancelError}
                                    </p>
                                )}

                                <div className="flex flex-wrap gap-3">
                                    <button
                                        type="submit"
                                        disabled={cancelling}
                                        className="rounded-full bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {cancelling
                                            ? "Cancelling..."
                                            : "Confirm cancellation"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setCancelOpen(false)}
                                        disabled={cancelling}
                                        className="rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-slate-300"
                                    >
                                        Keep my order
                                    </button>
                                </div>
                            </form>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
}
