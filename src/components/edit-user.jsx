import { useState, useEffect } from "react";
import { PlusIcon, EditIcon, MailIcon } from "lucide-react";
import { pb } from "@/lib/pb";
import { useAuth } from "@/contexts/auth-context";
import UserFormModal from "@/modals/user-form-modal";
import UserEditModal from "@/modals/user-edit-modal";
import UserEmailChangeModal from "@/modals/user-email-change-modal";

function EditUser() {
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [changingEmailUser, setChangingEmailUser] = useState(null);
    const [userLoading, setUserLoading] = useState(false);
    const [userErrors, setUserErrors] = useState({});

    const { user } = useAuth();

    const fetchUsers = async () => {
        try {
            const gotUsers = await pb.collection("users").getFullList();
            setUsers(gotUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
        }
    };

    const handleSaveUser = async (formData) => {
        setUserLoading(true);
        setUserErrors({});
        try {
            await pb.collection("users").create(formData);
            setShowUserModal(false);
            fetchUsers();
        } catch (err) {
            console.error("Error creating user:", err);
            if (err.response?.data) {
                setUserErrors(err.response.data);
            }
        } finally {
            setUserLoading(false);
        }
    };

    const handleUpdateUser = async (userId, formData) => {
        setUserLoading(true);
        setUserErrors({});
        try {
            await pb.collection("users").update(userId, formData);
            setShowEditModal(false);
            setEditingUser(null);
            fetchUsers();
        } catch (err) {
            console.error("Error updating user:", err);
            if (err.response?.data) {
                setUserErrors(err.response.data);
            }
        } finally {
            setUserLoading(false);
        }
    };

    const handleChangeEmail = async (userId, newEmail) => {
        setUserLoading(true);
        setUserErrors({});
        try {
            await pb.collection("users").requestEmailChange(newEmail);
            setShowEmailChangeModal(false);
            setChangingEmailUser(null);
            alert("Email change request sent! The user must confirm the new email address.");
        } catch (err) {
            console.error("Error requesting email change:", err);
            if (err.response?.data) {
                setUserErrors(err.response.data);
            }
        } finally {
            setUserLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    return (
        <div>
            {user?.role === "admin" && (
                <div className="mb-2 flex justify-end">
                    <button
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-md text-sm cursor-pointer"
                        onClick={() => setShowUserModal(true)}
                    >
                        <PlusIcon size={16} />
                        Add User
                    </button>
                </div>
            )}
            <table className="table-auto w-full text-left">
                <thead className="bg-gray-400">
                    <tr>
                        <th className="px-2 py-1">Name</th>
                        <th className="px-2 py-1">Email</th>
                        <th className="px-2 py-1">Role</th>
                        {user?.role === "admin" && <th className="px-2 py-1 w-24"></th>}
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr key={u.id} className="odd:bg-gray-200 even:bg-gray-300">
                            <td className="px-2 py-1">{u.name}</td>
                            <td className="px-2 py-1">{u.email}</td>
                            <td className="px-2 py-1">{u.role}</td>
                            {user?.role === "admin" && (
                                <td className="px-2 py-1">
                                    <div className="flex gap-1 justify-end">
                                        <button
                                            className="p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
                                            onClick={() => {
                                                setEditingUser(u);
                                                setShowEditModal(true);
                                                setUserErrors({});
                                            }}
                                            title="Edit user name and role"
                                        >
                                            <EditIcon size={16} />
                                        </button>
                                        <button
                                            className="p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
                                            onClick={() => {
                                                setChangingEmailUser(u);
                                                setShowEmailChangeModal(true);
                                                setUserErrors({});
                                            }}
                                            title="Change user email"
                                        >
                                            <MailIcon size={16} />
                                        </button>
                                    </div>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {showUserModal && (
                <UserFormModal
                    onSave={handleSaveUser}
                    onCancel={() => {
                        setShowUserModal(false);
                        setUserErrors({});
                    }}
                    loading={userLoading}
                    errors={userErrors}
                />
            )}
            {showEditModal && editingUser && (
                <UserEditModal
                    user={editingUser}
                    onSave={handleUpdateUser}
                    onCancel={() => {
                        setShowEditModal(false);
                        setEditingUser(null);
                        setUserErrors({});
                    }}
                    loading={userLoading}
                    errors={userErrors}
                />
            )}
            {showEmailChangeModal && changingEmailUser && (
                <UserEmailChangeModal
                    user={changingEmailUser}
                    onSave={handleChangeEmail}
                    onCancel={() => {
                        setShowEmailChangeModal(false);
                        setChangingEmailUser(null);
                        setUserErrors({});
                    }}
                    loading={userLoading}
                    errors={userErrors}
                />
            )}
        </div>
    );
}

export default EditUser;
