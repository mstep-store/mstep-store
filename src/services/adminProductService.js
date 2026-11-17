import { supabase } from "./supabase";

function normalizeDiscount({
    discount_type,
    discount_value,
    discount_start_at,
    discount_end_at,
    price,
}) {
    const type = discount_type === "" ? null : discount_type ?? null;

    if (type == null) {
        return {
            discount_type: null,
            discount_value: null,
            discount_start_at: null,
            discount_end_at: null,
        };
    }

    if (type !== "percentage" && type !== "fixed") {
        throw new Error("نوع الخصم غير صالح.");
    }

    const value = Number(discount_value);
    if (!Number.isFinite(value) || value < 0) {
        throw new Error("قيمة الخصم لازم تكون رقم أكبر من أو يساوي صفر.");
    }

    if (type === "percentage" && value > 99) {
        throw new Error("النسبة المئوية لا يمكن أن تتجاوز 99%.");
    }

    if (type === "fixed") {
        if (!(value < Number(price))) {
            throw new Error("الخصم الثابت لا يمكن أن يساوي أو يتجاوز سعر الـ variant.");
        }
    }

    const start = discount_start_at ? new Date(discount_start_at).toISOString() : null;
    const end = discount_end_at ? new Date(discount_end_at).toISOString() : null;
    if (start && end && new Date(start) > new Date(end)) {
        throw new Error("تاريخ البداية لا يمكن أن يكون بعد تاريخ النهاية.");
    }

    return {
        discount_type: type,
        discount_value: value,
        discount_start_at: start,
        discount_end_at: end,
    };
}

/**
 * Validates the product-level discount sent by the admin form.
 * `minPrice` is the cheapest variant price (or base_price when the product has
 * no variants yet); a fixed discount must stay below it so every variant keeps
 * a positive price.
 */
function normalizeProductDiscount({
    discount_type,
    discount_value,
    discount_start_at,
    discount_end_at,
    minPrice,
}) {
    const type = discount_type === "" ? null : discount_type ?? null;

    if (type == null) {
        return {
            discount_type: null,
            discount_value: null,
            discount_start_at: null,
            discount_end_at: null,
        };
    }

    if (type !== "percentage" && type !== "fixed") {
        throw new Error("نوع الخصم غير صالح.");
    }

    if (discount_value === "" || discount_value == null) {
        throw new Error("اكتب قيمة الخصم.");
    }

    const value = Number(discount_value);
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error("قيمة الخصم لازم تكون رقم أكبر من صفر.");
    }

    if (type === "percentage" && value > 99) {
        throw new Error("النسبة المئوية لا يمكن أن تتجاوز 99%.");
    }

    if (type === "fixed" && !(value < Number(minPrice))) {
        throw new Error(
            `الخصم الثابت لازم يكون أقل من أرخص سعر للمنتج (${Number(minPrice)} EGP).`
        );
    }

    const start = discount_start_at
        ? new Date(discount_start_at).toISOString()
        : null;
    const end = discount_end_at
        ? new Date(discount_end_at).toISOString()
        : null;

    if (start && end && new Date(start) >= new Date(end)) {
        throw new Error("تاريخ نهاية الخصم لازم يكون بعد تاريخ البداية.");
    }

    return {
        discount_type: type,
        discount_value: value,
        discount_start_at: start,
        discount_end_at: end,
    };
}

export async function clearVariantDiscount(id) {
    const { error } = await supabase
        .from("product_variants")
        .update({
            discount_type: null,
            discount_value: null,
            discount_start_at: null,
            discount_end_at: null,
        })
        .eq("id", id);

    if (error) throw failure(error, "تعذر مسح الخصم");
}

export async function getCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching categories:", error);
        throw new Error("تعذر تحميل التصنيفات.");
    }

    return data ?? [];
}

/**
 * All products for the admin, including unpublished ones.
 */
