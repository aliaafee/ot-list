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
import OperatingRoom from "./pages/operating-room";

export default function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

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

                    <Route path="/or" element={<OperatingRoom />} />

                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/procedures" element={<AllProcedures />} />
                </Route>
                <Route path="/lists/:otDayId/print" element={<OtListPrint />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Login />} />
        </Routes>
    );
}
