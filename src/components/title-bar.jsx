import { useAuth } from "@/contexts/auth-context";
import { UserIcon } from "lucide-react";

function TitleBar() {
    const { user, logout } = useAuth();

    return (
        <div className="sticky top-0 h-16 min-h-16 bg-gray-300 p-1 text-right flex items-center gap-1 flex-col">
            <div className="grow"></div>
            <div className="flex w-full">
                <div className="grow"></div>
                <UserIcon width={16} height={16} />
                <span className="text-sm">
                    {user?.name || user?.email} [<a onClick={logout}>Logout</a>]
                </span>
            </div>
        </div>
    );
}

export default TitleBar;
