export const ORDER_STATUSES = [
    {
        value: "pending",
        label: "قيد الانتظار",
        badge: "bg-[var(--color-warning-bg-strong)] text-[var(--color-warning-dark)]",
    },
    {
        value: "processing",
        label: "قيد التجهيز",
        badge: "bg-[var(--color-blue-100)] text-[var(--color-blue-800)]",
    },
    {
        value: "shipped",
        label: "تم الشحن",
        badge: "bg-indigo-100 text-indigo-800",
    },
    {
        value: "delivered",
        label: "تم التسليم",
        badge: "bg-[var(--color-success-bg-strong)] text-[var(--color-success-dark)]",
    },
    {
        value: "cancelled",
        label: "ملغي",
        badge: "bg-[var(--color-rose-100)] text-[var(--color-rose-800)]",
    },
];

export function getStatusMeta(value) {
    return (
        ORDER_STATUSES.find((status) => status.value === value) ?? {
            value,
            label: value || "غير معروف",
            badge: "bg-[var(--color-slate-100)] text-[var(--color-text-secondary)]",
        }
    );
}
