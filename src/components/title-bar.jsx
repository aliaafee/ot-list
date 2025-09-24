import { useAuth } from "@/contexts/auth-context";
import { UserIcon } from "lucide-react";

function TitleBar() {
    const { user, logout } = useAuth();

    return (
        <div className="sticky top-0 h-8 bg-gray-200 p-1 text-right flex items-center gap-1">
            <div className="grow"></div>
            <UserIcon width={16} height={16} />
            <span className="text-shadow-amber-300">
                {user?.name || user?.email} [<a onClick={logout}>Logout</a>]
            </span>
        </div>
    );
}

export default TitleBar;
