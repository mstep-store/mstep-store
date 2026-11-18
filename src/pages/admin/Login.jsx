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
            className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4 py-10"
        >
            <div className="w-full max-w-sm">
                <p
                    dir="ltr"
                    className="mb-6 text-center text-3xl font-extrabold tracking-tight text-[var(--color-navy)]"
                >
                    M<span className="text-[var(--color-muted)]">.</span>STEP
                </p>

                <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-sm">
                    <h1 className="text-xl font-bold text-[var(--color-text-strong)]">
                        تسجيل دخول الإدارة
                    </h1>

                    {signedInWithoutAccess ? (
                        <div className="mt-4">
                            <p
                                role="alert"
                                className="rounded-lg bg-[var(--color-warning-bg)] px-3 py-2 text-sm text-[var(--color-warning-text)]"
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
                                className="mt-4 w-full rounded-lg border border-[var(--color-border-strong)] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-page)]"
                            >
                                تسجيل الخروج
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div>
                                <label
                                    htmlFor="admin-email"
                                    className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
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
                                    className="w-full rounded-lg border border-[var(--color-border-strong)] px-3 py-2.5 text-start text-sm"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="admin-password"
                                    className="mb-1.5 block text-sm font-semibold text-[var(--color-text-secondary)]"
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
                                    className="w-full rounded-lg border border-[var(--color-border-strong)] px-3 py-2.5 text-start text-sm"
                                />
                            </div>

                            {error && (
                                <p
                                    role="alert"
                                    className="rounded-lg bg-[var(--color-rose-50)] px-3 py-2 text-sm text-[var(--color-rose-700)]"
                                >
                                    {error}
                                </p>
                            )}

                            <button
                                type="submit"
                                disabled={submitting || loading}
                                className="w-full rounded-lg bg-[var(--color-navy)] px-4 py-2.5 text-sm font-bold text-[var(--color-on-primary)] transition-colors hover:bg-[var(--color-navy-hover)] disabled:opacity-60"
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
