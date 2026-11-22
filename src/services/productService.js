
import { supabase } from "./supabase";

export async function getPublishedProducts() {
    const { data, error } = await supabase
        .from("products")
        .select(`
      id,
      display_order,
      name,
      description,
      base_price,
      discount_type,
      discount_value,
      discount_start_at,
      discount_end_at,
      categories (id, name, slug),
      brands (id, name, slug),
      product_images (
        id,
        image_url,
        alt_text,
        sort_order,
        is_primary
      ),
      product_variants (
        id,
        price,
        stock_quantity,
        is_available
      )
    `)
        .eq("is_published", true)
        .order("display_order", { ascending: true })
        .order("id", { ascending: false });

    if (error) {
        console.error("Supabase products error:", error);
        throw error;
    }

    return (data ?? []).map((product) => ({
        ...product,
        images: [...(product.product_images ?? [])].sort(
            (a, b) => {
                if (a.is_primary !== b.is_primary) {
                    return a.is_primary ? -1 : 1;
                }

                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
            }
        ),
        variants: (product.product_variants ?? []).filter(
            (variant) =>
                variant.is_available && variant.stock_quantity > 0
        ),
    }));
}


export async function getProductById(id) {
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
      category_id,
      categories (
        id,
        name,
        slug
      ),
      brands (id, name, slug),
      product_images (
        id,
        image_url,
        alt_text,
        sort_order,
        is_primary,
        color_id
      ),
      product_colors (
        id,
        name,
        hex_code
      ),
      product_sizes (
        id,
        name,
        sort_order
      ),
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
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();

    if (error) {
        console.error("Error fetching product:", error);
        throw error;
    }

    if (!data) {
        return null;
    }

    return {
        ...data,
        images: [...(data.product_images ?? [])].sort(
            (a, b) => {
                if (a.is_primary !== b.is_primary) {
                    return a.is_primary ? -1 : 1;
                }

                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
            }
        ),
        variants: (data.product_variants ?? []).filter(
            (variant) =>
                variant.is_available &&
                variant.stock_quantity > 0
        ),
    };
}

/**
 * Best-selling published products for the storefront.
 * Sales numbers come from a database function that exposes only
 * aggregates, so visitors never read orders directly.
 */
export async function getBestSellers(limit = 4) {
    const { data: ranking, error: rankingError } = await supabase.rpc(
        "get_public_best_sellers",
        { max_items: limit }
    );

    if (rankingError) {
        console.error("Best sellers error:", rankingError);
        throw new Error("Unable to load best-selling products.");
    }

    const quantities = new Map(
        (ranking ?? []).map((row) => [
            String(row.product_id),
            Number(row.total_quantity) || 0,
        ])
    );

    if (quantities.size === 0) {
        return [];
    }

    const { data, error } = await supabase
        .from("products")
        .select(`
      id,
      name,
      base_price,
      discount_type,
      discount_value,
      discount_start_at,
      discount_end_at,
      categories (id, name, slug),
      product_images (
        id,
        image_url,
        alt_text,
        sort_order,
        is_primary
      ),
      product_variants (
        id,
        price,
        stock_quantity,
        is_available
      )
    `)
        .in("id", [...quantities.keys()])
        .eq("is_published", true);

    if (error) {
        console.error("Best sellers products error:", error);
        throw new Error("Unable to load best-selling products.");
    }

    return (data ?? [])
        .map((product) => ({
            ...product,
            total_quantity: quantities.get(String(product.id)) ?? 0,
            variants: (product.product_variants ?? []).filter(
                (variant) =>
                    variant.is_available && variant.stock_quantity > 0
            ),
            images: [...(product.product_images ?? [])].sort((a, b) => {
                if (a.is_primary !== b.is_primary) {
                    return a.is_primary ? -1 : 1;
                }

                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
            }),
        }))
        .sort((a, b) => b.total_quantity - a.total_quantity);
}

/** Fetch one server-paginated storefront page (20 items by default). */
export async function getPublishedProductsPage({
    page = 1,
    pageSize = 20,
    search = "",
    category = "all",
    brand = "all",
    sortBy = "manual",
} = {}) {
    const { data, error } = await supabase.rpc("get_public_products_page", {
        p_page: page,
        p_page_size: pageSize,
        p_search: search,
        p_category: category,
        p_brand: brand,
        p_sort_by: sortBy,
    });

    if (error) {
        console.error("Supabase paginated products error:", error);
        throw error;
    }

    return {
        items: (data?.items ?? []).map((product) => ({
            ...product,
            images: [...(product.product_images ?? [])].sort((a, b) => {
                if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
                return (a.sort_order ?? 0) - (b.sort_order ?? 0);
            }),
            variants: product.product_variants ?? [],
        })),
        totalCount: Number(data?.total_count ?? 0),
        page: Number(data?.page ?? page),
        pageSize: Number(data?.page_size ?? pageSize),
        totalPages: Number(data?.total_pages ?? 0),
    };
}

/** Filter choices are loaded independently so they don't depend on page contents. */
export async function getPublishedProductFilters() {
    const [categoriesResult, brandsResult] = await Promise.all([
        supabase.from("categories").select("id, name, slug").order("name"),
        supabase.from("brands").select("id, name, slug").eq("is_active", true).order("name"),
    ]);

    if (categoriesResult.error) throw categoriesResult.error;
    if (brandsResult.error) throw brandsResult.error;

    return {
        categories: categoriesResult.data ?? [],
        brands: brandsResult.data ?? [],
    };
}
