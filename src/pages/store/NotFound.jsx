import { Link } from "react-router";

export default function NotFound() {
    return (
        <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
            <p className="text-7xl font-extrabold tracking-tight text-blue-500 sm:text-8xl">
                404<span className="text-pink-400">.</span>
            </p>

            <h1 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">
                We can't find that page
            </h1>

            <p className="mt-3 text-sm leading-7 text-slate-500 sm:text-base">
                The link may be broken or the page may have moved. Head back to
                the shop to keep browsing.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                    to="/"
                    className="rounded-full bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-500"
                >
                    Back to home
                </Link>
                <Link
                    to="/products"
                    className="rounded-full border border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                >
                    Shop all products
                </Link>
            </div>
        </section>
    );
}
