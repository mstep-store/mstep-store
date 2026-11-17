
import { Link } from "react-router";
import { socialLinks } from "../config/store";

const shopLinks = [
    { label: "All Products", to: "/products" },
    { label: "Boys", to: "/products?category=boys" },
    { label: "Girls", to: "/products?category=girls" },
    { label: "Baby Collection", to: "/products?category=babycollection" },
    { label: "New Arrivals", to: "/products" },
];

const supportLinks = [
    { label: "Contact Us", to: "/contact" },
    { label: "Track Order", to: "/track-order" },
    { label: "Shopping Cart", to: "/cart" },
];

export default function Footer() {
    return (
        <footer className="mt-20 bg-slate-950 text-white">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-5 py-12 sm:grid-cols-3 sm:px-6 lg:grid-cols-4 lg:py-16">
                {/* Brand */}
                <div>
                    <Link
                        to="/"
                        className="inline-block text-3xl font-extrabold tracking-tight transition-opacity hover:opacity-80"
                    >
                        Kids <span className="text-blue-400">&amp;</span> Co
                        <span className="text-pink-400">.</span>
                    </Link>

                    <p className="mt-4 max-w-xs text-sm leading-7 text-slate-400">
                        Little styles, big smiles. Discover comfortable and
                        playful styles made for every little adventure.
                    </p>

                    <div className="mt-5 flex items-center gap-3">
                        {socialLinks.facebook && (
                            <a
                                href={socialLinks.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label="Facebook"
                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors bg-blue-500"
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
                                className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors bg-pink-500"
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
                                    className="text-sm text-slate-400 transition-colors hover:text-blue-400"
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
                                    className="text-sm text-slate-400 transition-colors hover:text-pink-400"
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

                    <p className="mt-4 text-sm leading-6 text-slate-400">
                        Discover our latest arrivals, special offers, and
                        exciting new styles.
                    </p>

                    <Link
                        to="/products"
                        className="mt-5 inline-flex items-center justify-center rounded-full bg-blue-600 px-5 py-3 text-sm font-bold text-white! transition duration-300 hover:-translate-y-0.5 hover:bg-blue-500"
                    >
                        Explore Products
                        <span className="ml-2">→</span>
                    </Link>
                </div>
            </div>

            {/* Copyright */}
            <div className="border-t border-white/10">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-5 text-center text-xs text-slate-500 sm:flex-row sm:px-6 sm:text-sm">
                    <p>
                        © {new Date().getFullYear()} Kids &amp; Co. All rights reserved.
                    </p>

                    <p>
                        Made with{" "}
                        <span className="text-pink-400">♥</span>{" "}
                        for little ones
                    </p>
                </div>
            </div>
        </footer>
    );
}
