const KEY = "recentOrders";
const MAX_ORDERS = 5;

// Only the order number and date are stored (never the phone number),
// so this is useless to anyone who doesn't also know the phone.
export function getRecentOrders() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY) || "[]");

        return Array.isArray(saved)
            ? saved.filter((order) => typeof order?.orderNumber === "string")
            : [];
    } catch {
        return [];
    }
}

export function saveRecentOrder(orderNumber) {
    if (!orderNumber) return;

    try {
        const others = getRecentOrders().filter(
            (order) => order.orderNumber !== orderNumber
        );

        localStorage.setItem(
            KEY,
            JSON.stringify(
                [{ orderNumber, placedAt: new Date().toISOString() }, ...others].slice(
                    0,
                    MAX_ORDERS
                )
            )
        );
    } catch {
        // Storage can be unavailable (private mode); tracking still works manually.
    }
}
