import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router";
import useAuth from "../hooks/useAuth";

const links = [
    { to: "/admin", label: "الرئيسية", end: true },
    { to: "/admin/orders", label: "الطلبات" },
    { to: "/admin/products", label: "المنتجات" },
    { to: "/admin/categories", label: "التصنيفات" },
    { to: "/admin/messages", label: "الرسائل" },
];

function navClass({ isActive }) {
    return [
        "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
        isActive
            ? "bg-white text-black! shadow-md shadow-slate-900/5"
            : "text-white/75 hover:bg-white/10 hover:text-white",
    ].join(" ");
}

export default function AdminLayout() {
    const { user, signOut } = useAuth();
    const [signingOut, setSigningOut] = useState(false);

    async function handleSignOut() {
        setSigningOut(true);

        try {
            await signOut();
        } catch {
            setSigningOut(false);
        }
    }

    return (
        <div dir="rtl" className="min-h-screen bg-slate-50 md:flex">
            <aside className="bg-[#172b45] text-white md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:flex-col">
                <div className="flex items-center justify-between gap-3 px-4 py-4 md:block md:px-5 md:py-6">
                    <Link
                        to="/admin"
                        className="text-xl font-extrabold tracking-tight"
                        dir="ltr"
                    >
                        Kids <span className="text-blue-400">&amp;</span> Co
                        <span className="text-pink-400">.</span>
                    </Link>

                    <p className="hidden text-xs text-white/60 md:mt-1 md:block">
                        لوحة التحكم
                    </p>

                    <Link
                        to="/"
                        className="text-xs text-white/70 hover:text-white md:hidden"
                    >
                        عرض المتجر
                    </Link>
                </div>

                <nav
                    aria-label="التنقل في لوحة التحكم"
                    className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-visible md:pb-0"
                >
                    {links.map((link) => (
                        <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={navClass}
                        >
                            {link.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="hidden border-t border-white/10 p-4 md:block">
                    <Link
                        to="/"
                        className="mb-3 block text-sm text-white/70 hover:text-white"
                    >
                        عرض المتجر
                    </Link>

                    <p
                        dir="ltr"
                        className="mb-3 truncate text-start text-xs text-white/60"
                        title={user?.email}
                    >
                        {user?.email}
                    </p>

                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:opacity-60"
                    >
                        {signingOut ? "جاري الخروج..." : "تسجيل الخروج"}
                    </button>
                </div>
            </aside>

            <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
                <Outlet />

                <div className="mt-8 border-t border-slate-200 pt-4 md:hidden">
                    <button
                        type="button"
                        onClick={handleSignOut}
                        disabled={signingOut}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
                    >
                        {signingOut ? "جاري الخروج..." : "تسجيل الخروج"}
                    </button>
                </div>
            </main>
        </div>
    );
}
