
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { getStoreBrands } from "../../../services/brandService";

export default function BrandsSection() {
    const [brands, setBrands] = useState([]);

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const data = await getStoreBrands();
                if (active) setBrands(data);
            } catch (err) {
                console.error(err);
            }
        }

        load();

        return () => {
            active = false;
        };
    }, []);

    if (brands.length === 0) return null;

    const renderBrands = (isDuplicate = false) => (
        <ul
            className="flex shrink-0 items-stretch gap-4 pr-4"
            aria-hidden={isDuplicate ? "true" : undefined}
        >
            {brands.map((brand) => (
                <li
                    key={`${isDuplicate ? "duplicate-" : ""}${brand.id}`}
                    className="w-36 shrink-0 sm:w-44"
                >
                    <Link
                        to={`/products?brand=${brand.slug}`}
                        tabIndex={isDuplicate ? -1 : undefined}
                        className="group flex h-36 flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 text-center transition duration-300 hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:shadow-lg sm:h-40"
                    >
                        <span className="flex h-16 w-full items-center justify-center sm:h-20">
                            {brand.logo_url ? (
                                <img
                                    src={brand.logo_url}
                                    alt={isDuplicate ? "" : brand.name}
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
    );

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

            <div className="brands-marquee overflow-hidden">
                <div className="brands-marquee-track flex w-max">
                    {renderBrands()}
                    {renderBrands(true)}
                </div>
            </div>

            <style>{`
                .brands-marquee-track {
                    animation: brands-scroll-right 10s linear infinite;
                    will-change: transform;
                }

                @keyframes brands-scroll-right {
                    from {
                        transform: translateX(-50%);
                    }
                    to {
                        transform: translateX(0);
                    }
                }

                .brands-marquee:hover .brands-marquee-track,
                .brands-marquee:focus-within .brands-marquee-track {
                    animation-play-state: paused;
                }

                @media (prefers-reduced-motion: reduce) {
                    .brands-marquee-track {
                        animation: none;
                    }

                    .brands-marquee {
                        overflow-x: auto;
                    }
                }
            `}</style>
        </section>
    );
}