export async function getAdminProducts() {
    const { data, error } = await supabase
        .from("products")
        .select(`
            id,
            name,
            description,
            base_price,
            discount_type,
            discount_value,
            discount_start_at,
            discount_end_at,
            is_published,
            category_id,
            categories (id, name),
            product_images (image_url, alt_text, sort_order, is_primary),
            product_variants (id, stock_quantity, is_available)
        `)
        .order("id", { ascending: false });

    if (error) {
        console.error("Error fetching admin products:", error);
        throw new Error("تعذر تحميل المنتجات.");
    }

    return (data ?? []).map((product) => {
        const images = [...(product.product_images ?? [])].sort((a, b) => {
            if (a.is_primary !== b.is_primary) {
                return a.is_primary ? -1 : 1;
            }

            return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        });

        const variants = product.product_variants ?? [];

        return {
            ...product,
            thumbnail: images[0] ?? null,
            variantsCount: variants.length,
            totalStock: variants
                .filter((variant) => variant.is_available)
                .reduce(
                    (sum, variant) => sum + (Number(variant.stock_quantity) || 0),
                    0
                ),
        };
    });
}

function cleanProductFields({
    name,
    description,
    base_price,
    category_id,
    is_published,
}) {
    const trimmedName = String(name ?? "").trim();
    const price = Number(base_price);

    if (!trimmedName) {
        throw new Error("اسم المنتج مطلوب.");
    }

    if (!Number.isFinite(price) || price < 0) {
        throw new Error("السعر لازم يكون رقم صحيح وأكبر من أو يساوي صفر.");
    }

    return {
        name: trimmedName,
        description: String(description ?? "").trim() || null,
        base_price: price,
        category_id: category_id ? Number(category_id) : null,
        is_published: Boolean(is_published),
    };
}

/**
 * Product columns + (when the form sends them) the product-level discount.
 * Callers that do not send `discount_type` leave the stored discount untouched.
 */
async function buildProductPayload(fields, productId = null) {
    const payload = cleanProductFields(fields);

    if (fields.discount_type === undefined) {
        return payload;
    }

    let minPrice = payload.base_price;

    if (productId != null) {
        const { data } = await supabase
            .from("product_variants")
            .select("price")
            .eq("product_id", productId);

        const prices = (data ?? [])
            .map((variant) => Number(variant.price))
            .filter(Number.isFinite);

        if (prices.length) {
            minPrice = Math.min(...prices);
        }
    }

    return {
        ...payload,
        ...normalizeProductDiscount({ ...fields, minPrice }),
    };
}

export async function createProduct(fields) {
    const { data, error } = await supabase
        .from("products")
        .insert(await buildProductPayload(fields))
        .select("id")
        .single();

    if (error) {
        console.error("Error creating product:", error);
        throw new Error(`تعذر إضافة المنتج: ${error.message}`);
    }

    return data;
}

export async function updateProduct(id, fields) {
    const { error } = await supabase
        .from("products")
        .update(await buildProductPayload(fields, id))
        .eq("id", id);

    if (error) {
        console.error("Error updating product:", error);
        throw new Error(`تعذر تعديل المنتج: ${error.message}`);
    }
}

export async function setProductPublished(id, isPublished) {
    const { error } = await supabase
        .from("products")
        .update({ is_published: Boolean(isPublished) })
        .eq("id", id);

    if (error) {
        console.error("Error changing product visibility:", error);
        throw new Error("تعذر تغيير حالة النشر.");
    }
}

/* ---------------------------- Categories ---------------------------- */

export async function getAdminCategories() {
    const { data, error } = await supabase
        .from("categories")
        .select("id, name, slug, products (count)")
        .order("id", { ascending: true });

    if (error) {
        console.error("Error fetching categories:", error);
        throw new Error("تعذر تحميل التصنيفات.");
    }

    return (data ?? []).map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        productsCount: Number(category.products?.[0]?.count ?? 0),
    }));
}

function cleanCategoryFields({ name, slug }) {
    const trimmedName = String(name ?? "").trim();
    const trimmedSlug = String(slug ?? "").trim().toLowerCase();

    if (!trimmedName) {
        throw new Error("اسم التصنيف مطلوب.");
    }

    if (!/^[a-z0-9]+$/.test(trimmedSlug)) {
        throw new Error(
            "الـ slug لازم يكون حروف إنجليزي صغيرة وأرقام بس، من غير مسافات (مثال: babycollection)."
        );
    }

    return { name: trimmedName, slug: trimmedSlug };
}

