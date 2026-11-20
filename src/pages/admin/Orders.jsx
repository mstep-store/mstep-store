import { useEffect, useMemo, useState } from "react";
import { getOrders, updateOrderStatus } from "../../services/orderService";
import StatusBadge from "../../components/admin/StatusBadge";
import OrderDetails from "../../components/admin/OrderDetails";
import formatPrice, { formatDate } from "../../utils/formatPrice";
import { ORDER_STATUSES } from "../../utils/orderStatus";

function matchesQuery(order, query) {
    const q = query.trim().toLowerCase();

    if (!q) return true;

    return [order.order_number, order.customer_name, order.customer_phone]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
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
            <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">الطلبات</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
                راجع الطلبات وغيّر حالتها.
            </p>

            {loading && (
                <p className="mt-8 text-sm text-[var(--color-muted)]">جاري التحميل...</p>
            )}

            {error && (
                <p
                    role="alert"
                    className="mt-6 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
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
                                                ? "bg-[var(--color-navy)] text-[var(--color-on-primary)]"
                                                : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-slate-100)]",
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
                            className="w-full rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm lg:w-80"
                        />
                    </div>

                    {visibleOrders.length === 0 ? (
                        <p className="mt-10 text-center text-sm text-[var(--color-muted)]">
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
                                        className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
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
                                                    className="block text-start text-sm font-bold text-[var(--color-text-strong)]"
                                                >
                                                    {order.order_number}
                                                </span>
                                                <span className="mt-0.5 block truncate text-sm text-[var(--color-muted)]">
                                                    {order.customer_name} ·{" "}
                                                    {formatDate(order.created_at)}
                                                </span>
                                            </button>

                                            <span
                                                dir="ltr"
                                                className="text-sm font-bold text-[var(--color-text-strong)]"
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
                                                    className="rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-2 py-1.5 text-sm disabled:opacity-60"
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
                                                className="mx-4 mb-3 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                                            >
                                                {rowErrors[order.id]}
                                            </p>
                                        )}

                                        {expanded && (
                                            <div className="border-t border-[var(--color-border-soft)] p-4">
                                                <OrderDetails order={order} />
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
