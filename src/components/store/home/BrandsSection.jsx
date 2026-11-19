import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getStoreBrands } from "../../../services/brandService";

// Brands managed from the dashboard (Brands page). Hidden until there is at
// least one brand with a published product.
export default function BrandsSection() {
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const data = await getStoreBrands();

                if (active) setBrands(data);
            } catch (err) {
                // The home page works fine without brands.
                console.error(err);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    if (brands.length === 0) return null;

    return (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20">
            <div className="mb-8 text-center">
                <h2 className="mt-2 text-2xl font-extrabold text-[var(--color-text-strong)] sm:text-3xl">
                    Shop by Brand
                </h2>

                <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">
                    Pick your favorite name and see every pair.
                </p>
            </div>

            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {brands.map((brand) => (
                    <li key={brand.id}>
                        <Link
                            to={`/products?brand=${brand.slug}`}
                            className="group flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-lg"
                        >
                            <span className="flex h-16 w-full items-center justify-center sm:h-20">
                                {brand.logo_url ? (
                                    <img
                                        src={brand.logo_url}
                                        alt=""
                                        loading="lazy"
                                        className="max-h-full max-w-full object-contain transition duration-300 group-hover:scale-105"
                                    />
                                ) : (
                                    <span
                                        aria-hidden="true"
                                        className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-page)] text-xl font-extrabold text-[var(--color-text-secondary)]"
                                    >
                                        {brand.name.slice(0, 1).toUpperCase()}
                                    </span>
                                )}
                            </span>

                            <span className="text-sm font-bold text-[var(--color-text-strong)]">
                                {brand.name}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
