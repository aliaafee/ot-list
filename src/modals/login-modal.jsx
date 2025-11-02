import { useAuth } from "@/contexts/auth-context";
import { twMerge } from "tailwind-merge";
import ModalContainer from "./modal-container";
import { Link } from "react-router";
import FormField from "@/components/form-field";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import CenterBox from "@/components/center-box";
import { LoadingSpinner } from "@/components/loading-spinner";

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
                <div className="bg-gray-100 px-4 pt-4 pb-4 sm:p-6 sm:pb-4">
                    <div className="text-center text-xl">Operating Lists</div>
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
                {!!import.meta.env.VITE_PB_BASE_URL && (
                    <div className="px-4 pb-2 text-xs text-gray-600 text-center">
                        Backend: {import.meta.env.VITE_PB_BASE_URL}
                    </div>
                )}
                <div className="bg-gray-200 px-4 py-3 ">
                    <button
                        type="submit"
                        className=" bg-blue-600 hover:bg-blue-500 cursor-pointer inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <>&nbsp;</>
                                <LoadingSpinner size="small" />
                                <>&nbsp;</>
                            </>
                        ) : (
                            "Login"
                        )}
                    </button>
                </div>
            </form>
        </ModalContainer>
    );
}

export default LoginModal;
