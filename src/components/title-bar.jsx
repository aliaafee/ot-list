import { useAuth } from "@/contexts/auth-context";
import ModalWindow from "@/modals/modal-window";
import UserModal from "@/modals/user-modal";
import { UserColours } from "@/utils/colours";
import { UserIcon } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

function TitleBar() {
    const { user, logout } = useAuth();
    const [showDetails, setShowDetails] = useState(false);

    return (
        <>
            <div className="fixed lg:static w-full top-0 h-16 min-h-16 bg-gray-300 p-1 text-right flex items-center justify-center gap-1 flex-col pr-4">
                {/* <div className="grow"></div> */}
                <div className="flex w-full">
                    <div className="grow"></div>
                    <div
                        className={twMerge(
                            "w-10 h-10 rounded-full bg-amber-400 flex justify-center items-center cursor-pointer hover:outline-3 outline-gray-400",
                            UserColours[user?.name.length % UserColours.length]
                        )}
                        title="{user?.name || user?.email}"
                        onClick={() => setShowDetails(true)}
                    >
                        <div className="text-2xl text-black/60">
                            {user?.name[0]}
                        </div>
                    </div>
                </div>
            </div>
            {showDetails && (
                <UserModal
                    user={user}
                    userIcon={
                        <div
                            className={twMerge(
                                "w-10 h-10 rounded-full bg-amber-400 flex justify-center items-center cursor-pointer",
                                UserColours[
                                    user?.name.length % UserColours.length
                                ]
                            )}
                        >
                            <div className="text-2xl text-black/60">
                                {user?.name[0]}
                            </div>
                        </div>
                    }
                    onCancel={() => setShowDetails(false)}
                />
            )}
            {/* {showDetails && (
                <ModalWindow
                    title={`${user?.name || user?.email}`}
                    showButtons={true}
                    icon={
                        <div
                            className={twMerge(
                                "w-10 h-10 rounded-full bg-amber-400 flex justify-center items-center cursor-pointer",
                                UserColours[
                                    user?.name.length % UserColours.length
                                ]
                            )}
                        >
                            <div className="text-2xl text-black/60">
                                {user?.name[0]}
                            </div>
                        </div>
                    }
                    iconColor=""
                    okLabel="Logout"
                    cancelLabel="Cancel"
                    onOk={logout}
                    onCancel={() => setShowDetails(false)}
                >
                    <p>Would you like to logout?</p>
                </ModalWindow>
            )} */}
        </>
    );
}

export default TitleBar;
