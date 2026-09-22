import { Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "@/components/protected-route";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import OperatingLists from "./pages/operating-lists";
import MainLayout from "./pages/main-layout";
import OtListPrint from "./pages/otlist-print";
import Settings from "./pages/settings";
import Patients from "./pages/patients";
import AllProcedures from "./pages/all-procedures";
import NotFound from "./pages/not-found";
import AdminBackups from "./pages/admin-backups";
import SettingsDashboard from "./pages/settings-dashboard";

export default function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            {/* Superuser only, with its own login: deliberately outside the
                app session, so backups can still be reached when nobody can
                sign in to OT List itself. */}
            <Route path="/admin/backups" element={<AdminBackups />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                    <Route path="/home" element={<Home />} />
                    <Route
                        path="/"
                        element={<Navigate to="/lists" replace />}
                    />
                    <Route path="/lists" element={<OperatingLists />} />
                    <Route
                        path="/lists/:otDayId"
                        element={<OperatingLists />}
                    />

                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<SettingsDashboard />} />
                    <Route
                        path="/settings/:page"
                        element={<SettingsDashboard />}
                    />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/procedures" element={<AllProcedures />} />
                </Route>
                <Route path="/lists/:otDayId/print" element={<OtListPrint />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
        </Routes>
    );
}
