import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import {
    getBestSellingProducts,
    getOrders,
} from "../../services/orderService";
import StatusBadge from "../../components/admin/StatusBadge";
import formatPrice, { formatDate } from "../../utils/formatPrice";

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

export default function Dashboard() {
    const [orders, setOrders] = useState([]);
    const [bestSellers, setBestSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const [ordersData, bestSellersData] = await Promise.all([
                    getOrders(),
                    getBestSellingProducts(5),
                ]);

                if (!active) return;

                setOrders(ordersData);
                setBestSellers(bestSellersData);
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
                    <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Stat label="إجمالي الطلبات" value={stats.total} />
                        <Stat
                            label="طلبات قيد الانتظار"
                            value={stats.pending}
                            hint={stats.pending ? "محتاجة مراجعة" : "مفيش طلبات معلقة"}
                        />
                        <Stat
                            label="الإيرادات"
                            value={formatPrice(stats.revenue)}
                            hint="من غير الطلبات الملغية"
                        />
                        <Stat
                            label="متوسط قيمة الطلب"
                            value={formatPrice(stats.average)}
                        />
                    </div>

                    <div className="mt-8 grid gap-6 lg:grid-cols-3">
                        <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] lg:col-span-2">
                            <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-4 py-3">
                                <h2 className="font-bold text-[var(--color-text-strong)]">
                                    آخر الطلبات
                                </h2>
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
                                <ul className="divide-y bg">
                                    {recentOrders.map((order) => (
                                        <li
                                            key={order.id}
                                            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
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
                                            </div>
                                        </li>
                                    ))}
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
                                <ol className="divide-y bg">
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
