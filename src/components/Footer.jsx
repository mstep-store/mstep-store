
import { Link } from "react-router";
import { socialLinks } from "../config/store";

const shopLinks = [
    { label: "All Products", to: "/products" },
    { label: "Shoes", to: "/products?category=shoes" },
    { label: "Boots", to: "/products?category=boots" },
    { label: "Slippers", to: "/products?category=slippers" },
    { label: "New Arrivals", to: "/products" },
];

const supportLinks = [
    { label: "Contact Us", to: "/contact" },
    { label: "Track Order", to: "/track-order" },
    { label: "Shopping Cart", to: "/cart" },
];

export default function Footer() {
    return (
        <footer className="mt-20 bg-black text-(--color-on-primary)">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-5 py-12 sm:grid-cols-3 sm:px-6 lg:grid-cols-4 lg:py-16">
                {/* Brand */}
                <div>
                    <Link
                        to="/"
                        className="inline-block text-3xl font-extrabold transition-opacity hover:opacity-80 tracking-wider"
                    >
                        M<span>.</span>STEP
                    </Link>

                    <p className="mt-4 max-w-xs text-sm leading-7 text-(--color-subtle)">
                        Premium men&apos;s shoes for every occasion. Comfort, quality, and
                        style in every step.
                    </p>

                    <div className="mt-5 flex items-center gap-3">
                        {socialLinks.facebook && (
                            <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors bg-white/10 hover:bg-white/20"
                            >
                                f
                            </a>
                        )}

                        {socialLinks.instagram && (
                            <a
                                href={socialLinks.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Instagram"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors bg-white/10 hover:bg-white/20"
                            >
                                ◎
                            </a>
                        )}
                    </div>
                </div>

                {/* Shop links */}
                <div>
                    <h2 className="text-base font-bold">Shop</h2>

                    <ul className="mt-5 space-y-3">
                        {shopLinks.map((item) => (
                            <li key={item.label}>
                                <Link
                                    to={item.to}
                                    className="text-sm text-(--color-subtle) transition-colors hover:text-white"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Customer support */}
                <div>
                    <h2 className="text-base font-bold">Customer Support</h2>

                    <ul className="mt-5 space-y-3">
                        {supportLinks.map((item) => (
                            <li key={item.label}>
                                <Link
                                    to={item.to}
                                    className="text-sm text-(--color-subtle) transition-colors hover:text-white"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Discover */}
                <div>
                    <h2 className="text-base font-bold">Stay Connected</h2>

                    <p className="mt-4 text-sm leading-6 text-(--color-subtle)">
                        Discover our latest arrivals, special offers, and new styles
                        for every step.
                    </p>

                    <Link
                        to="/products"
                        className="mt-5 inline-flex items-center justify-center rounded-full bg-(--color-primary) px-5 py-3 text-sm font-bold text-(--color-on-primary)! transition duration-300 hover:-translate-y-0.5 hover:bg-(--color-primary-hover)"
                    >
                        Explore Products
                        <span className="ml-2">→</span>
                    </Link>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-(--color-white-10)">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-center text-xs text-(--color-muted) sm:flex-row sm:px-6 sm:text-sm">
                    <p>
                        © {new Date().getFullYear()} M.STEP . All rights reserved.
                    </p>

                    <p>
                        Made with{" "}
                        <span className="text-white">♥</span>{" "}
                        for our customers
                    </p>
                </div>
            </div>
        </footer>
    );
}
