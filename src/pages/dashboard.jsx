import { Link } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";
import { ChevronLeft, ChevronLeftIcon } from "lucide-react";
import FormField from "@/components/form-field";
import BodyLayout from "@/components/body-layout";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";

export default function Dashboard() {
    const { user, logout } = useAuth();

    const handleBack = () => {};

    const Tools = () => (
        <ToolBar>
            <ToolBarButton title="Home" disabled={false} onClick={handleBack}>
                <ChevronLeftIcon width={16} height={16} />
                <ToolBarButtonLabel>Back</ToolBarButtonLabel>
            </ToolBarButton>
        </ToolBar>
    );

    return (
        <BodyLayout header={<Tools />}>
            <h1 className="mt-4 text-xl">Dashboard: {user?.name} </h1>
            <h2 className="mt-4 text-lg">Email</h2>
            <p className="mt-4">{user.email}</p>
            <h2 className="mt-4 text-lg">Change Password</h2>
            <div className="bg-gray-100 p-2 rounded-lg w-full sm:max-w-xs flex flex-col items-center">
                <FormField label={"Current Password"} className="w-full" />
                <FormField label={"New Password"} className="w-full" />
                <FormField label={"Confirm Password"} className="w-full" />
                <button
                    type="button"
                    className="mt-4 mb-2 inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs sm:w-auto bg-blue-600 hover:bg-blue-500"
                >
                    Save
                </button>
            </div>
        </BodyLayout>
    );
}
