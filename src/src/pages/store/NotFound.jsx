import { Link } from "react-router";

export default function NotFound() {
    return (
        <section className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
            <p className="text-7xl font-extrabold tracking-tight text-[var(--color-primary-hover)] sm:text-8xl">
                404<span className="text-[var(--color-muted)]">.</span>
            </p>

            <h1 className="mt-4 text-2xl font-extrabold text-[var(--color-text-strong)] sm:text-3xl">
                We can&apos;t find that page
            </h1>

            <p className="mt-3 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
                The link may be broken or the page may have moved. Head back to
                the shop to keep browsing.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                    to="/"
                    className="rounded-full bg-[var(--color-primary)] px-6 py-3 text-sm font-bold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)]"
                >
                    Back to home
                </Link>
                <Link
                    to="/products"
                    className="rounded-full border border-[var(--color-border)] px-6 py-3 text-sm font-bold text-[var(--color-text-secondary)] transition hover:border-[var(--color-blue-300)] hover:text-[var(--color-primary)]"
                >
                    Shop all products
                </Link>
            </div>
        </section>
    );
}
