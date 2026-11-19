
import { Link } from "react-router";
import useProducts from "../../hooks/useProducts";
import PriceTag from "../../components/store/PriceTag";
import { getListingPriceInfo } from "../../utils/pricing";

import Hero from "../../components/store/home/Hero";

import PromoBanners from "../../components/store/home/PromoBanners";
import BrandsSection from "../../components/store/home/BrandsSection";
import CategoryGrid from "../../components/store/home/CategoryGrid";
import BestSellers from "../../components/store/home/BestSellers";
import StoreBenefits from "../../components/store/home/StoreBenefits";

export default function Home() {
    const { products, loading, error } = useProducts();

    return (
        <main className="min-h-screen bg-[var(--color-surface)] pb-16">
            {/* Hero */}
            <Hero />

            {/* Shop by category */}
            <CategoryGrid />

            {/* Shop by brand (managed from the dashboard) */}
            <BrandsSection />

            {/* Latest arrivals */}
            <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-pink)] sm:text-sm">
                            Fresh Picks for Every Step
                        </p>

                        <h2 className="text-2xl font-extrabold tracking-tight text-[var(--color-text-strong)] sm:text-3xl">
                            Latest Arrivals
                        </h2>

                        <p className="mt-2 text-sm text-[var(--color-muted)] sm:text-base">
                            Discover your next favorite pair.
                        </p>
                    </div>

                    <Link
                        to="/products"
                        className="shrink-0 text-sm font-bold text-[var(--color-primary)] transition-colors duration-300 hover:text-[var(--color-pink)]"
                    >
                        View All <span aria-hidden="true">→</span>
                    </Link>
                </div>

                {loading && (
                    <p className="py-12 text-center text-sm text-[var(--color-muted)]">
                        Loading products...
                    </p>
                )}

                {error && (
                    <p
                        role="alert"
                        className="rounded-xl bg-[var(--color-danger-bg)] px-4 py-5 text-sm text-[var(--color-danger)]"
                    >
                        Unable to load products: {error}
                    </p>
                )}

                {!loading && !error && products.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-[var(--color-border)] px-4 py-12 text-center">
                        <p className="font-semibold text-[var(--color-text-secondary)]">
                            No Products Available Yet.
                        </p>

                        <p className="mt-2 text-sm text-[var(--color-muted)]">
                            Newly published products will appear here.
                        </p>
                    </div>
                )}

                {!loading && !error && products.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                        {products.map((product) => {
                            const image = product.images?.[0];

                            return (
                                <article
                                    key={product.id}
                                    className="group min-w-0 overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:border-[var(--color-blue-100)] hover:shadow-xl hover:shadow-[var(--color-shadow-page)]"
                                >
                                    <Link
                                        to={`/products/${product.id}`}
                                        className="block"
                                        aria-label={`View ${product.name}`}
                                    >
                                        <div className="relative aspect-4/5 overflow-hidden bg-[var(--color-page)]">
                                            {image?.image_url ? (
                                                <img
                                                    src={image.image_url}
                                                    alt={image.alt_text || product.name}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-[var(--color-subtle)]">
                                                    No Image Available
                                                </div>
                                            )}

                                            <span className="absolute left-2 top-2 rounded-full bg-[var(--color-white-95)] px-3 py-1 text-[10px] font-bold text-[var(--color-text-secondary)] shadow-sm sm:left-3 sm:top-3 sm:text-xs">
                                                New Arrival
                                            </span>
                                        </div>

                                        <div className="p-3 sm:p-4">
                                            {product.categories?.name && (
                                                <p className="mb-1 truncate text-xs font-medium text-[var(--color-subtle)]">
                                                    {product.categories.name}
                                                </p>
                                            )}

                                            <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-[var(--color-text)] transition-colors group-hover:text-[var(--color-primary)] sm:text-base">
                                                {product.name}
                                            </h3>

                                            <PriceTag
                                                info={getListingPriceInfo(product)}
                                            />
                                        </div>
                                    </Link>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* Two promo banners (managed from the dashboard) */}
            <PromoBanners />

            {/* Best sellers based on delivered orders */}
            <BestSellers />

            {/* Store benefits */}
            <StoreBenefits />
        </main>
    );
}
