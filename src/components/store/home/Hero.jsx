const features = [
    {
        label: ["Secure", "Shopping"],
        icon: (
            <path d="M12 3l8 3v6c0 4.5-3.2 8.2-8 9-4.8-.8-8-4.5-8-9V6l8-3z" />
        ),
    },
    {
        label: ["Fast", "Delivery"],
        icon: (
            <>
                <path d="M3 7h11v9H3z" />
                <path d="M14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="1.8" />
                <circle cx="17" cy="18" r="1.8" />
            </>
        ),
    },
    {
        label: ["Premium", "Quality"],
        icon: (
            <>
                <circle cx="12" cy="9" r="5" />
                <path d="M9 13.5L7.5 21l4.5-2.5 4.5 2.5L15 13.5" />
            </>
        ),
    },
    {
        label: ["24/7", "Support"],
        icon: (
            <>
                <path d="M4 14v-2a8 8 0 0116 0v2" />
                <rect x="3" y="13" width="4" height="6" rx="1.5" />
                <rect x="17" y="13" width="4" height="6" rx="1.5" />
                <path d="M19 19c0 1.5-2 2.5-5 2.5" />
            </>
        ),
    },
];

export default function Hero() {
    return (
        <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:pt-8">
            <div className="relative isolate min-h-140 overflow-hidden rounded-2xl bg-black sm:min-h-130 lg:min-h-140">
                {/* Hero image (logo + shoes only, texts & buttons are in code) */}
                <img
                    src="/hero-bg.png"
                    alt="M.STEP men's shoes"
                    className="absolute inset-0 -z-20 h-full w-full object-cover object-[72%_25%]  "
                />

                {/* Overlay to keep the text readable on small screens */}
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-black/80 via-black/40 to-transparent lg:from-black/30 lg:via-transparent" />

                <div className="flex min-h-140 items-center px-6 pb-10 pt-28 sm:min-h-130 sm:px-12 lg:min-h-140 lg:px-16 lg:pt-32">
                    <div className="max-w-xl">

                        <h1 className="text-4xl mb-2 font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
                            Step Up Your
                            <span className="mt-1 block bg-linear-to-b from-white to-neutral-500 bg-clip-text text-transparent">
                                Style.
                            </span>
                        </h1>

                        <p className="mt-4 max-w-md text-sm leading-7 text-white/90 sm:text-base sm:leading-8">
                            Premium men&apos;s shoes for every occasion.
                            <br />
                            Comfort. Quality. Style.
                        </p>

                        <div className="mt-6 flex flex-wrap gap-4">
                            <a
                                href="/products"
                                className="group inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-bold text-black shadow-md transition duration-300 hover:-translate-y-1 hover:bg-neutral-200 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-white/40"
                            >
                                Shop Now
                                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                                    →
                                </span>
                            </a>

                            <a
                                href="/products"
                                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/80 bg-transparent px-7 py-3 text-sm font-bold text-white! transition duration-300 hover:bg-neutral-200 hover:text-black! focus:outline-none focus:ring-4 focus:ring-white/40"
                            >
                                Explore Collection
                            </a>
                        </div>

                        {/* Trust badges */}
                        <div className="mt-8 flex flex-wrap items-center gap-y-4 text-xs font-medium text-white/90 sm:text-sm">
                            {features.map((f, i) => (
                                <div
                                    key={f.label[0]}
                                    className={`flex items-center gap-2 pr-4 ${
                                        i !== features.length - 1
                                            ? "mr-4 border-r border-white/30"
                                            : ""
                                    }`}
                                >
                                    <svg
                                        viewBox="0 0 24 24"
                                        className="h-6 w-6 shrink-0 fill-none stroke-white"
                                        strokeWidth="1.5"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        aria-hidden="true"
                                    >
                                        {f.icon}
                                    </svg>
                                    <span className="leading-tight">
                                        {f.label[0]}
                                        <br />
                                        {f.label[1]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}