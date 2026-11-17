
import { Link } from "react-router";
import { useEffect, useState } from "react";
import { getBestSellers } from "../../../services/productService";
import PriceTag from "../PriceTag";
import { getListingPriceInfo } from "../../../utils/pricing";

export default function BestSellers() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;

        async function loadBestSellers() {
            try {
                const data = await getBestSellers(4);

                if (active) {
                    setProducts(data);
                }
            } catch (err) {
                if (active) {
                    setError(
                        err.message || "Unable to load best-selling products."
                    );
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadBestSellers();

        return () => {
            active = false;
        };
    }, []);

    return (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20">
            <div className="mb-8 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-sm">
                    Customer Favorites
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    Best Sellers
                </h2>

                <p className="mt-3 text-sm text-slate-500 sm:text-base">
                    The little favorites everyone loves.
                </p>
            </div>

            {loading && (
                <p className="py-8 text-center text-sm text-slate-500">
                    Loading best sellers...
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="rounded-xl bg-red-50 p-4 text-sm text-red-600"
                >
                    Unable to load best-selling products: {error}
                </p>
            )}

            {!loading && !error && products.length === 0 && (
                <div className="rounded-2xl bg-slate-50 px-5 py-10 text-center">
                    <p className="font-semibold text-slate-700">
                        No best sellers yet.
                    </p>

                    <p className="mt-2 text-sm text-slate-500">
                        Products will appear here once orders have been delivered.
                    </p>
                </div>
            )}

            {!loading && !error && products.length > 0 && (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                    {products.map((product) => {
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
                                            alt={image.alt_text || product.name}
                                            loading="lazy"
                                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                        />
                                    ) : (
                                        <div className="flex h-full items-center justify-center text-sm text-slate-400">
                                            No Image Available
                                        </div>
                                    )}

                                    <span className="absolute left-2 top-2 rounded-full bg-pink-100 px-3 py-1 text-[10px] font-bold text-pink-600 sm:text-xs">
                                        Best Seller
                                    </span>
                                </div>

                                <div className="p-3 sm:p-4">
                                    {product.categories?.name && (
                                        <p className="mb-1 truncate text-xs text-slate-400">
                                            {product.categories.name}
                                        </p>
                                    )}

                                    <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-slate-800 group-hover:text-blue-600 sm:text-base">
                                        {product.name}
                                    </h3>

                                    <PriceTag
                                        info={getListingPriceInfo(product)}
                                    />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}

            <div className="mt-8 text-center">
                <Link
                    to="/products"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-500 hover:text-blue-600"
                >
                    Shop All Products <span>→</span>
                </Link>
            </div>
        </section>
    );
}
