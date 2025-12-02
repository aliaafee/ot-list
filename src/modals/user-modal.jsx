import { useAuth } from "@/contexts/auth-context";
import { twMerge } from "tailwind-merge";
import ModalContainer from "./modal-container";
import { Link } from "react-router";

function UserModal({ userIcon, onClose }) {
    const { user, logout } = useAuth();

    return (
        <ModalContainer className={"sm:max-w-2xs"} onClickOutside={onClose}>
            <div className="bg-gray-100 px-4 pt-4 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-center">{userIcon}</div>

                <div className="text-center text-xl">{user?.name}</div>
                <div className="text-center text-xs text-gray-600">
                    {user?.role}
                </div>
                <div className="text-center">{user?.email}</div>
            </div>
            <div className="bg-gray-200 px-4 py-3 ">
                <button
                    type="button"
                    className="bg-red-600 hover:bg-red-500 cursor-pointer inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs"
                    onClick={() => logout()}
                >
                    Logout
                </button>
                <Link
                    to="/dashboard"
                    className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 "
                    onClick={() => onClose()}
                >
                    Dashboard
                </Link>
            </div>
        </ModalContainer>
    );
}

export default UserModal;
