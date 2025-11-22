import { useState } from "react";
import { UserPlusIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";

function UserFormModal({ onSave, onCancel, loading = false, errors = {} }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        role: "",
        password: "",
        passwordConfirm: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = () => {
        onSave(formData);
    };

    return (
        <ModalWindow
            title="Add New User"
            okLabel="Create User"
            cancelLabel="Cancel"
            onOk={handleSubmit}
            onCancel={onCancel}
            icon={<UserPlusIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600 hover:bg-blue-500"
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
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="user@example.com"
                        required
                    />
                    {errors.email && (
                        <p className="text-sm text-red-600 mt-1">
                            {errors.email.message}
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

                <div>
                    <FormField
                        label="Password"
                        name="password"
                        type="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Enter password"
                        required
                    />
                    {errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                            {errors.password.message}
                        </p>
                    )}
                </div>

                <div>
                    <FormField
                        label="Confirm Password"
                        name="passwordConfirm"
                        type="password"
                        value={formData.passwordConfirm}
                        onChange={handleChange}
                        placeholder="Confirm password"
                        required
                    />
                    {errors.passwordConfirm && (
                        <p className="text-sm text-red-600 mt-1">
                            {errors.passwordConfirm.message}
                        </p>
                    )}
                </div>
            </div>
        </ModalWindow>
    );
}

export default UserFormModal;
