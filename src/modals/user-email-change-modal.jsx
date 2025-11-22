import { useState } from "react";
import { MailIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";

function UserEmailChangeModal({ user, onSave, onCancel, loading = false, errors = {} }) {
    const [newEmail, setNewEmail] = useState("");

    const handleSubmit = () => {
        onSave(user.id, newEmail);
    };

    return (
        <ModalWindow
            title="Change User Email"
            okLabel="Request Email Change"
            cancelLabel="Cancel"
            onOk={handleSubmit}
            onCancel={onCancel}
            icon={<MailIcon width={24} height={24} />}
            iconColor="bg-yellow-100 text-yellow-600"
            okColor="bg-yellow-600 hover:bg-yellow-500"
            loading={loading}
        >
            <div className="space-y-4 py-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        User
                    </label>
                    <div className="px-2 py-1 bg-gray-100 rounded border border-gray-300">
                        <div className="font-semibold">{user.name}</div>
                        <div className="text-sm text-gray-600">{user.email}</div>
                    </div>
                </div>

                <div>
                    <FormField
                        label="New Email Address"
                        name="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter new email address"
                        required
                    />
                    {errors.newEmail && (
                        <p className="text-sm text-red-600 mt-1">
                            {errors.newEmail.message}
                        </p>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                    <strong>Note:</strong> This will send a confirmation email to the new address. 
                    The user must confirm the change before it takes effect.
                </div>
            </div>
        </ModalWindow>
    );
}

export default UserEmailChangeModal;
