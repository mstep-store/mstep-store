import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { getPublishedProducts } from "../../services/productService";
import { getListingPriceInfo } from "../../utils/pricing";
import PriceTag from "../../components/store/PriceTag";
import { normalizeCategorySlug } from "../../utils/categorySlug";

export default function Products() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();

    const [search, setSearch] = useState("");
    const [sortBy, setSortBy] = useState("manual");
    const [showSearch, setShowSearch] = useState(false);
    const [showFilters, setShowFilters] = useState(false);

    const selectedCategory = searchParams.get("category") || "all";
    const selectedBrand = searchParams.get("brand") || "all";

    useEffect(() => {
        let active = true;

        async function loadProducts() {
            try {
                setLoading(true);
                setError("");

                const data = await getPublishedProducts();

                if (active) {
                    setProducts(Array.isArray(data) ? data : []);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message ||
                        "Unable to load products. Please try again."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadProducts();

        return () => {
            active = false;
        };
    }, []);

    // Get categories from published products in Supabase.
    const categories = useMemo(() => {
        const uniqueCategories = new Map();

        products.forEach((product) => {
            const category = product.categories;

            if (category?.id != null) {
                uniqueCategories.set(String(category.id), {
                    id: String(category.id),
                    name: category.name || "Uncategorized",
                    slug: normalizeCategorySlug(category.slug),
                });
            }
        });

        return Array.from(uniqueCategories.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [products]);

    // Brands that have at least one published product.
    const brands = useMemo(() => {
        const uniqueBrands = new Map();

        products.forEach((product) => {
            const brand = product.brands;

            if (brand?.id != null) {
                uniqueBrands.set(String(brand.id), {
                    id: String(brand.id),
                    name: brand.name || "Brand",
                    slug: String(brand.slug || "").toLowerCase(),
                });
            }
        });

        return Array.from(uniqueBrands.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [products]);

    // Filter and sort products.
    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const normalizedCategory = normalizeCategorySlug(selectedCategory);
        const normalizedBrand = selectedBrand.toLowerCase();

        const result = products.filter((product) => {
            const productName = String(product.name || "").toLowerCase();
            const productDescription = String(
                product.description || ""
            ).toLowerCase();
            const categoryName = String(
                product.categories?.name || ""
            ).toLowerCase();

            const brandName = String(product.brands?.name || "").toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                productName.includes(normalizedSearch) ||
                productDescription.includes(normalizedSearch) ||
                categoryName.includes(normalizedSearch) ||
                brandName.includes(normalizedSearch);

            const matchesBrand =
                selectedBrand === "all" ||
                String(product.brands?.slug || "").toLowerCase() ===
                normalizedBrand ||
                String(product.brands?.id ?? "") === selectedBrand;

            const productCategorySlug = normalizeCategorySlug(
                product.categories?.slug
            );

            const productCategoryId = String(
                product.categories?.id ?? ""
            );

            const matchesCategory =
                selectedCategory === "all" ||
                productCategorySlug === normalizedCategory ||
                productCategoryId === selectedCategory;

            return matchesSearch && matchesCategory && matchesBrand;
        });

        return [...result].sort((a, b) => {
            if (sortBy === "manual") {
                return (
                    (Number(a.display_order) || 0) -
                    (Number(b.display_order) || 0) ||
                    String(b.id).localeCompare(String(a.id), undefined, {
                        numeric: true,
                    })
                );
            }

            if (sortBy === "price-low") {
                return (
                    getListingPriceInfo(a).effective -
                    getListingPriceInfo(b).effective
                );
            }

            if (sortBy === "price-high") {
                return (
                    getListingPriceInfo(b).effective -
                    getListingPriceInfo(a).effective
                );
            }

            return String(b.id).localeCompare(String(a.id), undefined, {
                numeric: true,
            });
        });
    }, [products, search, selectedCategory, selectedBrand, sortBy]);

    function handleCategoryChange(value) {
        const nextParams = new URLSearchParams(searchParams);

        if (value === "all") {
            nextParams.delete("category");
        } else {
            nextParams.set("category", value);
        }

        setSearchParams(nextParams);
    }

    function handleBrandChange(value) {
        const nextParams = new URLSearchParams(searchParams);

        if (value === "all") {
            nextParams.delete("brand");
        } else {
            nextParams.set("brand", value);
        }

        setSearchParams(nextParams);
    }

    const activeBrand =
        selectedBrand === "all"
            ? null
            : brands.find(
                (brand) =>
                    brand.slug === selectedBrand.toLowerCase() ||
                    brand.id === selectedBrand
            );

    const activeCategory =
        selectedCategory === "all"
            ? null
            : categories.find(
                (category) =>
                    category.slug === normalizeCategorySlug(selectedCategory) ||
                    category.id === selectedCategory
            );

    const categoryTitle =
        activeCategory?.name ||
        (selectedCategory !== "all"
            ? normalizeCategorySlug(selectedCategory).replace(/^./, (c) =>
                c.toUpperCase()
            )
            : "");

    const brandTitle =
        activeBrand?.name ||
        (selectedBrand !== "all"
            ? selectedBrand.replace(/^./, (c) => c.toUpperCase())
            : "");

    const pageTitle =
        [brandTitle, categoryTitle].filter(Boolean).join(" · ") ||
        "Our Collection";

    function clearFilters() {
        setSearch("");
        setSortBy("manual");
        setSearchParams({});
    }

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
            {/* Page Header */}
            <header className="mb-8 text-center sm:mb-10">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--color-pink) sm:text-sm">
                    Step Up Your Style
                </p>

                <h1 className="mt-2 text-3xl font-extrabold text-(--color-text-strong) sm:text-4xl">
                    {pageTitle}
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-(--color-muted) sm:text-base">
                    Premium men&apos;s shoes designed for comfort, quality, and style in
                    every step.
                </p>
            </header>

            {/* Search and Filters */}
            <section
                aria-label="Product search and filters"
                className="mb-8 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4 shadow-sm sm:p-5"
            >
                {/* Compact action buttons */}
                <div className="flex items-center justify-end gap-3">
                    <button
                        type="button"
                        onClick={() => setShowSearch((current) => !current)}
                        aria-label={showSearch ? "Close search" : "Open search"}
                        aria-expanded={showSearch}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${showSearch
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page)]"
                            }`}
                    >
                        <Search size={20} />
                    </button>

                    <button
                        type="button"
                        onClick={() => setShowFilters((current) => !current)}
                        aria-label={showFilters ? "Close filters" : "Open filters"}
                        aria-expanded={showFilters}
                        className={`flex h-11 w-11 items-center justify-center rounded-xl border transition ${showFilters
                                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                                : "border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-page)]"
                            }`}
                    >
                        <SlidersHorizontal size={20} />
                    </button>
                </div>

                {/* Search field - shown only when search is opened */}
                {showSearch && (
                    <div className="mt-4">
                        <label
                            htmlFor="product-search"
                            className="mb-2 block text-sm font-bold text-[var(--color-text-secondary)]"
                        >
                            Search Products
                        </label>

                        <div className="flex h-12 items-center gap-3 rounded-xl border border-[var(--color-border)] px-4 transition focus-within:border-[var(--color-primary-hover)] focus-within:ring-2 focus-within:ring-[var(--color-blue-100)]">
                            <Search
                                size={19}
                                className="shrink-0 text-[var(--color-subtle)]"
                            />

                            <input
                                id="product-search"
                                type="search"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                placeholder="Search by product name..."
                                autoFocus
                                className="w-full bg-transparent text-sm text-[var(--color-text)] outline-none! placeholder:text-[var(--color-subtle)]"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                    className="text-[var(--color-subtle)] hover:text-[var(--color-text-secondary)]"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Sort, categories and brands - shown only when filters are opened */}
                {showFilters && (
                    <div className="mt-4 border-t border-[var(--color-border-soft)] pt-4">
                        {/* Sort */}
                        <div>
                            <label
                                htmlFor="product-sort"
                                className="mb-2 block text-sm font-bold text-[var(--color-text-secondary)]"
                            >
                                Sort By
                            </label>

                            <div className="flex h-12 items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 focus-within:border-[var(--color-primary-hover)]">
                                <SlidersHorizontal
                                    size={17}
                                    className="shrink-0 text-[var(--color-subtle)]"
                                />

                                <select
                                    id="product-sort"
                                    value={sortBy}
                                    onChange={(event) => setSortBy(event.target.value)}
                                    className="w-full bg-transparent text-sm text-[var(--color-text-secondary)] outline-none"
                                >
                                    <option value="manual">Store Order</option>
                                    <option value="newest">Newest First</option>
                                    <option value="price-low">Price: Low to High</option>
                                    <option value="price-high">Price: High to Low</option>
                                </select>
                            </div>
                        </div>

                        {/* Dynamic Categories */}
                        <div className="mt-5">
                            <p className="mb-3 text-sm font-bold text-[var(--color-text-secondary)]">
                                Categories
                            </p>

                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => handleCategoryChange("all")}
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === "all"
                                            ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                                            : "bg-[var(--color-slate-100)] text-[var(--color-text-muted)] hover:bg-[var(--color-slate-200)]"
                                        }`}
                                >
                                    All Products
                                </button>

                                {categories.map((category) => {
                                    const isSelected =
                                        normalizeCategorySlug(selectedCategory) === category.slug ||
                                        selectedCategory === category.id;

                                    return (
                                        <button
                                            key={category.id}
                                            type="button"
                                            onClick={() =>
                                                handleCategoryChange(category.slug || category.id)
                                            }
                                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isSelected
                                                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                                                    : "bg-[var(--color-slate-100)] text-[var(--color-text-muted)] hover:bg-[var(--color-slate-200)]"
                                                }`}
                                        >
                                            {category.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Brands */}
                        {brands.length > 0 && (
                            <div className="mt-5">
                                <p className="mb-3 text-sm font-bold text-(--color-text-secondary)">
                                    Brands
                                </p>

                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleBrandChange("all")}
                                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedBrand === "all"
                                                ? "bg-(--color-primary) text-(--color-on-primary)"
                                                : "bg-(--color-slate-100) text-(--color-text-muted) hover:bg-(--color-slate-200)"
                                            }`}
                                    >
                                        All Brands
                                    </button>

                                    {brands.map((brand) => {
                                        const isSelected =
                                            selectedBrand.toLowerCase() === brand.slug ||
                                            selectedBrand === brand.id;

                                        return (
                                            <button
                                                key={brand.id}
                                                type="button"
                                                onClick={() =>
                                                    handleBrandChange(brand.slug || brand.id)
                                                }
                                                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isSelected
                                                        ? "bg-(--color-primary) text-(--color-on-primary)"
                                                        : "bg-(--color-slate-100) text-(--color-text-muted) hover:bg-(--color-slate-200)"
                                                    }`}
                                            >
                                                {brand.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Loading */}
            {loading && (
                <div
                    role="status"
                    className="py-20 text-center text-sm text-[var(--color-muted)]"
                >
                    Loading products...
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div
                    role="alert"
                    className="rounded-2xl bg-[var(--color-danger-bg)] p-6 text-center text-sm text-[var(--color-danger)]"
                >
                    <p className="font-semibold">
                        Unable to load products.
                    </p>

                    <p className="mt-2">{error}</p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-full bg-[var(--color-danger)] px-5 py-2 font-bold text-[var(--color-on-primary)] transition hover:bg-[var(--color-danger-dark)]"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Products */}
            {!loading && !error && (
                <>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-[var(--color-muted)]">
                            <span className="font-bold text-[var(--color-text-strong)]">
                                {filteredProducts.length}
                            </span>{" "}
                            {filteredProducts.length === 1
                                ? "product"
                                : "products"}{" "}
                            found
                        </p>

                        {(search ||
                            selectedCategory !== "all" ||
                            selectedBrand !== "all" ||
                            sortBy !== "newest") && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-sm font-semibold text-[var(--color-primary)] hover:text-[var(--color-primary-dark)]"
                                >
                                    Clear Filters
                                </button>
                            )}
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="rounded-2xl bg-[var(--color-page)] px-5 py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-subtle)] shadow-sm">
                                <Search size={24} />
                            </div>

                            <h2 className="mt-4 text-lg font-extrabold text-[var(--color-text)]">
                                No Products Found
                            </h2>

                            <p className="mt-2 text-sm text-[var(--color-muted)]">
                                Try another search or choose a different
                                category.
                            </p>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-dark)]"
                            >
                                View All Products
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                            {filteredProducts.map((product) => {
                                const image = product.images?.[0];

                                return (
                                    <Link
                                        key={product.id}
                                        to={`/products/${product.id}`}
                                        className="group overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        <div className="relative aspect-4/5 overflow-hidden bg-[var(--color-page)]">
                                            {image?.image_url ? (
                                                <img
                                                    src={image.image_url}
                                                    alt={
                                                        image.alt_text ||
                                                        product.name ||
                                                        "Children's clothing"
                                                    }
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-center text-sm text-[var(--color-subtle)]">
                                                    No Image Available
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 sm:p-4">
                                            {product.categories?.name && (
                                                <p className="mb-1 truncate text-xs text-[var(--color-subtle)]">
                                                    {product.categories.name}
                                                </p>
                                            )}

                                            <h2 className="line-clamp-2 min-h-10 text-sm font-bold text-[var(--color-text)] transition group-hover:text-[var(--color-primary)] sm:text-base">
                                                {product.name}
                                            </h2>

                                            <PriceTag
                                                info={getListingPriceInfo(product)}
                                            />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </main>
    );
}