function categoryErrorMessage(error, fallback) {
    if (error.code === "23505") {
        return "فيه تصنيف تاني بنفس الاسم أو الـ slug.";
    }

    if (error.code === "42501") {
        return "مفيش صلاحية. شغّل صلاحيات التصنيفات في admin_setup.sql.";
    }

    return `${fallback}: ${error.message}`;
}

export async function createCategory(fields) {
    const { error } = await supabase
        .from("categories")
        .insert(cleanCategoryFields(fields));

    if (error) {
        console.error("Error creating category:", error);
        throw new Error(categoryErrorMessage(error, "تعذر إضافة التصنيف"));
    }
}

export async function updateCategory(id, fields) {
    const { error } = await supabase
        .from("categories")
        .update(cleanCategoryFields(fields))
        .eq("id", id);

    if (error) {
        console.error("Error updating category:", error);
        throw new Error(categoryErrorMessage(error, "تعذر تعديل التصنيف"));
    }
}

export async function deleteCategory(id) {
    const { error } = await supabase.from("categories").delete().eq("id", id);

    if (error) {
        console.error("Error deleting category:", error);

        if (error.code === "23503") {
            throw new Error("مينفعش تحذف تصنيف فيه منتجات. انقل المنتجات الأول.");
        }

        throw new Error(categoryErrorMessage(error, "تعذر حذف التصنيف"));
    }
}

/* ------------------- Colors, sizes and variants ------------------- */

function failure(error, fallback) {
    console.error(fallback, error);

    if (error.code === "42501") {
        return new Error("مفيش صلاحية. شغّل admin_setup.sql تاني (الجزء الخاص بالألوان والمقاسات).");
    }

    if (error.code === "23505") {
        return new Error("القيمة دي موجودة بالفعل (اسم أو SKU مكرر).");
    }

    return new Error(`${fallback}: ${error.message}`);
}

