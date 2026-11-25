import { supabase } from "./supabase";

/**
 * Build a customer directory from historical orders.
 * Cancelled orders are excluded because they are not completed purchases.
 * Pagination avoids Supabase's default per-request row limit.
 */
export async function getCustomers() {
    const pageSize = 1000;
    const orders = [];

    for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
            .from("orders")
            .select("customer_name, customer_email, customer_phone, marketing_consent, created_at, total, status")
            .neq("status", "cancelled")
            .order("created_at", { ascending: false })
            .range(from, from + pageSize - 1);

        if (error) {
            console.error("Error loading customer directory:", error);
            throw new Error("تعذر تحميل بيانات العملاء. اتأكد من صلاحيات الأدمن.");
        }

        const batch = data ?? [];
        orders.push(...batch);

        if (batch.length < pageSize) break;
    }

    const customers = new Map();

    for (const order of orders) {
        const email = String(order.customer_email ?? "").trim();
        const normalizedEmail = email.toLowerCase();
        const phone = String(order.customer_phone ?? "").trim();
        const normalizedPhone = phone.replace(/\\D/g, "");
        const key = normalizedEmail
            ? `email:${normalizedEmail}`
            : normalizedPhone
                ? `phone:${normalizedPhone}`
                : null;

        if (!key) continue;

        const current = customers.get(key) ?? {
            key,
            name: order.customer_name || "عميل",
            email,
            phone,
            orderCount: 0,
            totalSpent: 0,
            marketingConsent: false,
            lastOrderAt: order.created_at,
        };

        current.orderCount += 1;
        current.totalSpent += Number(order.total) || 0;
        current.marketingConsent = current.marketingConsent || order.marketing_consent === true;

        if (new Date(order.created_at) > new Date(current.lastOrderAt)) {
            current.lastOrderAt = order.created_at;
            current.name = order.customer_name || current.name;
            current.email = email || current.email;
            current.phone = phone || current.phone;
        }

        if (!current.email && email) current.email = email;
        if (!current.phone && phone) current.phone = phone;

        customers.set(key, current);
    }

    return [...customers.values()].sort(
        (a, b) => new Date(b.lastOrderAt) - new Date(a.lastOrderAt)
    );
}
