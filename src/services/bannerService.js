import { supabase } from "./supabase";
import {
    removeSiteImage,
    removeSiteImagePath,
    setupError,
    uploadSiteImage,
} from "./siteImageService";

// Only an internal path ("/products?brand=nike") or a full http(s) URL.
// Blocks "javascript:" links and protocol-relative "//host" links.
const LINK_PATTERN = /^(\/($|[^/])|https?:\/\/)/i;

export function safeBannerLink(value) {
    const link = String(value ?? "").trim();

    return LINK_PATTERN.test(link) ? link : null;
}

function cleanLink(value) {
    const link = String(value ?? "").trim();

    if (!link) return null;

    if (!LINK_PATTERN.test(link)) {
        throw new Error(
            "الرابط لازم يبدأ بـ / (صفحة جوه المتجر زي /products?brand=nike) أو بـ https://"
        );
    }

    return link;
}

/* ------------------------------ Storefront ------------------------------ */

/** The first two active banners, in the order set from the dashboard. */
export async function getActiveBanners() {
    const { data, error } = await supabase
        .from("banners")
        .select("id, image_url, link_url, alt_text")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true })
        .limit(2);

    if (error) {
        console.error("Error fetching banners:", error);
        throw new Error("Unable to load banners.");
    }

    return data ?? [];
}

/* ------------------------------- Dashboard ------------------------------ */

export async function getAdminBanners() {
    const { data, error } = await supabase
        .from("banners")
        .select("id, image_url, link_url, alt_text, is_active, sort_order")
        .order("sort_order", { ascending: true })
        .order("id", { ascending: true });

    if (error) throw setupError(error, "تعذر تحميل البانرات");

    return data ?? [];
}

export async function createBanner({ file, link_url, alt_text }) {
    if (!file) {
        throw new Error("اختار صورة البانر الأول.");
    }

    const link = cleanLink(link_url);

    const { data: last, error: lastError } = await supabase
        .from("banners")
        .select("sort_order")
        .order("sort_order", { ascending: false })
        .limit(1);

    if (lastError) throw setupError(lastError, "تعذر إضافة البانر");

    const { path, url } = await uploadSiteImage(file, "banners");

    const { error } = await supabase.from("banners").insert({
        image_url: url,
        link_url: link,
        alt_text: String(alt_text ?? "").trim() || null,
        sort_order: (last?.[0]?.sort_order ?? 0) + 1,
    });

    if (error) {
        await removeSiteImagePath(path);
        throw setupError(error, "تعذر إضافة البانر");
    }
}

export async function updateBannerDetails(id, { link_url, alt_text }) {
    const { error } = await supabase
        .from("banners")
        .update({
            link_url: cleanLink(link_url),
            alt_text: String(alt_text ?? "").trim() || null,
        })
        .eq("id", id);

    if (error) throw setupError(error, "تعذر تعديل البانر");
}

export async function setBannerActive(id, isActive) {
    const { error } = await supabase
        .from("banners")
        .update({ is_active: Boolean(isActive) })
        .eq("id", id);

    if (error) throw setupError(error, "تعذر تغيير حالة البانر");
}

/** Saves a new order: the first id gets position 1, and so on. */
export async function reorderBanners(orderedIds) {
    const results = await Promise.all(
        orderedIds.map((id, index) =>
            supabase
                .from("banners")
                .update({ sort_order: index + 1 })
                .eq("id", id)
        )
    );

    const failed = results.find((result) => result.error);

    if (failed) throw setupError(failed.error, "تعذر تغيير ترتيب البانرات");
}

export async function deleteBanner(banner) {
    const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", banner.id);

    if (error) throw setupError(error, "تعذر حذف البانر");

    await removeSiteImage(banner.image_url);
}
