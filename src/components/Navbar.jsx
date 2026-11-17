
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Menu, X } from "lucide-react";

function NavLink({ to, children }) {
    return (
        <Link
            to={to}
            className="group relative py-2 transition-colors duration-300 hover:text-blue-500"
        >
            {children}

            <span className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-blue-500 transition-all duration-300 ease-out group-hover:w-full" />
        </Link>
    );
}


function getCartCount() {
    try {
        const saved = JSON.parse(localStorage.getItem("cart") || "[]");
        return Array.isArray(saved)
            ? saved.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
            : 0;
    } catch {
        return 0;
    }
}

export default function Navbar() {
    const [cartCount, setCartCount] = useState(getCartCount);

    useEffect(() => {
        const update = () => setCartCount(getCartCount());

        window.addEventListener("cart-updated", update);
        window.addEventListener("storage", update);

        return () => {
            window.removeEventListener("cart-updated", update);
            window.removeEventListener("storage", update);
        };
    }, []);

    const [menuOpen, setMenuOpen] = useState(false);
    const closeMenu = () => setMenuOpen(false);

    return (
        <header className="sticky top-0 z-50 bg-white text-slate-800 shadow-sm">
            {/* Announcement Bar */}
            <div className="bg-[#111827] px-3 py-1.5 text-center text-[10px] tracking-wide text-white sm:text-xs">
                Free Shipping on Orders Over 750 EGP | 30-Day Returns
            </div>

            {/* Main Navigation */}
            <nav className="mx-auto flex min-h-17 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
                {/* Logo */}
                <Link
                    to="/"
                    className="shrink-0 text-2xl font-extrabold tracking-tight transition-transform duration-300 hover:scale-[1.03] sm:text-3xl"
                    aria-label="Kids and Co Home"
                >
                    Kids <span className="text-blue-500">&amp;</span>{" "}
                    Co<span className="text-pink-400">.</span>
                </Link>

                {/* Main Links */}
                <div className="hidden items-center gap-7 text-sm font-medium md:flex">
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/products">Shop</NavLink>
                    <a
                        href="/#store-benefits"
                        className="group relative py-2 transition-colors duration-300 hover:text-blue-500"
                    >
                        Our Services
                        <span className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-blue-500 transition-all duration-300 ease-out group-hover:w-full" />
                    </a>
                    <NavLink to="/contact">Contact</NavLink>
                    <NavLink to="/track-order">Track Order</NavLink>
                </div>

                {/* Action Icons */}
                <div className="flex shrink-0 items-center gap-4 sm:gap-5">
                    {/* Mobile menu toggle */}
                    <button
                        type="button"
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                        aria-expanded={menuOpen}
                        aria-controls="mobile-menu"
                        className="transition-colors hover:text-blue-500 md:hidden"
                    >
                        {menuOpen ? <X size={22} /> : <Menu size={22} />}
                    </button>

                    {/* Search */}
                    <Link
                        to="/products"
                        aria-label="Search products"
                        title="Search"
                        className="transition-all duration-300 hover:scale-110 hover:text-blue-500"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <circle cx="10.8" cy="10.8" r="6.3" />
                            <path d="m15.5 15.5 4.2 4.2" />
                        </svg>
                    </Link>


                    {/* Cart */}
                    <Link
                        to="/cart"
                        aria-label="Shopping cart"
                        title="Cart"
                        className="relative transition-all duration-300 hover:scale-110 hover:text-blue-500"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.7"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        >
                            <path d="M3 4h2l2.3 11.2a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 2-1.6L21 8H6" />
                            <circle cx="10" cy="20" r="1" />
                            <circle cx="18" cy="20" r="1" />
                        </svg>

                        {cartCount > 0 && (
                            <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-pink-500 px-1 text-[10px] font-bold leading-none text-white">
                                {cartCount > 99 ? "99+" : cartCount}
                            </span>
                        )}
                    </Link>
                </div>
            </nav>

            {/* Mobile menu */}
            {menuOpen && (
                <div
                    id="mobile-menu"
                    className="border-t border-slate-100 bg-white px-4 py-3 md:hidden"
                >
                    <ul className="flex flex-col text-sm font-semibold">
                        {[
                            { to: "/", label: "Home" },
                            { to: "/products", label: "Shop" },
                            { to: "/#store-benefits", label: "Our Services" },
                            { to: "/contact", label: "Contact" },
                            { to: "/track-order", label: "Track Order" },
                        ].map((item) => (
                            <li key={item.label}>
                                <Link
                                    to={item.to}
                                    onClick={closeMenu}
                                    className="block rounded-lg px-3 py-3 transition-colors hover:bg-slate-50 hover:text-blue-500"
                                >
                                    {item.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </header>
    );
}
