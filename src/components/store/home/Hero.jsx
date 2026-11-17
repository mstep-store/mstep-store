export default function Hero() {
    return (
        <section className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:pt-8">
            <div className="relative isolate min-h-105 overflow-hidden rounded-2xl bg-sky-100 sm:min-h-125 lg:min-h-140">
                {/* Hero image */}
                <img
                    src="https://images.unsplash.com/photo-1516627145497-ae6968895b74?auto=format&fit=crop&w=1800&q=85"
                    alt="Kids clothing collection"
                    className="absolute inset-0 -z-20 h-full w-full object-cover object-center"
                />

                {/* Soft overlay to keep the text readable */}
                <div className="absolute inset-0 -z-10 bg-linear-to-r from-white/95 via-white/70 to-white/5" />

                <div className="flex min-h-105 items-center px-6 py-12 sm:min-h-125 sm:px-12 lg:min-h-140 lg:px-16">
                    <div className="max-w-xl">
                        <span className="mb-5 inline-flex rounded-full bg-pink-100 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-pink-600 sm:text-sm">
                            Little styles, big smiles
                        </span>

                        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                            Little Looks,
                            <span className="mt-1 block text-blue-600">
                                Big Adventures.
                            </span>
                        </h1>

                        <p className="mt-5 max-w-md text-sm leading-7 text-slate-600 sm:text-base sm:leading-8">
                            Discover adorable styles made for every little moment.
                            Comfortable, playful, and ready for their next adventure.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-4">
                            <a
                                href="/products"
                                className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-7 py-3 text-sm font-bold text-white! shadow-md shadow-blue-600/20 transition duration-300 hover:-translate-y-1 hover:bg-blue-700 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-200"
                            >
                                Shop Collection
                                <span className="ml-2 transition-transform duration-300 group-hover:translate-x-1">
                                    →
                                </span>
                            </a>

                            <a
                                href="/products"
                                className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white/80 px-7 py-3 text-sm font-bold text-slate-800 transition duration-300 hover:border-pink-300 hover:bg-pink-50 hover:text-pink-600"
                            >
                                Explore Styles
                            </a>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600 sm:text-sm">
                            <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-blue-500" />
                                Comfy everyday wear
                            </span>
                            <span className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-pink-400" />
                                Made for little ones
                            </span>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-5 right-5 hidden rounded-xl border border-white/70 bg-white/85 px-5 py-3 shadow-lg backdrop-blur-sm sm:block lg:bottom-8 lg:right-8">
                    <p className="text-xs font-medium text-slate-500">
                        Made for little moments
                    </p>
                    <p className="mt-1 text-sm font-extrabold text-slate-900">
                        Love every little look <span className="text-pink-500">♥</span>
                    </p>
                </div>
            </div>
        </section>
    );
}