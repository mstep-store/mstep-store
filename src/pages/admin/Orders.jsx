import { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrderStatus } from "../../services/orderService";
import StatusBadge from "../../components/admin/StatusBadge";
import formatPrice, { formatDate } from "../../utils/formatPrice";
import { ORDER_STATUSES } from "../../utils/orderStatus";

function matchesQuery(order, query) {
    const q = query.trim().toLowerCase();

    if (!q) return true;

    return [order.order_number, order.customer_name, order.customer_phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
}

function Detail({ label, children }) {
    return (
        <div>
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
        </div>
    );
}

export default function AdminOrders() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [filter, setFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [expandedId, setExpandedId] = useState(null);

    const [savingId, setSavingId] = useState(null);
    const [rowErrors, setRowErrors] = useState({});

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const data = await getOrders();

                if (active) setOrders(data);
            } catch (err) {
                if (active) setError(err.message || "تعذر تحميل الطلبات.");
            } finally {
                if (active) setLoading(false);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    const counts = useMemo(() => {
        const result = { all: orders.length };

        for (const status of ORDER_STATUSES) {
            result[status.value] = orders.filter(
                (order) => order.status === status.value
            ).length;
        }

        return result;
    }, [orders]);

    const visibleOrders = useMemo(
        () =>
            orders.filter(
                (order) =>
                    (filter === "all" || order.status === filter) &&
                    matchesQuery(order, query)
            ),
        [orders, filter, query]
    );

    async function handleStatusChange(order, nextStatus) {
        if (nextStatus === order.status) return;

        let cancelReason = "";

        if (nextStatus === "cancelled") {
            const answer = window.prompt(
                `إلغاء الطلب ${order.order_number}؟\nاكتب سبب الإلغاء (اختياري).\nملحوظة: المخزون مش بيتعاد تلقائيًا.`,
                ""
            );

            if (answer === null) return;

            cancelReason = answer.trim();
        }

        setSavingId(order.id);
        setRowErrors((current) => ({ ...current, [order.id]: "" }));

        try {
            const updated = await updateOrderStatus(order.id, nextStatus, {
                reason: cancelReason,
            });

            setOrders((current) =>
                current.map((item) =>
                    item.id === order.id
                        ? { ...item, ...updated }
                        : item
                )
            );
        } catch (err) {
            setRowErrors((current) => ({
                ...current,
                [order.id]:
                    err.message ||
                    "تعذر تحديث الحالة. اتأكد إن صلاحيات الأدمن متفعلة.",
            }));
        } finally {
            setSavingId(null);
        }
    }

    const tabs = [{ value: "all", label: "الكل" }, ...ORDER_STATUSES];

    return (
        <div>
            <h1 className="text-2xl font-bold text-slate-900">الطلبات</h1>
            <p className="mt-1 text-sm text-slate-500">
                راجع الطلبات وغيّر حالتها.
            </p>

            {loading && (
                <p className="mt-8 text-sm text-slate-500">جاري التحميل...</p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-6 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                >
                    {error}
                </p>
            )}

            {!loading && !error && (
                <>
                    <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div
                            role="tablist"
                            aria-label="تصفية الطلبات حسب الحالة"
                            className="flex gap-1.5 overflow-x-auto pb-1"
                        >
                            {tabs.map((tab) => {
                                const selected = filter === tab.value;

                                return (
                                    <button
                                        key={tab.value}
                                        type="button"
                                        role="tab"
                                        aria-selected={selected}
                                        onClick={() => setFilter(tab.value)}
                                        className={[
                                            "shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold transition-colors",
                                            selected
                                                ? "bg-[#172b45] text-white"
                                                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100",
                                        ].join(" ")}
                                    >
                                        {tab.label}{" "}
                                        <span className="opacity-70">
                                            {counts[tab.value] ?? 0}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>

                        <input
                            type="search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="ابحث برقم الطلب أو الاسم أو الموبايل"
                            aria-label="بحث في الطلبات"
                            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm lg:w-80"
                        />
                    </div>

                    {visibleOrders.length === 0 ? (
                        <p className="mt-10 text-center text-sm text-slate-500">
                            {orders.length === 0
                                ? "لسه مفيش طلبات."
                                : "مفيش طلبات مطابقة للتصفية أو البحث."}
                        </p>
                    ) : (
                        <ul className="mt-4 space-y-3">
                            {visibleOrders.map((order) => {
                                const expanded = expandedId === order.id;
                                const saving = savingId === order.id;

                                return (
                                    <li
                                        key={order.id}
                                        className="rounded-xl border border-slate-200 bg-white"
                                    >
                                        <div className="flex flex-wrap items-center gap-3 p-3 sm:p-4">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setExpandedId(
                                                        expanded ? null : order.id
                                                    )
                                                }
                                                aria-expanded={expanded}
                                                className="min-w-0 flex-1 text-start"
                                            >
                                                <span
                                                    dir="ltr"
                                                    className="block text-start text-sm font-bold text-slate-900"
                                                >
                                                    {order.order_number}
                                                </span>
                                                <span className="mt-0.5 block truncate text-sm text-slate-500">
                                                    {order.customer_name} ·{" "}
                                                    {formatDate(order.created_at)}
                                                </span>
                                            </button>

                                            <span
                                                dir="ltr"
                                                className="text-sm font-bold text-slate-900"
                                            >
                                                {formatPrice(order.total)}
                                            </span>

                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={order.status} />
                                                <select
                                                    aria-label={`تغيير حالة الطلب ${order.order_number}`}
                                                    value={order.status}
                                                    disabled={saving}
                                                    onChange={(e) =>
                                                        handleStatusChange(
                                                            order,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm disabled:opacity-60"
                                                >
                                                    {ORDER_STATUSES.map((status) => (
                                                        <option
                                                            key={status.value}
                                                            value={status.value}
                                                        >
                                                            {status.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {rowErrors[order.id] && (
                                            <p
                                                role="alert"
                                                className="mx-4 mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                            >
                                                {rowErrors[order.id]}
                                            </p>
                                        )}

                                        {expanded && (
                                            <div className="border-t border-slate-100 p-4">
                                                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                                    <Detail label="العميل">
                                                        {order.customer_name}
                                                    </Detail>
                                                    <Detail label="الموبايل">
                                                        <a
                                                            href={`tel:${order.customer_phone}`}
                                                            dir="ltr"
                                                            className="font-semibold text-blue-600 hover:underline"
                                                        >
                                                            {order.customer_phone}
                                                        </a>
                                                    </Detail>
                                                    <Detail label="العنوان">
                                                        {order.shipping_address}،{" "}
                                                        {order.shipping_city}
                                                    </Detail>
                                                    <Detail label="الدفع">
                                                        {order.payment_method ===
                                                        "cash_on_delivery"
                                                            ? "الدفع عند الاستلام"
                                                            : order.payment_method}
                                                    </Detail>
                                                    {order.customer_email && (
                                                        <Detail label="البريد">
                                                            <span dir="ltr">
                                                                {order.customer_email}
                                                            </span>
                                                        </Detail>
                                                    )}
                                                    {order.status === "cancelled" && (
                                                        <Detail label="سبب الإلغاء">
                                                            {order.cancel_reason ||
                                                                "لم يُذكر سبب"}
                                                            {order.cancelled_by &&
                                                                ` (${
                                                                    order.cancelled_by ===
                                                                    "customer"
                                                                        ? "ألغاه العميل"
                                                                        : "ألغاه الأدمن"
                                                                })`}
                                                        </Detail>
                                                    )}
                                                    {order.shipping_notes && (
                                                        <Detail label="ملاحظات العميل">
                                                            {order.shipping_notes}
                                                        </Detail>
                                                    )}
                                                </dl>

                                                <div className="mt-4 overflow-x-auto">
                                                    <table className="w-full min-w-[32rem] text-sm">
                                                        <thead>
                                                            <tr className="border-b border-slate-200 text-start text-xs text-slate-500">
                                                                <th className="py-2 text-start font-semibold">
                                                                    المنتج
                                                                </th>
                                                                <th className="py-2 text-start font-semibold">
                                                                    اللون / المقاس
                                                                </th>
                                                                <th className="py-2 text-start font-semibold">
                                                                    الكمية
                                                                </th>
                                                                <th className="py-2 text-start font-semibold">
                                                                    السعر
                                                                </th>
                                                                <th className="py-2 text-start font-semibold">
                                                                    الإجمالي
                                                                </th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {(order.order_items ?? []).map(
                                                                (item) => (
                                                                    <tr
                                                                        key={item.id}
                                                                        className="border-b border-slate-100 last:border-0"
                                                                    >
                                                                        <td className="py-2 pe-3">
                                                                            {item.product_name}
                                                                            {item.sku && (
                                                                                <span
                                                                                    dir="ltr"
                                                                                    className="block text-start text-xs text-slate-400"
                                                                                >
                                                                                    {item.sku}
                                                                                </span>
                                                                            )}
                                                                        </td>
                                                                        <td className="py-2 pe-3">
                                                                            {[
                                                                                item.color_name,
                                                                                item.size_name,
                                                                            ]
                                                                                .filter(Boolean)
                                                                                .join(" / ") ||
                                                                                "—"}
                                                                        </td>
                                                                        <td className="py-2 pe-3">
                                                                            {item.quantity}
                                                                        </td>
                                                                        <td className="py-2 pe-3">
                                                                            <span dir="ltr" className="inline-block">
                                                                                {formatPrice(item.unit_price)}
                                                                            </span>
                                                                        </td>
                                                                        <td className="py-2 font-semibold">
                                                                            <span dir="ltr" className="inline-block">
                                                                                {formatPrice(item.line_total)}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>

                                                <dl
                                                    dir="ltr"
                                                    className="mt-4 me-auto w-full max-w-xs space-y-1 text-sm"
                                                >
                                                    <div className="flex justify-between">
                                                        <dt className="text-slate-500">Subtotal</dt>
                                                        <dd>{formatPrice(order.subtotal)}</dd>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <dt className="text-slate-500">Shipping</dt>
                                                        <dd>{formatPrice(order.shipping_cost)}</dd>
                                                    </div>
                                                    <div className="flex justify-between border-t border-slate-200 pt-1 font-bold">
                                                        <dt>Total</dt>
                                                        <dd>{formatPrice(order.total)}</dd>
                                                    </div>
                                                </dl>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </>
            )}
        </div>
    );
}
