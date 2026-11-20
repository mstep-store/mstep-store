import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
    getBestSellingProducts,
    getOrders,
} from "../../services/orderService";
import { getLowStockVariants } from "../../services/adminProductService";
import StatusBadge from "../../components/admin/StatusBadge";
import OrderDetails from "../../components/admin/OrderDetails";
import formatPrice, { formatDate } from "../../utils/formatPrice";
import { LOW_STOCK_THRESHOLD } from "../../utils/stock";

const PERIODS = [
    { value: "day", label: "اليوم" },
    { value: "week", label: "آخر 7 أيام" },
    { value: "month", label: "آخر 30 يوم" },
    { value: "year", label: "السنة" },
];

const LOW_STOCK_PREVIEW = 8;

// Start of the chosen period, in the browser's local time.
// Week = the last 7 days and month = the last 30 days, both including today;
// year = the current calendar year.
function getPeriodStart(period, now) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === "week") {
        start.setDate(start.getDate() - 6);
    } else if (period === "month") {
        start.setDate(start.getDate() - 29);
    } else if (period === "year") {
        start.setMonth(0, 1);
    }

    return start;
}

function formatShortDate(date) {
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function Stat({ label, value, hint }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--color-navy)]">
                <span dir="ltr" className="inline-block">
                    {value}
                </span>
            </p>
            {hint && <p className="mt-1 text-xs text-[var(--color-subtle)]">{hint}</p>}
        </div>
    );
}

