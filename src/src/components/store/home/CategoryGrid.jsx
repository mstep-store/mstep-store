import { Link } from "react-router";

import coachesImage from "../../../../public/Coaches.jpeg";
import bootsImage from "../../../../public/Boots.jpg";
import slippersImage from "../../../../public/slippers.jpg";

const categories = [
    {
        title: "Shoes",
        subtitle: "Comfort for every step",
        slug: "shoes",
        image: coachesImage,
        color: "bg-[var(--color-blue-50)]",
    },
    {
        title: "Boots",
        subtitle: "Built tough, styled sharp",
        slug: "boots",
        image: bootsImage,
        color: "bg-[var(--color-pink-50)]",
    },
    {
        title: "Slippers",
        subtitle: "Relax in everyday comfort",
        slug: "slippers",
        image: slippersImage,
        color: "bg-[var(--color-warning-bg)]",
    },
];

export default function CategoryGrid() {
    return (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20">
            <div className="mb-8 text-center">


                <h2 className="mt-2 text-2xl font-extrabold text-[var(--color-text-strong)] sm:text-3xl">
                    Shop by Category
                </h2>

                <p className="mt-3 text-sm text-[var(--color-muted)] sm:text-base">
                    Sneakers, boots, and slippers for every occasion.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 sm:gap-6">
                {categories.map((category) => (
                    <Link
                        key={category.title}
                        to={
                            category.slug
                                ? `/products?category=${category.slug}`
                                : "/products"
                        }
                        className={`group relative isolate min-h-80 overflow-hidden rounded-2xl ${category.color}`}
                    >
                        {category.image && (
                            <img
                                src={category.image}
                                alt={category.title}
                                loading="lazy"
                                className="absolute inset-0 -z-20 h-full w-full object-cover object-center transition duration-700 group-hover:scale-105"
                            />
                        )}

                        <div className="absolute inset-0 -z-10 bg-linear-to-t from-[var(--color-overlay-strong)] via-[var(--color-overlay-light)] to-transparent" />

                        <div className="absolute inset-x-0 bottom-0 p-6 text-[var(--color-on-primary)] sm:p-7">
                            <h3 className="text-2xl font-extrabold">
                                {category.title}
                            </h3>

                            <p className="mt-2 text-sm text-[var(--color-white-85)]">
                                {category.subtitle}
                            </p>

                            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold">
                                Explore Collection
                                <span className="transition-transform duration-300 group-hover:translate-x-1">
                                    →
                                </span>
                            </span>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}
