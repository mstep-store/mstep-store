import { useEffect, useMemo, useState } from "react";
import { getCustomers } from "../../services/customerService";
import formatPrice, { formatDate } from "../../utils/formatPrice";

function csvCell(value) {
    let text = String(value ?? "");
    // Prevent spreadsheet formula execution when opening exported contact data.
    if (/^[=+\-@]/.test(text)) text = `'${text}`;
    return `"${text.replace(/"/g, '""')}"`;
}

function exportCustomers(customers) {
    const rows = [
        ["الاسم", "الإيميل", "رقم التليفون", "عدد الطلبات", "إجمالي المشتريات", "آخر طلب"],
        ...customers.map((customer) => [
            customer.name,
            customer.email,
            customer.phone,
            customer.orderCount,
            customer.totalSpent.toFixed(2),
            customer.lastOrderAt ? new Date(customer.lastOrderAt).toLocaleDateString("en-GB") : "",
        ]),
    ];

    const csv = "\\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\\r\\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `mstep-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function Stat({ label, value, hint }) {
    return (
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-muted)]">{label}</p>
            <p className="mt-1 text-2xl font-extrabold text-[var(--color-text-strong)]">{value}</p>
            {hint && <p className="mt-1 text-xs text-[var(--color-subtle)]">{hint}</p>}
        </div>
    );
}

export default function AdminCustomers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");

    useEffect(() => {
        let active = true;

        getCustomers()
            .then((data) => {
                if (active) setCustomers(data);
            })
            .catch((err) => {
                if (active) setError(err.message || "تعذر تحميل العملاء.");
            })
            .finally(() => {
                if (active) setLoading(false);
            });

        return () => {
            active = false;
        };
    }, []);

    const visibleCustomers = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return customers;

        return customers.filter((customer) =>
            [customer.name, customer.email, customer.phone]
                .filter(Boolean)
                .some((value) => String(value).toLowerCase().includes(term))
        );
    }, [customers, query]);

    const emailCount = customers.filter((customer) => customer.email).length;
    const repeatCount = customers.filter((customer) => customer.orderCount > 1).length;
    const subscribers = customers.filter((customer) => customer.email && customer.marketingConsent);
    const totalOrders = customers.reduce((sum, customer) => sum + customer.orderCount, 0);

    return (
        <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--color-text-strong)]">العملاء</h1>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                        بيانات العملاء المستخرجة من الطلبات غير الملغية.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => exportCustomers(visibleCustomers.filter((customer) => customer.email && customer.marketingConsent))}
                    disabled={!visibleCustomers.some((customer) => customer.email && customer.marketingConsent)}
                    className="rounded-xl bg-[var(--color-navy)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    تصدير المشتركين بالعروض CSV
                </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="إجمالي العملاء" value={customers.length} />
                <Stat label="عملاء بإيميل" value={emailCount} />
                <Stat label="مشتركين في العروض" value={subscribers.length} hint="وافقوا على الإيميلات التسويقية" />
                <Stat label="عملاء متكررين" value={repeatCount} hint="أكتر من طلب" />
                <Stat label="إجمالي الطلبات" value={totalOrders} />
            </div>

            <div className="mt-6">
                <label htmlFor="customer-search" className="mb-2 block text-sm font-semibold text-[var(--color-text-secondary)]">
                    البحث عن عميل
                </label>
                <input
                    id="customer-search"
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="ابحث بالاسم أو الإيميل أو رقم التليفون..."
                    className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 outline-none transition focus:border-[var(--color-primary-hover)] sm:max-w-xl"
                />
            </div>

            {loading && <p className="mt-8 text-sm text-[var(--color-muted)]">جاري تحميل العملاء...</p>}
            {error && (
                <p role="alert" className="mt-6 rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]">
                    {error}
                </p>
            )}

            {!loading && !error && (
                <div className="mt-5 overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    {visibleCustomers.length === 0 ? (
                        <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                            {customers.length ? "مفيش نتائج مطابقة للبحث." : "بيانات العملاء هتظهر هنا بعد تسجيل الطلبات."}
                        </p>
                    ) : (
                        <>
                            <p className="border-b border-[var(--color-border-soft)] px-4 py-3 text-xs text-[var(--color-muted)]">
                                {visibleCustomers.length} عميل
                            </p>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] text-sm">
                                    <thead className="bg-[var(--color-page)] text-[var(--color-text-secondary)]">
                                        <tr>
                                            <th className="px-4 py-3 text-start font-semibold">العميل</th>
                                            <th className="px-4 py-3 text-start font-semibold">الإيميل</th>
                                            <th className="px-4 py-3 text-start font-semibold">التليفون</th>
                                            <th className="px-4 py-3 text-center font-semibold">الطلبات</th>
                                            <th className="px-4 py-3 text-start font-semibold">العروض</th>
                                            <th className="px-4 py-3 text-start font-semibold">إجمالي المشتريات</th>
                                            <th className="px-4 py-3 text-start font-semibold">آخر طلب</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--color-border-soft)]">
                                        {visibleCustomers.map((customer) => (
                                            <tr key={customer.key} className="hover:bg-[var(--color-page)]">
                                                <td className="px-4 py-3 font-semibold text-[var(--color-text-strong)]">{customer.name}</td>
                                                <td dir="ltr" className="px-4 py-3 text-start">
                                                    {customer.email || <span className="text-[var(--color-subtle)]">غير مسجل</span>}
                                                </td>
                                                <td dir="ltr" className="px-4 py-3 text-start">{customer.phone || "—"}</td>
                                                <td className="px-4 py-3 text-center">{customer.orderCount}</td>
                                                <td className="px-4 py-3 text-start">{customer.marketingConsent ? "مشترك" : "غير مشترك"}</td>
                                                <td dir="ltr" className="px-4 py-3 text-start">{formatPrice(customer.totalSpent)}</td>
                                                <td className="px-4 py-3 text-start">{customer.lastOrderAt ? formatDate(customer.lastOrderAt) : "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            <p className="mt-4 text-xs leading-6 text-[var(--color-muted)]">
                التصدير بيشمل العملاء الظاهرين بعد البحث، اللي وافقوا صراحةً على عروض الإيميل فقط. الطلبات القديمة بتظهر غير مشتركة افتراضيًا، ومش هتدخل ملف التصدير.
            </p>
        </div>
    );
}
