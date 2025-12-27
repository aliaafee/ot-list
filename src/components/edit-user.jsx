import { useState, useEffect } from "react";
import { PlusIcon, EditIcon } from "lucide-react";
import Button from "@/components/button";
import { pb } from "@/lib/pb";
import { useAuth } from "@/contexts/auth-context";
import UserFormModal from "@/modals/user-form-modal";
import UserEditModal from "@/modals/user-edit-modal";
import UserEmailChangeModal from "@/modals/user-email-change-modal";
import { twMerge } from "tailwind-merge";
import { RoleLabels } from "@/utils/labels";
import { LoadingSpinnerFull } from "./loading-spinner";

function EditUser() {
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showEmailChangeModal, setShowEmailChangeModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [changingEmailUser, setChangingEmailUser] = useState(null);
    const [listLoading, setListLoading] = useState(false);
    const [userLoading, setUserLoading] = useState(false);
    const [userErrors, setUserErrors] = useState({});

    const { user } = useAuth();

    const fetchUsers = async () => {
        setListLoading(true);
        try {
            const gotUsers = await pb.collection("users").getFullList();
            setUsers(gotUsers);
        } catch (err) {
            console.error("Error fetching users:", err);
        } finally {
            setListLoading(false);
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
            alert(
                "Email change request sent! The user must confirm the new email address."
            );
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
                    <Button
                        className="gap-2"
                        onClick={() => setShowUserModal(true)}
                    >
                        <PlusIcon size={16} />
                        Add User
                    </Button>
                </div>
            )}
            <div
                className={twMerge(
                    "border border-gray-300 rounded-md overflow-x-auto relative",
                    listLoading ? "pointer-events-none" : ""
                )}
            >
                {listLoading && (
                    <LoadingSpinnerFull className="absolute inset-0 w-full h-full" />
                )}
                <table className="text-left table-auto w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Name
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Email
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                Role
                            </th>
                            {user?.role === "admin" && (
                                <th className="px-3 py-2 w-14"></th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                        {listLoading && users.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-3 py-2">
                                    Loading...
                                </td>
                            </tr>
                        )}
                        {users.map((u) => (
                            <tr key={u.id}>
                                <td className="px-3 py-2">{u.name}</td>
                                <td className="px-3 py-2">{u.email}</td>
                                <td className="px-3 py-2">
                                    {RoleLabels?.[u.role] || u.role}
                                </td>
                                {user?.role === "admin" && (
                                    <td className="px-3 py-2">
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
                                            {/* <button
                                            className="p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
                                            onClick={() => {
                                                setChangingEmailUser(u);
                                                setShowEmailChangeModal(true);
                                                setUserErrors({});
                                            }}
                                            title="Change user email"
                                        >
                                            <MailIcon size={16} />
                                        </button> */}
                                        </div>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
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
