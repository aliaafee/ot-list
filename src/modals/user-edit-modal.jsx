import { useState } from "react";
import { UserCogIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";

function UserEditModal({ user, onSave, onCancel, loading = false, errors = {} }) {
    const [formData, setFormData] = useState({
        name: user.name || "",
        role: user.role || "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(user.id, formData);
    };

    return (
        <ModalWindow
            title="Edit User"
            okLabel="Update User"
            cancelLabel="Cancel"
            onOk={handleSubmit}
            onCancel={onCancel}
            icon={<UserCogIcon width={24} height={24} />}
            iconColor="bg-green-100 text-green-600"
            okColor="bg-green-600 hover:bg-green-500"
            loading={loading}
        >
            <div className="space-y-4 py-2">
                <div>
                    <FormField
                        label="Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter user's full name"
                        required
                    />
                    {errors.name && (
                        <p className="text-sm text-red-600 mt-1">
                            {errors.name.message}
                        </p>
                    )}
                </div>

                <div>
                    <FormField
                        label="Role"
                        name="role"
                        type="select"
                        value={formData.role}
                        onChange={handleChange}
                        required
                    >
                        <option value="">Select role...</option>
                        <option value="admin">Admin</option>
                        <option value="doctor">Doctor</option>
                        <option value="receptionist">Receptionist</option>
                    </FormField>
                    {errors.role && (
                        <p className="text-sm text-red-600 mt-1">
                            {errors.role.message}
                        </p>
                    )}
                </div>
            </div>
        </ModalWindow>
    );
}

export default UserEditModal;