export async function getProductOptions(productId) {
    const { data, error } = await supabase
        .from("products")
        .select(`
            id,
            name,
            base_price,
            product_colors (id, name, hex_code),
            product_sizes (id, name, sort_order),
            product_images (id, product_id, image_url, alt_text, sort_order, is_primary, color_id),
            product_variants (
                id,
                color_id,
                size_id,
                price,
                stock_quantity,
                sku,
                is_available
            )
        `)
        .eq("id", productId)
        .maybeSingle();

    if (error) {
        throw failure(error, "تعذر تحميل بيانات المنتج");
    }

    if (!data) {
        return null;
    }

    return {
        id: data.id,
        name: data.name,
        base_price: data.base_price,
        colors: [...(data.product_colors ?? [])].sort((a, b) => a.id - b.id),
        sizes: [...(data.product_sizes ?? [])].sort(
            (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id
        ),
        variants: [...(data.product_variants ?? [])].sort((a, b) => a.id - b.id),
        images: [...(data.product_images ?? [])].sort((a, b) => {
            if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;

            return (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.id - b.id;
        }),
    };
}

function cleanColor({ name, hex_code }) {
    const trimmed = String(name ?? "").trim();
    const hex = String(hex_code ?? "").trim();

    if (!trimmed) throw new Error("اسم اللون مطلوب.");

    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
        throw new Error("كود اللون لازم يكون بصيغة #RRGGBB.");
    }

    return { name: trimmed, hex_code: hex.toLowerCase() };
}

export async function addColor(productId, fields) {
    const { error } = await supabase
        .from("product_colors")
        .insert({ product_id: productId, ...cleanColor(fields) });

    if (error) throw failure(error, "تعذر إضافة اللون");
}

export async function updateColor(id, fields) {
    const { error } = await supabase
        .from("product_colors")
        .update(cleanColor(fields))
        .eq("id", id);

    if (error) throw failure(error, "تعذر تعديل اللون");
}

export async function deleteColor(id) {
    // Variants and images that use this color go with it.
    const { error: variantsError } = await supabase
        .from("product_variants")
        .delete()
        .eq("color_id", id);

    if (variantsError) throw failure(variantsError, "تعذر حذف الـ variants المرتبطة باللون");

    const { error: imagesError } = await supabase
        .from("product_images")
        .update({ color_id: null })
        .eq("color_id", id);

    if (imagesError) throw failure(imagesError, "تعذر فك ربط الصور باللون");

    const { error } = await supabase.from("product_colors").delete().eq("id", id);

    if (error) throw failure(error, "تعذر حذف اللون");
}

function cleanSize({ name, sort_order }) {
    const trimmed = String(name ?? "").trim();
    const order = Number(sort_order);

    if (!trimmed) throw new Error("اسم المقاس مطلوب.");

    if (!Number.isInteger(order)) {
        throw new Error("ترتيب المقاس لازم يكون رقم صحيح.");
    }

    return { name: trimmed, sort_order: order };
}

export async function addSize(productId, fields) {
    const { error } = await supabase
        .from("product_sizes")
        .insert({ product_id: productId, ...cleanSize(fields) });

    if (error) throw failure(error, "تعذر إضافة المقاس");
}

export async function updateSize(id, fields) {
    const { error } = await supabase
        .from("product_sizes")
        .update(cleanSize(fields))
        .eq("id", id);

    if (error) throw failure(error, "تعذر تعديل المقاس");
}

export async function deleteSize(id) {
    const { error: variantsError } = await supabase
        .from("product_variants")
        .delete()
        .eq("size_id", id);

    if (variantsError) throw failure(variantsError, "تعذر حذف الـ variants المرتبطة بالمقاس");

    const { error } = await supabase.from("product_sizes").delete().eq("id", id);

    if (error) throw failure(error, "تعذر حذف المقاس");
}

export async function createVariants(rows) {
    if (!rows.length) return;

    const { error } = await supabase.from("product_variants").insert(rows);

    if (error) throw failure(error, "تعذر إضافة الـ variants");
}

export async function updateVariant(id, {
    price,
    stock_quantity,
    sku,
    is_available,
    discount_type = undefined,
    discount_value = undefined,
    discount_start_at = undefined,
    discount_end_at = undefined,
}) {
    const priceNumber = Number(price);
    const stock = Number(stock_quantity);
    const cleanSku = String(sku ?? "").trim();

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
        throw new Error("السعر لازم يكون رقم أكبر من أو يساوي صفر.");
    }

    if (!Number.isInteger(stock) || stock < 0) {
        throw new Error("المخزون لازم يكون رقم صحيح أكبر من أو يساوي صفر.");
    }

    if (!cleanSku) {
        throw new Error("الـ SKU مطلوب.");
    }

    // Validate discount vs price (and existing fixed discount on price change).
    const normalizedDiscount = normalizeDiscount({
        discount_type,
        discount_value,
        discount_start_at,
        discount_end_at,
        price: priceNumber,
    });

    // If price changed, revalidate any existing fixed discount not passed explicitly.
    if (discount_type === undefined) {
        const { data: current } = await supabase
            .from("product_variants")
            .select("discount_type, discount_value, price")
            .eq("id", id)
            .maybeSingle();
        if (current?.discount_type === "fixed" && current.discount_value != null) {
            if (Number(current.discount_value) >= priceNumber) {
                throw new Error("الخصم الثابت لا يمكن أن يساوي أو يتجاوز السعر الجديد.");
            }
        }
    }

    const updatePayload = {
        price: priceNumber,
        stock_quantity: stock,
        sku: cleanSku,
        is_available: Boolean(is_available),
    };

    if (discount_type !== undefined) {
        updatePayload.discount_type = normalizedDiscount.discount_type;
        updatePayload.discount_value = normalizedDiscount.discount_value;
        updatePayload.discount_start_at = normalizedDiscount.discount_start_at;
        updatePayload.discount_end_at = normalizedDiscount.discount_end_at;
    }

    const { error } = await supabase
        .from("product_variants")
        .update(updatePayload)
        .eq("id", id);

    if (error) throw failure(error, "تعذر حفظ الـ variant");
}

export async function deleteVariant(id) {
    const { error } = await supabase.from("product_variants").delete().eq("id", id);

    if (error) throw failure(error, "تعذر حذف الـ variant");
}

function makeSku(productId, colorName, sizeName) {
    const part = (value) =>
        String(value ?? "")
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "");

    return ["P" + productId, part(colorName), part(sizeName)]
        .filter(Boolean)
        .join("-");
}

