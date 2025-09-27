import { Routes, Route } from "react-router";
import ProtectedRoute from "@/components/protected-route";
import Login from "@/pages/login";
import Home from "@/pages/home";
import Dashboard from "@/pages/dashboard";
import Register from "@/pages/register";
import Test from "./pages/test";
import Procedures from "./pages/procedures";

export default function App() {
    return (
        <Routes>
            {/* Public */}
            <Route path="/login" element={<Login />} />

            <Route path="/test" element={<Test />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
                {/* <Route path="/" element={<Home />} /> */}
                <Route path="/" element={<Procedures />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/register" element={<Register />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Login />} />
        </Routes>
    );
}
