
import { Link } from "react-router";
import useProducts from "../../hooks/useProducts";
import PriceTag from "../../components/store/PriceTag";
import { getListingPriceInfo } from "../../utils/pricing";

import Hero from "../../components/store/home/Hero";

import CategoryGrid from "../../components/store/home/CategoryGrid";
import BestSellers from "../../components/store/home/BestSellers";
import StoreBenefits from "../../components/store/home/StoreBenefits";

export default function Home() {
    const { products, loading, error } = useProducts();

    return (
        <main className="min-h-screen bg-white pb-16">
            {/* Hero */}
            <Hero />

            {/* Shop by category */}
            <CategoryGrid />

            {/* Latest arrivals */}
            <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20">
                <div className="mb-8 flex items-end justify-between gap-4">
                    <div>
                        <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-sm">
                            Fresh Picks for Little Ones
                        </p>

                        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                            Latest Arrivals
                        </h2>

                        <p className="mt-2 text-sm text-slate-500 sm:text-base">
                            Discover Their Next Favorite Outfit.
                        </p>
                    </div>

                    <Link
                        to="/products"
                        className="shrink-0 text-sm font-bold text-blue-600 transition-colors duration-300 hover:text-pink-500"
                    >
                        View All <span aria-hidden="true">→</span>
                    </Link>
                </div>

                {loading && (
                    <p className="py-12 text-center text-sm text-slate-500">
                        Loading products...
                    </p>
                )}

                {error && (
                    <p
                        role="alert"
                        className="rounded-xl bg-red-50 px-4 py-5 text-sm text-red-600"
                    >
                        Unable to load products: {error}
                    </p>
                )}

                {!loading && !error && products.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-12 text-center">
                        <p className="font-semibold text-slate-700">
                            No Products Available Yet.
                        </p>

                        <p className="mt-2 text-sm text-slate-500">
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
                                    className="group min-w-0 overflow-hidden rounded-2xl border border-slate-100 bg-white transition duration-300 hover:-translate-y-1 hover:border-blue-100 hover:shadow-xl hover:shadow-slate-200/60"
                                >
                                    <Link
                                        to={`/products/${product.id}`}
                                        className="block"
                                        aria-label={`View ${product.name}`}
                                    >
                                        <div className="relative aspect-4/5 overflow-hidden bg-slate-50">
                                            {image?.image_url ? (
                                                <img
                                                    src={image.image_url}
                                                    alt={image.alt_text || product.name}
                                                    loading="lazy"
                                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                                />
                                            ) : (
                                                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                                    No Image Available
                                                </div>
                                            )}

                                            <span className="absolute left-2 top-2 rounded-full bg-white/95 px-3 py-1 text-[10px] font-bold text-slate-700 shadow-sm sm:left-3 sm:top-3 sm:text-xs">
                                                New Arrival
                                            </span>
                                        </div>

                                        <div className="p-3 sm:p-4">
                                            {product.categories?.name && (
                                                <p className="mb-1 truncate text-xs font-medium text-slate-400">
                                                    {product.categories.name}
                                                </p>
                                            )}

                                            <h3 className="line-clamp-2 min-h-10 text-sm font-bold leading-5 text-slate-800 transition-colors group-hover:text-blue-600 sm:text-base">
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

            {/* Best sellers based on delivered orders */}
            <BestSellers />

            {/* Store benefits */}
            <StoreBenefits />
        </main>
    );
}
