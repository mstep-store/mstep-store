
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
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--color-pink)] sm:text-sm">
                    Customer Favorites
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-[var(--color-text-strong)] sm:text-3xl">
                    Best Sellers
                </h2>

                <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">
                    The pairs our customers love most.
                </p>
            </div>

            {loading && (
                <p className="py-8 text-center text-sm text-[var(--color-muted)]">
                    Loading best sellers...
                </p>
            )}

            {error && (
                <p
                    role="alert"
                    className="rounded-xl bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger)]"
                >
                    Unable to load best-selling products: {error}
                </p>
            )}

            {!loading && !error && products.length === 0 && (
                <div className="rounded-2xl bg-[var(--color-page)] px-5 py-10 text-center">
                    <p className="font-semibold text-[var(--color-text-secondary)]">
                        No best sellers yet.
                    </p>

                    <p className="mt-2 text-sm text-[var(--color-muted)]">
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
                                className="group overflow-hidden rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] transition duration-300 hover:-translate-y-1 hover:shadow-xl"
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

                                    <span className="absolute left-2 top-2 rounded-full bg-[var(--color-pink-100)] px-3 py-1 text-[10px] font-bold text-[var(--color-pink-dark)] sm:text-xs">
                                        Best Seller
                                    </span>
                                </div>

                                <div className="p-3 sm:p-4">
                                    {product.categories?.name && (
                                        <p className="mb-1 truncate text-xs text-[var(--color-subtle)]">
                                            {product.categories.name}
                                        </p>
                                    )}

                                    <h3 className="line-clamp-2 min-h-10 text-sm font-bold text-[var(--color-text)] group-hover:text-[var(--color-primary)] sm:text-base">
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
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-primary-hover)] hover:text-[var(--color-primary)]"
                >
                    Shop All Products <span>→</span>
                </Link>
            </div>
        </section>
    );
}
