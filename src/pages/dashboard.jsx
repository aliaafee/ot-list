import { Link } from "react-router";
import { useAuth } from "@/contexts/auth-context";
import CenterBox from "@/components/center-box";
import { ChevronLeft } from "lucide-react";
import FormField from "@/components/form-field";

export default function Dashboard() {
    const { user, logout } = useAuth();

    return (
        <div className="w-full sm:max-w-xl bg-white mx-auto mt-16 sm:mt-24 lg:mt-8 rounded-lg p-4">
            <div>
                <Link
                    to="/"
                    className="flex  items-center gap-2 hover:underline"
                >
                    <ChevronLeft width={16} height={16} />
                    Home
                </Link>
            </div>
            <h1 className="mt-4 text-xl">Dashboard: {user?.name} </h1>
            <h2 className="mt-4 text-lg">Email</h2>
            <p className="mt-4">{user.email}</p>
            <h2 className="mt-4 text-lg">Change Password</h2>
            <div className="bg-gray-100 p-2 rounded-lg w-full sm:max-w-xs flex flex-col items-center mx-auto">
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
        </div>
    );
}
