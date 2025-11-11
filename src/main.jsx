import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import "./index.css";
import App from "@/app.jsx";
import { AuthProvider } from "@/contexts/auth-context";
import { ProcedureListProvider } from "./contexts/procedure-list-context";
import ErrorBoundary from "./components/error-boundary";

createRoot(document.getElementById("root")).render(
    // <StrictMode>
    <ErrorBoundary>
        <BrowserRouter>
            <AuthProvider>
                <ProcedureListProvider>
                    <App />
                </ProcedureListProvider>
            </AuthProvider>
        </BrowserRouter>
    </ErrorBoundary>
    // </StrictMode>
);
