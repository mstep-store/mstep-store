import { Link } from "react-router";

const categories = [
    {
        title: "Boys",
        subtitle: "Everyday little adventures",
        slug: "boys",
        image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS5A6aiZhLdRHcPUnYCDq0G4xeZRC99RR2cldArZohYZA&s=10",
        color: "bg-blue-50",
    },
    {
        title: "Girls",
        subtitle: "Cute styles, happy smiles",
        slug: "girls",
        image:
            "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcREMB7iRsydwm806NaNCJAkiZXsrviDHOEOmjysmi8KSg&s=10",
        color: "bg-pink-50",
    },
    {
        title: "Baby Collection",
        subtitle: "Softness for little ones",
        slug: "babycollection",
        image:
            "https://images.unsplash.com/photo-1519689680058-324335c77eba?auto=format&fit=crop&w=900&q=85",
        color: "bg-amber-50",
    },
];

export default function CategoryGrid() {
    return (
        <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:mt-20">
            <div className="mb-8 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-pink-500 sm:text-sm">
                    Find Their Favorite
                </p>

                <h2 className="mt-2 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    Shop by Category
                </h2>

                <p className="mt-3 text-sm text-slate-500 sm:text-base">
                    Little outfits for every little personality.
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
                                className="absolute inset-0 -z-20 h-full w-full object-center transition duration-700 group-hover:scale-105"
                            />
                        )}

                        <div className="absolute inset-0 -z-10 bg-linear-to-t from-slate-950/75 via-slate-900/10 to-transparent" />

                        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-7">
                            <h3 className="text-2xl font-extrabold">
                                {category.title}
                            </h3>

                            <p className="mt-2 text-sm text-white/85">
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
