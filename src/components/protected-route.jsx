import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "./center-box";

/**
 * ProtectedRoute - Route wrapper that requires authentication
 * Redirects to login if not authenticated, shows loading state during auth check
 */
export default function ProtectedRoute() {
    const { isAuthed, loading } = useAuth();
    const location = useLocation();

    if (loading) return <CenterBox>Loading...</CenterBox>;

    return isAuthed ? (
        <Outlet />
    ) : (
        <Navigate to="/login" replace state={{ from: location }} />
    );
}
