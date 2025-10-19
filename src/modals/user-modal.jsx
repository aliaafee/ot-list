import ModalContainer from "./modal-container";

function UserModal({ user, userIcon, onCancel }) {
    return (
        <ModalContainer className={"sm:max-w-2xs"} onClickOutside={onCancel}>
            <div className="bg-gray-100 px-4 pt-4 pb-4 sm:p-6 sm:pb-4">
                <div className="flex justify-center">{userIcon}</div>

                <div className="text-center text-xl">{user?.name}</div>
                <div className="text-center">{user?.email}</div>
            </div>
        </ModalContainer>
    );
}

export default UserModal;
