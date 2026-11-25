import StatusBadge from "./StatusBadge";
import formatPrice, { formatDate } from "../../utils/formatPrice";

const PAYMENT_METHODS = {
    cash_on_delivery: "الدفع عند الاستلام",
    online: "دفع أونلاين",
};

const PAYMENT_STATUSES = {
    unpaid: "غير مدفوع",
    paid: "مدفوع",
    failed: "فشل الدفع",
    refunded: "مُسترجع",
};

function Detail({ label, children }) {
    return (
        <div>
            <dt className="text-xs text-[var(--color-subtle)]">{label}</dt>
            <dd className="mt-0.5 text-sm text-[var(--color-text)]">{children}</dd>
        </div>
    );
}

function Card({ title, children }) {
    return (
        <section className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-page)] p-4">
            <h3 className="mb-3 text-sm font-extrabold text-[var(--color-text-strong)]">
                {title}
            </h3>
            <dl className="grid gap-3 sm:grid-cols-2">{children}</dl>
        </section>
    );
}

// Customer details + order details + items. Used by the Orders page and the
// dashboard's recent orders.
export default function OrderDetails({ order }) {
    const items = order.order_items ?? [];

    return (
        <div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Card title="بيانات العميل">
                    <Detail label="الاسم">{order.customer_name}</Detail>
                    <Detail label="الموبايل">
                        <a
                            href={`tel:${order.customer_phone}`}
                            dir="ltr"
                            className="inline-block font-semibold text-[var(--color-primary)] hover:underline"
                        >
                            {order.customer_phone}
                        </a>
                    </Detail>
                    {order.customer_email && (
                        <Detail label="البريد">
                            <span dir="ltr" className="inline-block break-all">
                                {order.customer_email}
                            </span>
                        </Detail>
                    )}
                    {order.shipping_governorate && (
                        <Detail label="المحافظة">{order.shipping_governorate}</Detail>
                    )}
                    <Detail label="المدينة">{order.shipping_city}</Detail>
                    <div className="sm:col-span-2">
                        <Detail label="العنوان">{order.shipping_address}</Detail>
                    </div>
                    {order.shipping_notes && (
                        <div className="sm:col-span-2">
                            <Detail label="ملاحظات العميل">
                                {order.shipping_notes}
                            </Detail>
                        </div>
                    )}
                </Card>

                <Card title="تفاصيل الطلب">
                    <Detail label="رقم الطلب">
                        <span dir="ltr" className="inline-block font-semibold">
                            {order.order_number}
                        </span>
                    </Detail>
                    <Detail label="تاريخ الطلب">{formatDate(order.created_at)}</Detail>
                    <Detail label="الحالة">
                        <StatusBadge status={order.status} />
                    </Detail>
                    <Detail label="الدفع">
                        {PAYMENT_METHODS[order.payment_method] ??
                            order.payment_method}
                        {" · "}
                        {PAYMENT_STATUSES[order.payment_status] ??
                            order.payment_status}
                    </Detail>
                    {order.status === "cancelled" && (
                        <div className="sm:col-span-2">
                            <Detail label="سبب الإلغاء">
                                {order.cancel_reason || "لم يُذكر سبب"}
                                {order.cancelled_by &&
                                    ` (${
                                        order.cancelled_by === "customer"
                                            ? "ألغاه العميل"
                                            : "ألغاه الأدمن"
                                    })`}
                            </Detail>
                        </div>
                    )}
                </Card>
            </div>

            <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-lg text-sm">
                    <thead>
                        <tr className="border-b border-[var(--color-border)] text-xs text-[var(--color-muted)]">
                            <th className="py-2 text-start font-semibold">المنتج</th>
                            <th className="py-2 text-start font-semibold">
                                اللون / المقاس
                            </th>
                            <th className="py-2 text-start font-semibold">الكمية</th>
                            <th className="py-2 text-start font-semibold">السعر</th>
                            <th className="py-2 text-start font-semibold">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item) => (
                            <tr
                                key={item.id}
                                className="border-b border-[var(--color-border-soft)] last:border-0"
                            >
                                <td className="py-2 pe-3">
                                    {item.product_name}
                                    {item.sku && (
                                        <span
                                            dir="ltr"
                                            className="block text-start text-xs text-[var(--color-subtle)]"
                                        >
                                            {item.sku}
                                        </span>
                                    )}
                                </td>
                                <td className="py-2 pe-3">
                                    {[item.color_name, item.size_name]
                                        .filter(Boolean)
                                        .join(" / ") || "—"}
                                </td>
                                <td className="py-2 pe-3">{item.quantity}</td>
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
                        ))}
                    </tbody>
                </table>
            </div>

            <dl dir="ltr" className="mt-4 me-auto w-full max-w-xs space-y-1 text-sm">
                <div className="flex justify-between">
                    <dt className="text-[var(--color-muted)]">Subtotal</dt>
                    <dd>{formatPrice(order.subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                    <dt className="text-[var(--color-muted)]">Shipping</dt>
                    <dd>{formatPrice(order.shipping_cost)}</dd>
                </div>
                <div className="flex justify-between border-t border-[var(--color-border)] pt-1 font-bold">
                    <dt>Total</dt>
                    <dd>{formatPrice(order.total)}</dd>
                </div>
            </dl>
        </div>
    );
}
