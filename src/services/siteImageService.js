import { supabase } from "./supabase";
import { validateImageFile } from "./adminProductService";

// Public bucket used for homepage banners and brand logos.
export const SITE_IMAGE_BUCKET = "site-images";

const EXTENSIONS = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

function pathFromUrl(url) {
    const marker = `/object/public/${SITE_IMAGE_BUCKET}/`;
    const index = String(url ?? "").indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

/**
 * Uploads one image to Storage and returns its public URL and path.
 * `folder` is "banners" or "brands".
 */
export async function uploadSiteImage(file, folder) {
    validateImageFile(file);

    const path = `${folder}/${crypto.randomUUID()}.${EXTENSIONS[file.type]}`;

    const { error } = await supabase.storage
        .from(SITE_IMAGE_BUCKET)
        .upload(path, file, {
            contentType: file.type,
            cacheControl: "31536000",
        });

    if (error) {
        console.error("Error uploading site image:", error);

        throw new Error(
            error.message?.toLowerCase().includes("bucket")
                ? "مفيش bucket اسمه site-images. شغّل ملف 20261119000001_banners_and_brands.sql."
                : `تعذر رفع الصورة: ${error.message}`
        );
    }

    const { data } = supabase.storage
        .from(SITE_IMAGE_BUCKET)
        .getPublicUrl(path);

    return { path, url: data.publicUrl };
}

/**
 * Deletes an uploaded file by its public URL. Never throws: a leftover file is
 * harmless, and the database change it belongs to has already succeeded.
 */
export async function removeSiteImage(url) {
    const path = pathFromUrl(url);

    if (!path) return;

    const { error } = await supabase.storage
        .from(SITE_IMAGE_BUCKET)
        .remove([path]);

    if (error) {
        console.error("Image row changed, file cleanup failed:", error);
    }
}

export async function removeSiteImagePath(path) {
    if (!path) return;

    await supabase.storage.from(SITE_IMAGE_BUCKET).remove([path]);
}

export function setupError(error, fallback) {
    console.error(fallback, error);

    // 42P01 / PGRST205: table missing. 42501: no permission.
    if (error.code === "42P01" || error.code === "PGRST205") {
        return new Error(
            "الجداول الجديدة مش موجودة. شغّل ملف 20261119000001_banners_and_brands.sql في Supabase."
        );
    }

    if (error.code === "42501") {
        return new Error(
            "مفيش صلاحية. تأكد إنك مسجل دخول كأدمن وإنك شغّلت ملف 20261119000001_banners_and_brands.sql."
        );
    }

    return new Error(`${fallback}: ${error.message}`);
}
