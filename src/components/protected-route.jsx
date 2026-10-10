import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import { useAppSettingsSettled } from "@/lib/app-settings";
import { LoadingSpinnerFull } from "./loading-spinner";

/**
 * ProtectedRoute - Route wrapper that requires authentication
 * Redirects to login if not authenticated, shows loading state during auth check
 */
export default function ProtectedRoute() {
    const { isAuthed, loading } = useAuth();
    const location = useLocation();
    // Loaded at sign-in by the auth context. Held back until they are here so
    // that no page's first query or render asks what day it is too early.
    const settingsSettled = useAppSettingsSettled();

    if (loading || (isAuthed && !settingsSettled)) return <LoadingSpinnerFull />;

    return isAuthed ? (
        <Outlet />
    ) : (
        <Navigate to="/login" replace state={{ from: location }} />
    );
}
