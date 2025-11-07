import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import FormField from "@/components/form-field";
import { EditIcon, PlusIcon, Save, SaveIcon, XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

function TableCell({ column, value, onChange }) {
    return (
        <FormField
            name={column.field}
            value={value || ""}
            onChange={(e) => onChange(e)}
            type={column.type || "text"}
            className="w-full"
            placeholder={column.label}
            inputClassName="bg-transparent border-0 p-0 px-2"
        >
            {column.type === "select" &&
                column.options &&
                column.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
        </FormField>
    );
}

function TableReadonlyCell({ column, value }) {
    return (
        <FormField
            disabled={true}
            value={value || ""}
            className="w-full"
            inputClassName="bg-transparent border-0 p-0 px-2"
            type={column.type || "text"}
        >
            {column.type === "select" &&
                column.options &&
                column.options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
        </FormField>
    );
}

export default function EditTable({ collectionName, columns }) {
    const [data, setData] = useState([]);
    const [editingRow, setEditingRow] = useState(null);
    const [newRow, setNewRow] = useState(null); // State for adding a new row
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Fetch data from the PocketBase collection
    const fetchData = async () => {
        setLoading(true);
        try {
            const records = await pb.collection(collectionName).getFullList();
            setData(records);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError("Failed to fetch data.");
        } finally {
            setLoading(false);
        }
    };

    // Handle input changes for editing or adding
    const handleInputChange = (e, id) => {
        const { name, value } = e.target;
        if (id === "new") {
            setNewRow((prev) => ({ ...prev, [name]: value }));
        } else {
            setData((prevData) =>
                prevData.map((row) =>
                    row.id === id ? { ...row, [name]: value } : row
                )
            );
        }
    };

    // Save changes to the database
    const handleSave = async (id) => {
        setLoading(true);
        setError("");
        try {
            if (id === "new") {
                // Save new row to the database
                const createdRow = await pb
                    .collection(collectionName)
                    .create(newRow);
                setData((prevData) => [...prevData, createdRow]);
                setNewRow(null);
                alert("New row added successfully!");
            } else {
                // Save existing row to the database
                const updatedRow = data.find((row) => row.id === id);
                await pb.collection(collectionName).update(id, updatedRow);
                setEditingRow(null);
                alert("Row updated successfully!");
            }
        } catch (err) {
            console.error("Error saving data:", err);
            setError("Failed to save changes.");
        } finally {
            setLoading(false);
        }
    };

    // Cancel editing or adding
    const handleCancel = (id) => {
        if (id === "new") {
            setNewRow(null);
        } else {
            setEditingRow(null);
            fetchData(); // Re-fetch data to discard unsaved changes
        }
    };

    // Fetch data on component mount
    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div
            className={twMerge(
                loading ? "opacity-50 pointer-events-none animate-pulse" : ""
            )}
        >
            {error && <p className="text-red-500">{error}</p>}
            <table className="table-auto w-full border-collapse text-left rounded overflow-hidden">
                <thead className="bg-gray-400">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.field} className="px-2 py-1">
                                {col.label}
                            </th>
                        ))}
                        <th className="w-14"></th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr
                            key={row.id}
                            className="odd:bg-gray-200 even:bg-gray-300"
                        >
                            {columns.map((col) => (
                                <td key={col.field}>
                                    {editingRow === row.id ? (
                                        <TableCell
                                            column={col}
                                            value={row[col.field]}
                                            onChange={(e) =>
                                                handleInputChange(e, row.id)
                                            }
                                        />
                                    ) : (
                                        <TableReadonlyCell
                                            column={col}
                                            value={row[col.field]}
                                        />
                                    )}
                                </td>
                            ))}
                            <td className="flex items-center justify-end">
                                {editingRow === row.id ? (
                                    <>
                                        <button
                                            className="p-2 hover:bg-gray-400 cursor-pointer"
                                            onClick={() => handleSave(row.id)}
                                            disabled={loading}
                                        >
                                            <SaveIcon size={16} />
                                        </button>
                                        <button
                                            className="p-2 hover:bg-gray-400 cursor-pointer"
                                            onClick={handleCancel}
                                            disabled={loading}
                                        >
                                            <XIcon size={16} />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            className="p-2 hover:bg-gray-400 cursor-pointer invisible"
                                            disabled={true}
                                        >
                                            <EditIcon size={16} />
                                        </button>
                                        <button
                                            className="p-2 hover:bg-gray-400 cursor-pointer"
                                            onClick={() =>
                                                setEditingRow(row.id)
                                            }
                                            disabled={loading}
                                        >
                                            <EditIcon size={16} />
                                        </button>
                                    </>
                                )}
                            </td>
                        </tr>
                    ))}
                    {newRow && (
                        <tr className="odd:bg-gray-200 even:bg-gray-300">
                            {columns.map((col) => (
                                <td key={col.field}>
                                    <TableCell
                                        column={col}
                                        value={newRow[col.field]}
                                        onChange={(e) =>
                                            handleInputChange(e, "new")
                                        }
                                    />
                                </td>
                            ))}
                            <td className="flex items-center justify-end">
                                <button
                                    className="p-2 hover:bg-gray-400 cursor-pointer"
                                    onClick={() => handleSave("new")}
                                    disabled={loading}
                                >
                                    <SaveIcon size={16} />
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-400 cursor-pointer"
                                    onClick={() => handleCancel("new")}
                                    disabled={loading}
                                >
                                    <XIcon size={16} />
                                </button>
                            </td>
                        </tr>
                    )}
                    {!newRow && (
                        <tr className="odd:bg-gray-200 even:bg-gray-300">
                            <td colSpan={columns.length}></td>
                            <td className="flex items-center justify-end">
                                <button
                                    className="p-2 hover:bg-gray-400 cursor-pointer invisible"
                                    disabled={true}
                                >
                                    <EditIcon size={16} />
                                </button>
                                <button
                                    className="p-2 hover:bg-gray-400 cursor-pointer"
                                    onClick={() => setNewRow({})}
                                    disabled={loading}
                                >
                                    <PlusIcon size={16} />
                                </button>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
