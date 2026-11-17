import { useState } from "react";
import { Navigate, useLocation } from "react-router";
import useAuth from "../../hooks/useAuth";

function getErrorMessage(error) {
    const message = String(error?.message ?? "");

    if (message.toLowerCase().includes("invalid login credentials")) {
        return "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
    }

    if (message.toLowerCase().includes("email not confirmed")) {
        return "لازم تأكد البريد الإلكتروني الأول.";
    }

    return "تعذر تسجيل الدخول. حاول مرة تانية.";
}

export default function Login() {
    const { session, isAdmin, loading, signIn, signOut } = useAuth();
    const location = useLocation();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");

    const redirectTo =
        typeof location.state?.from === "string" &&
        location.state.from.startsWith("/admin")
            ? location.state.from
            : "/admin";

    if (!loading && session && isAdmin) {
        return <Navigate to={redirectTo} replace />;
    }

    async function handleSubmit(event) {
        event.preventDefault();
        setError("");
        setSubmitting(true);

        try {
            await signIn(email, password);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }

    const signedInWithoutAccess = !loading && session && !isAdmin;

    return (
        <div
            dir="rtl"
            className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10"
        >
            <div className="w-full max-w-sm">
                <p
                    dir="ltr"
                    className="mb-6 text-center text-3xl font-extrabold tracking-tight text-[#172b45]"
                >
                    Kids <span className="text-blue-500">&amp;</span> Co
                    <span className="text-pink-400">.</span>
                </p>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-slate-900">
                        تسجيل دخول الإدارة
                    </h1>

                    {signedInWithoutAccess ? (
                        <div className="mt-4">
                            <p
                                role="alert"
                                className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900"
                            >
                                الحساب{" "}
                                <span dir="ltr" className="font-semibold">
                                    {session.user.email}
                                </span>{" "}
                                مش مضاف كأدمن. اطلب من صاحب المتجر يضيفه، أو
                                سجل بحساب تاني.
                            </p>

                            <button
                                type="button"
                                onClick={signOut}
                                className="mt-4 w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div>
                                <label
                                    htmlFor="admin-email"
                                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                                >
                                    البريد الإلكتروني
                                </label>
                                <input
                                    id="admin-email"
                                    type="email"
                                    dir="ltr"
                                    required
                                    autoComplete="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-start text-sm"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="admin-password"
                                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                                >
                                    كلمة المرور
                                </label>
                                <input
                                    id="admin-password"
                                    type="password"
                                    dir="ltr"
                                    required
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-start text-sm"
                                />
                            </div>

                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || loading}
                                className="w-full rounded-lg bg-[#172b45] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#223d5f] disabled:opacity-60"
                            >
                                {submitting ? "جاري الدخول..." : "تسجيل الدخول"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
