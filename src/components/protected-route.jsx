import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "@/contexts/auth-context";

export default function ProtectedRoute() {
  const { isAuthed, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading…</div>;

  return isAuthed ? (
    <Outlet />
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}
