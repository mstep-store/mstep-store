import { supabase } from "./supabase";

export async function getShippingLocations({ admin = false } = {}) {
    const { data, error } = await supabase
        .from("governorates")
        .select("id, name, shipping_price, is_active, shipping_cities(id, name, is_active)")
        .order("name", { ascending: true });

    if (error) throw new Error(error.message || "تعذر تحميل أماكن الشحن.");

    const rows = data ?? [];
    return admin ? rows : rows.filter((g) => g.is_active).map((g) => ({
        ...g,
        shipping_cities: (g.shipping_cities ?? []).filter((c) => c.is_active),
    }));
}

export async function saveGovernorate({ id, name, shipping_price, is_active = true }) {
    const payload = {
        name: String(name).trim(),
        shipping_price: Number(shipping_price),
        is_active,
        updated_at: new Date().toISOString(),
    };
    if (!payload.name || !Number.isFinite(payload.shipping_price) || payload.shipping_price < 0) {
        throw new Error("اكتب اسم المحافظة وسعر شحن صحيح.");
    }
    const query = id
        ? supabase.from("governorates").update(payload).eq("id", id)
        : supabase.from("governorates").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message || "تعذر حفظ المحافظة.");
}

export async function setGovernorateActive(id, is_active) {
    const { error } = await supabase.from("governorates")
        .update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message || "تعذر تحديث حالة المحافظة.");
}

export async function saveShippingCity({ id, governorate_id, name, is_active = true }) {
    const payload = {
        governorate_id: Number(governorate_id),
        name: String(name).trim(),
        is_active,
        updated_at: new Date().toISOString(),
    };
    if (!payload.governorate_id || !payload.name) throw new Error("اكتب اسم المدينة واختار المحافظة.");
    const query = id
        ? supabase.from("shipping_cities").update(payload).eq("id", id)
        : supabase.from("shipping_cities").insert(payload);
    const { error } = await query;
    if (error) throw new Error(error.message || "تعذر حفظ المدينة.");
}

export async function setShippingCityActive(id, is_active) {
    const { error } = await supabase.from("shipping_cities")
        .update({ is_active, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw new Error(error.message || "تعذر تحديث حالة المدينة.");
}


export async function getShippingSettings() {
    const { data, error } = await supabase
        .from("shipping_settings")
        .select("mode, fixed_price")
        .eq("id", 1)
        .maybeSingle();
    if (error) throw new Error(error.message || "Unable to load shipping settings.");
    return data ?? { mode: "governorate", fixed_price: 100 };
}

export async function saveShippingSettings({ mode, fixed_price }) {
    if (!["fixed", "governorate"].includes(mode)) throw new Error("Invalid shipping mode.");
    const price = Number(fixed_price);
    if (!Number.isFinite(price) || price < 0) throw new Error("Enter a valid shipping price.");
    const { error } = await supabase.from("shipping_settings").upsert({
        id: 1, mode, fixed_price: price, updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message || "Unable to save shipping settings.");
}
