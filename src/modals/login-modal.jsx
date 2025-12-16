import { useAuth } from "@/contexts/auth-context";
import ModalContainer from "./modal-container";
import FormField from "@/components/form-field";
import Button from "@/components/button";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { LoadingSpinner } from "@/components/loading-spinner";
import { backendUrl } from "@/lib/pb";
import Logo from "@/components/logo";

function LoginModal({}) {
    const { login, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [err, setErr] = useState("");
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    async function onSubmit(e) {
        e.preventDefault();
        setErr("");
        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (e) {
            console.log("Login failed", e);
            setErr(e?.originalError?.message || e?.message || "Login failed");
        }
    }

    return (
        <ModalContainer className={"sm:max-w-xs"}>
            <form onSubmit={onSubmit}>
                <div className="bg-gray-300 px-4 pt-4 pb-4 sm:p-6 sm:pb-4 flex items-center justify-center">
                    <Logo />
                </div>
                <div className="p-4 flex flex-col gap-4">
                    <FormField
                        label={"Email"}
                        name={"email"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        type="email"
                        disabled={loading}
                    />
                    <FormField
                        label={"Password"}
                        name={"password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        type="password"
                        disabled={loading}
                    />
                    {!!err && (
                        <div className="text-xs text-red-500 text-center">
                            {err}
                        </div>
                    )}
                </div>
                {!!backendUrl && (
                    <div className="px-4 pb-2 text-xs text-gray-600 text-center">
                        Backend: {backendUrl}
                    </div>
                )}
                <div className="bg-gray-200 px-4 py-3 ">
                    <Button
                        type="submit"
                        fullWidth
                        disabled={loading}
                        loading={loading}
                        className="gap-2"
                    >
                        Login
                    </Button>
                </div>
            </form>
        </ModalContainer>
    );
}

export default LoginModal;
