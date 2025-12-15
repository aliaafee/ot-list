import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "./center-box";

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