const sameName = (a, b) =>
    String(a ?? "").trim().toLowerCase() === String(b ?? "").trim().toLowerCase();

/**
 * Adds one variant from typed values. A color or size that does not exist
 * on this product yet is created on the fly; existing ones are reused.
 * `product` is the object returned by getProductOptions.
 */
export async function addProductVariant(
    product,
    {
        colorName,
        hex_code,
        sizeName,
        price,
        stock_quantity,
        discount_type,
        discount_value,
        discount_start_at,
        discount_end_at,
    }
) {
    const typedColor = String(colorName ?? "").trim();
    const typedSize = String(sizeName ?? "").trim();
    const priceNumber = Number(price);
    const stock = Number(stock_quantity);

    if (!typedColor) throw new Error("اكتب اللون.");
    if (!typedSize) throw new Error("اكتب المقاس.");

    if (price === "" || !Number.isFinite(priceNumber) || priceNumber < 0) {
        throw new Error("اكتب السعر (رقم أكبر من أو يساوي صفر).");
    }

    if (stock_quantity === "" || !Number.isInteger(stock) || stock < 0) {
        throw new Error("اكتب الكمية (رقم صحيح أكبر من أو يساوي صفر).");
    }

    const normalizedDiscount = normalizeDiscount({
        discount_type,
        discount_value,
        discount_start_at,
        discount_end_at,
        price: priceNumber,
    });

    let color = product.colors.find((c) => sameName(c.name, typedColor));
    let size = product.sizes.find((z) => sameName(z.name, typedSize));

    if (
        color &&
        size &&
        product.variants.some(
            (v) => v.color_id === color.id && v.size_id === size.id
        )
    ) {
        throw new Error(
            "اللون ده بالمقاس ده موجود بالفعل. عدّل عليه من الجدول تحت."
        );
    }

    let createdColorId = null;
    let createdSizeId = null;

    try {
        if (!color) {
            const clean = cleanColor({ name: typedColor, hex_code });

            const { data, error } = await supabase
                .from("product_colors")
                .insert({ product_id: product.id, ...clean })
                .select("id")
                .single();

            if (error) throw failure(error, "تعذر إضافة اللون");

            createdColorId = data.id;
            color = { id: data.id, name: clean.name };
        }

        if (!size) {
            const nextOrder =
                product.sizes.reduce(
                    (max, z) => Math.max(max, z.sort_order ?? 0),
                    0
                ) + 1;

            const { data, error } = await supabase
                .from("product_sizes")
                .insert({
                    product_id: product.id,
                    ...cleanSize({ name: typedSize, sort_order: nextOrder }),
                })
                .select("id")
                .single();

            if (error) throw failure(error, "تعذر إضافة المقاس");

            createdSizeId = data.id;
            size = { id: data.id, name: typedSize };
        }

        const usedSkus = new Set(product.variants.map((v) => v.sku));
        const baseSku = makeSku(product.id, color.name, size.name);
        let sku = baseSku;

        for (let n = 2; usedSkus.has(sku); n += 1) {
            sku = `${baseSku}-${n}`;
        }

        const { error } = await supabase.from("product_variants").insert({
            product_id: product.id,
            color_id: color.id,
            size_id: size.id,
            price: priceNumber,
            stock_quantity: stock,
            sku,
            is_available: true,
            discount_type: normalizedDiscount.discount_type,
            discount_value: normalizedDiscount.discount_value,
            discount_start_at: normalizedDiscount.discount_start_at,
            discount_end_at: normalizedDiscount.discount_end_at,
        });

        if (error) throw failure(error, "تعذر إضافة التوليفة");
    } catch (err) {
        // Don't leave a color or size behind if the variant itself failed.
        if (createdSizeId != null) {
            await supabase.from("product_sizes").delete().eq("id", createdSizeId);
        }

        if (createdColorId != null) {
            await supabase.from("product_colors").delete().eq("id", createdColorId);
        }

        throw err;
    }
}

/* ------------------------------ Images ------------------------------ */

export const IMAGE_BUCKET = "product-images";
export const MAX_IMAGE_SIZE_MB = 5;

const IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
};

export function validateImageFile(file) {
    if (!IMAGE_TYPES[file.type]) {
        throw new Error(`«${file.name}» مش مدعوم. الأنواع المسموحة: JPG وPNG وWebP.`);
    }

    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        throw new Error(`«${file.name}» أكبر من ${MAX_IMAGE_SIZE_MB} ميجا.`);
    }
}

function storagePathFromUrl(url) {
    const marker = `/object/public/${IMAGE_BUCKET}/`;
    const index = String(url ?? "").indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

/**
 * Uploads files to Storage and adds them to the product's images.
 * The first image becomes the main one if the product has none yet.
 */
export async function uploadProductImages(
    productId,
    productName,
    files,
    colorId = null
) {
    const list = Array.from(files ?? []);

    if (!list.length) return;

    list.forEach(validateImageFile);

    const { data: existing, error: existingError } = await supabase
        .from("product_images")
        .select("id, sort_order, is_primary")
        .eq("product_id", productId);

    if (existingError) throw failure(existingError, "تعذر قراءة صور المنتج");

    const hasPrimary = (existing ?? []).some((image) => image.is_primary);
    const lastOrder = (existing ?? []).reduce(
        (max, image) => Math.max(max, image.sort_order ?? 0),
        0
    );

    const uploadedPaths = [];
    const rows = [];

    try {
        for (const [index, file] of list.entries()) {
            const path = `${productId}/${crypto.randomUUID()}.${IMAGE_TYPES[file.type]}`;

            const { error } = await supabase.storage
                .from(IMAGE_BUCKET)
                .upload(path, file, {
                    contentType: file.type,
                    cacheControl: "31536000",
                });

            if (error) {
                console.error("Error uploading image:", error);

                throw new Error(
                    error.message?.toLowerCase().includes("bucket")
                        ? "مفيش bucket اسمه product-images. شغّل جزء الصور في admin_setup.sql."
                        : `تعذر رفع «${file.name}»: ${error.message}`
                );
            }

            uploadedPaths.push(path);

            const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);

            rows.push({
                product_id: productId,
                image_url: data.publicUrl,
                alt_text: productName || null,
                sort_order: lastOrder + index + 1,
                is_primary: !hasPrimary && index === 0,
                color_id: colorId,
            });
        }

        const { error } = await supabase.from("product_images").insert(rows);

        if (error) throw failure(error, "تعذر حفظ الصور");
    } catch (err) {
        if (uploadedPaths.length) {
            await supabase.storage.from(IMAGE_BUCKET).remove(uploadedPaths);
        }

        throw err;
    }
}

export async function setPrimaryImage(productId, imageId) {
    const { error: clearError } = await supabase
        .from("product_images")
        .update({ is_primary: false })
        .eq("product_id", productId);

    if (clearError) throw failure(clearError, "تعذر تغيير الصورة الرئيسية");

    const { error } = await supabase
        .from("product_images")
        .update({ is_primary: true })
        .eq("id", imageId);

    if (error) throw failure(error, "تعذر تغيير الصورة الرئيسية");
}

export async function setImageColor(imageId, colorId) {
    const { error } = await supabase
        .from("product_images")
        .update({ color_id: colorId || null })
        .eq("id", imageId);

    if (error) throw failure(error, "تعذر ربط الصورة باللون");
}

export async function deleteProductImage(image) {
    const { error } = await supabase
        .from("product_images")
        .delete()
        .eq("id", image.id);

    if (error) throw failure(error, "تعذر حذف الصورة");

    const path = storagePathFromUrl(image.image_url);

    if (path) {
        const { error: storageError } = await supabase.storage
            .from(IMAGE_BUCKET)
            .remove([path]);

        if (storageError) {
            console.error("Image row deleted, file cleanup failed:", storageError);
        }
    }

    if (image.is_primary) {
        const { data: next } = await supabase
            .from("product_images")
            .select("id")
            .eq("product_id", image.product_id)
            .order("sort_order", { ascending: true })
            .limit(1)
            .maybeSingle();

        if (next) {
            await supabase
                .from("product_images")
                .update({ is_primary: true })
                .eq("id", next.id);
        }
    }
}
