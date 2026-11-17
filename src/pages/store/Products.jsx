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
    const [sortBy, setSortBy] = useState("newest");

    const selectedCategory = searchParams.get("category") || "all";

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

    // Filter and sort products.
    const filteredProducts = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();
        const normalizedCategory = normalizeCategorySlug(selectedCategory);

        const result = products.filter((product) => {
            const productName = String(product.name || "").toLowerCase();
            const productDescription = String(
                product.description || ""
            ).toLowerCase();
            const categoryName = String(
                product.categories?.name || ""
            ).toLowerCase();

            const matchesSearch =
                !normalizedSearch ||
                productName.includes(normalizedSearch) ||
                productDescription.includes(normalizedSearch) ||
                categoryName.includes(normalizedSearch);

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

            return matchesSearch && matchesCategory;
        });

        return [...result].sort((a, b) => {
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
    }, [products, search, selectedCategory, sortBy]);

    function handleCategoryChange(value) {
        const nextParams = new URLSearchParams(searchParams);

        if (value === "all") {
            nextParams.delete("category");
        } else {
            nextParams.set("category", value);
        }

        setSearchParams(nextParams);
    }

    const activeCategory =
        selectedCategory === "all"
            ? null
            : categories.find(
                (category) =>
                    category.slug === normalizeCategorySlug(selectedCategory) ||
                    category.id === selectedCategory
            );

    const pageTitle =
        activeCategory?.name ||
        (selectedCategory !== "all"
            ? normalizeCategorySlug(selectedCategory).replace(/^./, (c) =>
                c.toUpperCase()
            )
            : "Our Collection");

    function clearFilters() {
        setSearch("");
        setSortBy("newest");
        setSearchParams({});
    }

    return (
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:py-12">
            {/* Page Header */}
            <header className="mb-8 text-center sm:mb-10">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-sm">
                    Made for Little Moments
                </p>

                <h1 className="mt-2 text-3xl font-extrabold text-slate-900 sm:text-4xl">
                    {pageTitle}
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
                    Discover comfortable, playful styles for every little
                    adventure.
                </p>
            </header>

            {/* Search, Sort and Categories */}
            <section
                aria-label="Product filters"
                className="mb-8 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"
            >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_220px]">
                    {/* Search */}
                    <div>
                        <label
                            htmlFor="product-search"
                            className="mb-2 block text-sm font-bold text-slate-700"
                        >
                            Search Products
                        </label>

                        <div className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 transition focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
                            <Search
                                size={19}
                                className="shrink-0 text-slate-400"
                            />

                            <input
                                id="product-search"
                                type="search"
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by product name..."
                                className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
                            />

                            {search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    aria-label="Clear search"
                                    className="text-slate-400 hover:text-slate-700"
                                >
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Sort */}
                    <div>
                        <label
                            htmlFor="product-sort"
                            className="mb-2 block text-sm font-bold text-slate-700"
                        >
                            Sort By
                        </label>

                        <div className="flex h-12 items-center gap-2 rounded-xl border border-slate-200 px-3 focus-within:border-blue-500">
                            <SlidersHorizontal
                                size={17}
                                className="shrink-0 text-slate-400"
                            />

                            <select
                                id="product-sort"
                                value={sortBy}
                                onChange={(event) =>
                                    setSortBy(event.target.value)
                                }
                                className="w-full bg-transparent text-sm text-slate-700 outline-none"
                            >
                                <option value="newest">Newest First</option>
                                <option value="price-low">
                                    Price: Low to High
                                </option>
                                <option value="price-high">
                                    Price: High to Low
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Dynamic Categories */}
                <div className="mt-5">
                    <p className="mb-3 text-sm font-bold text-slate-700">
                        Categories
                    </p>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => handleCategoryChange("all")}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${selectedCategory === "all"
                                    ? "bg-blue-600 text-white"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                        >
                            All Products
                        </button>

                        {categories.map((category) => {
                            const isSelected =
                                normalizeCategorySlug(selectedCategory) ===
                                category.slug ||
                                selectedCategory === category.id;

                            return (
                                <button
                                    key={category.id}
                                    type="button"
                                    onClick={() =>
                                        handleCategoryChange(
                                            category.slug || category.id
                                        )
                                    }
                                    className={`rounded-full px-4 py-2 text-sm font-semibold transition ${isSelected
                                            ? "bg-blue-600 text-white"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                >
                                    {category.name}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Loading */}
            {loading && (
                <div
                    role="status"
                    className="py-20 text-center text-sm text-slate-500"
                >
                    Loading products...
                </div>
            )}

            {/* Error */}
            {!loading && error && (
                <div
                    role="alert"
                    className="rounded-2xl bg-red-50 p-6 text-center text-sm text-red-600"
                >
                    <p className="font-semibold">
                        Unable to load products.
                    </p>

                    <p className="mt-2">{error}</p>

                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-full bg-red-600 px-5 py-2 font-bold text-white transition hover:bg-red-700"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* Products */}
            {!loading && !error && (
                <>
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-slate-500">
                            <span className="font-bold text-slate-900">
                                {filteredProducts.length}
                            </span>{" "}
                            {filteredProducts.length === 1
                                ? "product"
                                : "products"}{" "}
                            found
                        </p>

                        {(search ||
                            selectedCategory !== "all" ||
                            sortBy !== "newest") && (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    Clear Filters
                                </button>
                            )}
                    </div>

                    {filteredProducts.length === 0 ? (
                        <div className="rounded-2xl bg-slate-50 px-5 py-16 text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                                <Search size={24} />
                            </div>

                            <h2 className="mt-4 text-lg font-extrabold text-slate-800">
                                No Products Found
                            </h2>

                            <p className="mt-2 text-sm text-slate-500">
                                Try another search or choose a different
                                category.
                            </p>

                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
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
                                        className="group overflow-hidden rounded-2xl border border-slate-100 bg-white transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                                    >
                                        <div className="relative aspect-4/5 overflow-hidden bg-slate-50">
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
                                                <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">
                                                    No Image Available
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-3 sm:p-4">
                                            {product.categories?.name && (
                                                <p className="mb-1 truncate text-xs text-slate-400">
                                                    {product.categories.name}
                                                </p>
                                            )}

                                            <h2 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-800 transition group-hover:text-blue-600 sm:text-base">
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
