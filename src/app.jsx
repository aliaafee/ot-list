import { Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "@/components/protected-route";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Test from "./pages/test";
import Procedures from "./pages/procedures";
import MainLayout from "./pages/main-layout";
import OtListPrint from "./pages/otlist-print";
import Settings from "./pages/settings";
import Patients from "./pages/patients";

export default function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            <Route path="/test" element={<Test />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
                {/* <Route path="/" element={<Home />} /> */}
                <Route element={<MainLayout />}>
                    <Route
                        path="/"
                        element={<Navigate to="/procedures" replace />}
                    />
                    <Route path="/procedures" element={<Procedures />} />
                    <Route
                        path="/procedures/:otDayId"
                        element={<Procedures />}
                    />

                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/patients" element={<Patients />} />
                </Route>
                <Route
                    path="/procedures/:otDayId/print"
                    element={<OtListPrint />}
                />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Login />} />
        </Routes>
    );
}
