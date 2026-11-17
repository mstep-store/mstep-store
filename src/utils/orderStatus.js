export const ORDER_STATUSES = [
    {
        value: "pending",
        label: "قيد الانتظار",
        badge: "bg-amber-100 text-amber-800",
    },
    {
        value: "processing",
        label: "قيد التجهيز",
        badge: "bg-blue-100 text-blue-800",
    },
    {
        value: "shipped",
        label: "تم الشحن",
        badge: "bg-indigo-100 text-indigo-800",
    },
    {
        value: "delivered",
        label: "تم التسليم",
        badge: "bg-emerald-100 text-emerald-800",
    },
    {
        value: "cancelled",
        label: "ملغي",
        badge: "bg-rose-100 text-rose-800",
    },
];

export function getStatusMeta(value) {
    return (
        ORDER_STATUSES.find((status) => status.value === value) ?? {
            value,
            label: value || "غير معروف",
            badge: "bg-slate-100 text-slate-700",
        }
    );
}
