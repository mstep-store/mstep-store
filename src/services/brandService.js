import { supabase } from "./supabase";
import {
    removeSiteImage,
    removeSiteImagePath,
    setupError,
    uploadSiteImage,
} from "./siteImageService";

/* ------------------------------ Storefront ------------------------------ */

/**
 * Active brands that have at least one published product, so a customer never
 * lands on an empty brand page. The product count goes through the same
 * security rules as the shop, so it only counts published products.
 */
export async function getStoreBrands() {
    const { data, error } = await supabase
        .from("brands")
        .select("id, name, slug, logo_url, products (count)")
        .eq("is_active", true)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching brands:", error);
        throw new Error("Unable to load brands.");
    }

    return (data ?? [])
        .filter((brand) => Number(brand.products?.[0]?.count ?? 0) > 0)
        .map(({ id, name, slug, logo_url }) => ({ id, name, slug, logo_url }));
}

/* ------------------------------- Dashboard ------------------------------ */

/** Brands for the product form's dropdown (hidden ones included). */
export async function getBrandOptions() {
    const { data, error } = await supabase
        .from("brands")
        .select("id, name, is_active")
        .order("name", { ascending: true });

    if (error) throw setupError(error, "تعذر تحميل البراندات");

    return data ?? [];
}

export async function getAdminBrands() {
    const { data, error } = await supabase
        .from("brands")
        .select("id, name, slug, logo_url, is_active, products (count)")
        .order("name", { ascending: true });

    if (error) throw setupError(error, "تعذر تحميل البراندات");

    return (data ?? []).map((brand) => ({
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
        logo_url: brand.logo_url,
        is_active: brand.is_active,
        productsCount: Number(brand.products?.[0]?.count ?? 0),
    }));
}

function cleanBrandFields({ name, slug, is_active }) {
    const trimmedName = String(name ?? "").trim();
    const trimmedSlug = String(slug ?? "").trim().toLowerCase();

    if (!trimmedName) {
        throw new Error("اسم البراند مطلوب.");
    }

    if (!/^[a-z0-9]+$/.test(trimmedSlug)) {
        throw new Error(
            "الـ slug لازم يكون حروف إنجليزي صغيرة وأرقام بس، من غير مسافات (مثال: nike)."
        );
    }

    return {
        name: trimmedName,
        slug: trimmedSlug,
        is_active: Boolean(is_active),
    };
}

function brandError(error, fallback) {
    if (error.code === "23505") {
        return new Error("فيه براند تاني بنفس الاسم أو الـ slug.");
    }

    return setupError(error, fallback);
}

export async function createBrand({ logoFile, ...fields }) {
    const clean = cleanBrandFields(fields);
    const upload = logoFile ? await uploadSiteImage(logoFile, "brands") : null;

    const { error } = await supabase
        .from("brands")
        .insert({ ...clean, logo_url: upload?.url ?? null });

    if (error) {
        await removeSiteImagePath(upload?.path);
        throw brandError(error, "تعذر إضافة البراند");
    }
}

/**
 * `logoFile` replaces the logo, `removeLogo` clears it, and leaving both empty
 * keeps the current one.
 */
export async function updateBrand(brand, { logoFile, removeLogo, ...fields }) {
    const clean = cleanBrandFields(fields);
    const upload = logoFile ? await uploadSiteImage(logoFile, "brands") : null;

    let logo_url = brand.logo_url;
    if (upload) logo_url = upload.url;
    else if (removeLogo) logo_url = null;

    const { error } = await supabase
        .from("brands")
        .update({ ...clean, logo_url })
        .eq("id", brand.id);

    if (error) {
        await removeSiteImagePath(upload?.path);
        throw brandError(error, "تعذر تعديل البراند");
    }

    if (logo_url !== brand.logo_url) {
        await removeSiteImage(brand.logo_url);
    }
}

/** Products of a deleted brand are kept, they just have no brand anymore. */
export async function deleteBrand(brand) {
    const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", brand.id);

    if (error) throw brandError(error, "تعذر حذف البراند");

    await removeSiteImage(brand.logo_url);
}
