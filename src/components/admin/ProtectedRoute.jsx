import { Navigate, useLocation } from "react-router";
import useAuth from "../../hooks/useAuth";

export default function ProtectedRoute({ children }) {
    const { session, isAdmin, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div
                dir="rtl"
                className="flex min-h-screen items-center justify-center bg-[var(--color-page)] text-sm text-[var(--color-muted)]"
            >
                جاري التحقق من الصلاحيات...
            </div>
        );
    }

    if (!session || !isAdmin) {
        return (
            <Navigate
                to="/admin/login"
                replace
                state={{ from: location.pathname }}
            />
        );
    }

    return children;
}
