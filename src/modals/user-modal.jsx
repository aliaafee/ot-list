import { useAuth } from "@/contexts/auth-context";
import Button from "@/components/button";
import ButtonLink from "@/components/button-link";
import ModalContainer from "./modal-container";
import { RoleLabels } from "@/utils/labels";

/**
 * UserModal - Modal displaying current user information and actions
 * @param {React.ReactNode} userIcon - Icon element to display for the user
 * @param {Function} onClose - Callback when modal is closed
 */
function UserModal({ userIcon, onClose }) {
    const { user, logout } = useAuth();

    return (
        <ModalContainer className={"sm:max-w-2xs"} onClickOutside={onClose}>
            <div className="bg-gray-100 px-4 pt-4 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-center">{userIcon}</div>

                <div className="text-center text-xl">{user?.name}</div>
                <div className="text-center text-xs text-gray-600">
                    {RoleLabels?.[user?.role] || user?.role}
                </div>
                <div className="text-center">{user?.email}</div>
            </div>
            <div className="bg-gray-200 px-4 py-3 ">
                <Button variant="danger" fullWidth onClick={() => logout()}>
                    Logout
                </Button>
                <ButtonLink
                    to="/dashboard"
                    variant="secondary"
                    fullWidth
                    className="mt-3"
                    onClick={() => onClose()}
                >
                    Dashboard
                </ButtonLink>
            </div>
        </ModalContainer>
    );
}

export default UserModal;
