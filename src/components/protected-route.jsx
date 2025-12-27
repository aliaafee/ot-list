import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { LoadingSpinnerFull } from "./loading-spinner";

/**
 * ProtectedRoute - Route wrapper that requires authentication
 * Redirects to login if not authenticated, shows loading state during auth check
 */
export default function ProtectedRoute() {
    const { isAuthed, loading } = useAuth();
    const location = useLocation();

    if (loading) return <LoadingSpinnerFull />;

    return isAuthed ? (
        <Outlet />
    ) : (
        <Navigate to="/login" replace state={{ from: location }} />
    );
}
