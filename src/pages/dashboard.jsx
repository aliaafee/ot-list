import { useState } from "react";
import { Link } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";
import { ChevronLeft } from "lucide-react";
import FormField from "@/components/form-field";
import BodyLayout from "@/components/body-layout";
import { pb } from "@/lib/pb";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
    ToolBarLink,
} from "@/components/toolbar";
import { LoadingSpinner } from "@/components/loading-spinner";
import ChangePasswordForm from "@/forms/change-password-form";

export default function Dashboard() {
    const [passwordValues, setPasswordValues] = useState({
        current: "",
        new: "",
        confirm: "",
    });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [updatingPassword, setUpdatingPassword] = useState(false);

    const { user, logout } = useAuth();

    const handleUpdatePassword = async () => {
        setPasswordErrors({});
        setUpdatingPassword(true);

        try {
            await pb.collection("users").update(user.id, {
                oldPassword: passwordValues.current,
                password: passwordValues.new,
                passwordConfirm: passwordValues.confirm,
            });

            alert("Password updated successfully. Login again.");
            setPasswordValues({ current: "", new: "", confirm: "" });
            console.log("Logging out user after password change");
            logout();
        } catch (err) {
            console.error(err.response?.data);
            setPasswordErrors(err.response?.data || {});
        } finally {
            setUpdatingPassword(false);
        }
    };

    const Tools = () => (
        <ToolBar>
            <ToolBarLink title="Home" to="/">
                <ChevronLeft width={16} height={16} />
                <ToolBarButtonLabel>Home</ToolBarButtonLabel>
            </ToolBarLink>
        </ToolBar>
    );

    return (
        <BodyLayout header={<Tools />}>
            <h1 className="mb-2 text-xl">Dashboard: {user?.name} </h1>
            <h2 className="mb-2 text-lg">Email</h2>
            <p className="mb-2">{user.email}</p>
            <h2 className="mb-2 text-lg">Change Password</h2>
            <div className="bg-gray-100 p-2 rounded-lg w-full sm:max-w-xs flex flex-col items-center">
                <ChangePasswordForm
                    value={passwordValues}
                    onChange={setPasswordValues}
                    errors={passwordErrors}
                />
                <div className="sm:flex sm:flex-row-reverse col-span-full mt-3">
                    <button
                        type="button"
                        onClick={handleUpdatePassword}
                        className="inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs  sm:ml-3 sm:w-auto bg-blue-600 hover:bg-blue-500"
                    >
                        {updatingPassword && (
                            <LoadingSpinner size="small" className={"mr-2"} />
                        )}
                        Save
                    </button>
                </div>
            </div>
        </BodyLayout>
    );
}
