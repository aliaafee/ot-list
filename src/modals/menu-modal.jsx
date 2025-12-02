import { useAuth } from "@/contexts/auth-context";
import { twMerge } from "tailwind-merge";
import ModalContainer from "./modal-container";
import { Link } from "react-router";

function MenuModal({ sections, onClose, className }) {
    const { user, logout } = useAuth();

    return (
        <ModalContainer
            className={twMerge("sm:max-w-2xs", className)}
            onClickOutside={onClose}
        >
            <div className="text-center p-4 uppercase text-xs font-medium text-gray-500">
                Menu
            </div>
            <div className="bg-gray-200 px-4 py-3 ">
                {sections.map(({ name, label, link, icon }) => (
                    <Link
                        key={name}
                        to={link}
                        onClick={() => setShowMenu(false)}
                        className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50"
                    >
                        {icon && <span className="mr-2">{icon}</span>}
                        {label}
                    </Link>
                ))}
            </div>
        </ModalContainer>
    );
}

export default MenuModal;