function LowStock({ variants, failed }) {
    const [showAll, setShowAll] = useState(false);

    if (failed) {
        return (
            <p className="mt-6 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]">
                تعذر تحميل تنبيهات المخزون.
            </p>
        );
    }

    if (variants.length === 0) {
        return (
            <p className="mt-6 rounded-lg bg-[var(--color-success-bg)] px-3 py-2 text-sm text-[var(--color-success)]">
                المخزون تمام: مفيش لون أو مقاس كميته {LOW_STOCK_THRESHOLD} أو أقل.
            </p>
        );
    }

    const outCount = variants.filter((variant) => variant.stock === 0).length;
    const visible = showAll ? variants : variants.slice(0, LOW_STOCK_PREVIEW);

    return (
        <section
            aria-label="تنبيه المخزون"
            className="mt-6 rounded-xl border border-[var(--color-warning-border,#fcd34d)] bg-[var(--color-warning-bg)]"
        >
            <div className="border-b border-[var(--color-warning-border,#fcd34d)] px-4 py-3">
                <h2 className="font-bold text-[var(--color-warning-text)]">
                    ⚠ مخزون قرب يخلص ({variants.length})
                </h2>
                <p className="mt-0.5 text-xs text-[var(--color-warning-text)]">
                    بنبّهك لما كمية لون أو مقاس تبقى {LOW_STOCK_THRESHOLD} أو أقل
                    {outCount > 0 && ` · ${outCount} منهم خلصوا خالص`}.
                </p>
            </div>

            <ul className="divide-y divide-[var(--color-warning-border,#fcd34d)]">
                {visible.map((variant) => (
                    <li
                        key={variant.id}
                        className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5"
                    >
                        <div className="flex min-w-0 items-center gap-2">
                            {variant.colorHex && (
                                <span
                                    aria-hidden="true"
                                    className="h-4 w-4 shrink-0 rounded-full border border-[var(--color-border-strong)]"
                                    style={{ backgroundColor: variant.colorHex }}
                                />
                            )}
                            <Link
                                to={`/admin/products/${variant.productId}/variants`}
                                className="min-w-0 truncate text-sm font-semibold text-[var(--color-text-strong)] hover:underline"
                            >
                                {variant.productName}
                            </Link>
                            <span className="shrink-0 text-sm text-[var(--color-text-muted)]">
                                {[variant.colorName, variant.sizeName]
                                    .filter(Boolean)
                                    .join(" / ")}
                            </span>
                        </div>

                        <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${
                                variant.stock === 0
                                    ? "bg-[var(--color-rose-100)] text-[var(--color-rose-800)]"
                                    : "bg-[var(--color-surface)] text-[var(--color-warning-text)]"
                            }`}
                        >
                            {variant.stock === 0
                                ? "خلص"
                                : `فاضل ${variant.stock}`}
                        </span>
                    </li>
                ))}
            </ul>

            {variants.length > LOW_STOCK_PREVIEW && (
                <button
                    type="button"
                    onClick={() => setShowAll((current) => !current)}
                    className="w-full border-t border-[var(--color-warning-border,#fcd34d)] px-4 py-2.5 text-sm font-semibold text-[var(--color-warning-text)] hover:underline"
                >
                    {showAll
                        ? "عرض أقل"
                        : `عرض الكل (${variants.length})`}
                </button>
            )}
        </section>
    );
}

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [lowStockFailed, setLowStockFailed] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [period, setPeriod] = useState("day");
    const [expandedId, setExpandedId] = useState(null);
    const [now] = useState(() => new Date());

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const [ordersData, bestSellersData, lowStockData] =
                    await Promise.all([
                        getOrders(),
                        getBestSellingProducts(5),
                        // A stock-alert problem must not hide the whole page.
                        getLowStockVariants().catch(() => null),
                    ]);

                if (!active) return;

                setOrders(ordersData);
                setBestSellers(bestSellersData);
                setLowStock(lowStockData ?? []);
                setLowStockFailed(lowStockData === null);
            } catch (err) {
                if (active) {
                    setError(err.message || "تعذر تحميل البيانات.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    const stats = useMemo(() => {
        const valid = orders.filter((order) => order.status !== "cancelled");
        const revenue = valid.reduce(
            (sum, order) => sum + (Number(order.total) || 0),
            0
        );

        return {
            total: orders.length,
            pending: orders.filter((order) => order.status === "pending").length,
            revenue,
            average: valid.length ? revenue / valid.length : 0,
        };
    }, [orders]);

    // Sales for the chosen period. Cancelled orders are not counted.
    const sales = useMemo(() => {
        const start = getPeriodStart(period, now);

        const inPeriod = orders.filter(
            (order) => new Date(order.created_at) >= start
        );
        const valid = inPeriod.filter((order) => order.status !== "cancelled");

        const revenue = valid.reduce(
            (sum, order) => sum + (Number(order.total) || 0),
            0
        );
        const units = valid.reduce(
            (sum, order) =>
                sum +
                (order.order_items ?? []).reduce(
                    (itemSum, item) => itemSum + (Number(item.quantity) || 0),
                    0
                ),
            0
        );

        return {
            start,
            revenue,
            orders: valid.length,
            units,
            average: valid.length ? revenue / valid.length : 0,
            cancelled: inPeriod.length - valid.length,
        };
    }, [orders, period, now]);

    const recentOrders = orders.slice(0, 6);

    return (
        <div>
            <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">الرئيسية</h1>
            <p className="mt-1 text-sm text-[var(--color-muted)]">
                ملخص سريع لحالة المتجر.
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
                    <LowStock variants={lowStock} failed={lowStockFailed} />

                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="إجمالي الطلبات" value={stats.total} />
                        <Stat
                            label="طلبات قيد الانتظار"
                            value={stats.pending}
                            hint={stats.pending ? "محتاجة مراجعة" : "مفيش طلبات معلقة"}
                        />
                        <Stat
                            label="إجمالي الإيرادات"
                            value={formatPrice(stats.revenue)}
                            hint="كل الفترات، من غير الطلبات الملغية"
                        />
                        <Stat
                            label="متوسط قيمة الطلب"
                            value={formatPrice(stats.average)}
                        />
                    </div>

                    <section className="mt-8">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="font-bold text-[var(--color-text-strong)]">
                                    المبيعات
                                </h2>
                                <p className="mt-0.5 text-xs text-[var(--color-subtle)]">
                                    من {formatShortDate(sales.start)} لحد دلوقتي
                                </p>
                            </div>

                            <div
                                role="tablist"
                                aria-label="فترة المبيعات"
                                className="flex gap-1.5"
                            >
                                {PERIODS.map((item) => {
                                    const selected = period === item.value;

                                    return (
                                        <button
                                            key={item.value}
                                            type="button"
                                            role="tab"
                                            aria-selected={selected}
                                            onClick={() => setPeriod(item.value)}
                                            className={[
                                                "rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors",
                                                selected
                                                    ? "bg-[var(--color-navy)] text-[var(--color-on-primary)]"
                                                    : "bg-[var(--color-surface)] text-[var(--color-text-muted)] ring-1 ring-[var(--color-border)] hover:bg-[var(--color-slate-100)]",
                                            ].join(" ")}
                                        >
                                            {item.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Stat
                                label="مبيعات الفترة"
                                value={formatPrice(sales.revenue)}
                            />
                            <Stat
                                label="عدد الطلبات"
                                value={sales.orders}
                                hint={
                                    sales.cancelled
                                        ? `${sales.cancelled} طلب ملغي مش محسوب`
                                        : undefined
                                }
                            />
                            <Stat label="القطع المباعة" value={sales.units} />
                            <Stat
                                label="متوسط قيمة الطلب"
                                value={formatPrice(sales.average)}
                            />
                        </div>
                    </section>

                    <div className="mt-8 grid gap-6 lg:grid-cols-3">
                        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:col-span-2">
                            <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
                                <div>
                                    <h2 className="font-bold text-[var(--color-text-strong)]">
                                        آخر الطلبات
                                    </h2>
                                    <p className="text-xs text-[var(--color-subtle)]">
                                        اضغط على أي طلب لعرض تفاصيله وبيانات العميل.
                                    </p>
                                </div>
                                <Link
                                    to="/admin/orders"
                                    className="text-sm font-semibold text-[var(--color-primary)] hover:underline"
                                >
                                    كل الطلبات
                                </Link>
                            </div>

                            {recentOrders.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                                    لسه مفيش طلبات. أول طلب هيظهر هنا.
                                </p>
                            ) : (
                                <ul className="divide-y divide-[var(--color-border-soft)]">
                                    {recentOrders.map((order) => {
                                        const expanded = expandedId === order.id;

                                        return (
                                            <li key={order.id}>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setExpandedId(
                                                            expanded ? null : order.id
                                                        )
                                                    }
                                                    aria-expanded={expanded}
                                                    className="flex w-full flex-wrap items-center justify-between gap-2 px-4 py-3 text-start transition-colors hover:bg-[var(--color-page)]"
                                                >
                                                    <div className="min-w-0">
                                                        <p
                                                            dir="ltr"
                                                            className="text-start text-sm font-bold text-[var(--color-text-strong)]"
                                                        >
                                                            {order.order_number}
                                                        </p>
                                                        <p className="truncate text-sm text-[var(--color-muted)]">
                                                            {order.customer_name} ·{" "}
                                                            {formatDate(order.created_at)}
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            dir="ltr"
                                                            className="text-sm font-semibold text-[var(--color-text)]"
                                                        >
                                                            {formatPrice(order.total)}
                                                        </span>
                                                        <StatusBadge status={order.status} />
                                                        <span
                                                            aria-hidden="true"
                                                            className="text-xs text-[var(--color-subtle)]"
                                                        >
                                                            {expanded ? "▲" : "▼"}
                                                        </span>
                                                    </div>
                                                </button>

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
                        </section>

                        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="border-b border-[var(--color-border-soft)] px-4 py-3">
                                <h2 className="font-bold text-[var(--color-text-strong)]">
                                    الأكثر مبيعًا
                                </h2>
                            </div>

                            {bestSellers.length === 0 ? (
                                <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
                                    هيظهر هنا بعد أول مبيعات.
                                </p>
                            ) : (
                                <ol className="divide-y divide-[var(--color-border-soft)]">
                                    {bestSellers.map((product) => (
                                        <li
                                            key={
                                                product.variant_id ??
                                                product.product_name
                                            }
                                            className="flex items-center justify-between gap-3 px-4 py-3"
                                        >
                                            <span className="min-w-0 truncate text-sm text-[var(--color-text)]">
                                                {product.product_name}
                                            </span>
                                            <span className="shrink-0 text-sm font-semibold text-[var(--color-text-muted)]">
                                                {product.total_quantity} قطعة
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
}
