import { Routes, Route, Navigate } from "react-router";
import ProtectedRoute from "@/components/protected-route";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Test from "./pages/test";
import OperatingLists from "./pages/operating-lists";
import MainLayout from "./pages/main-layout";
import OtListPrint from "./pages/otlist-print";
import Settings from "./pages/settings";
import Patients from "./pages/patients";
import AllProcedures from "./pages/all-procedures";

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
                        element={<Navigate to="/lists" replace />}
                    />
                    <Route path="/lists" element={<OperatingLists />} />
                    <Route
                        path="/lists/:otDayId"
                        element={<OperatingLists />}
                    />

                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/patients" element={<Patients />} />
                    <Route path="/procedures" element={<AllProcedures />} />
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
