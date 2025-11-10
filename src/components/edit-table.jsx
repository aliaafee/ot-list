import { useEffect, useMemo, useState } from "react";
import { pb } from "@/lib/pb";
import TableCell from "./edit-table-cell";
import { EditIcon, PlusIcon, Save, SaveIcon, XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

export default function EditTable({
    collectionName,
    columns,
    afterSave,
    readOnly,
}) {
    const [data, setData] = useState([]);
    const [editingRow, setEditingRow] = useState(null);
    const [newRow, setNewRow] = useState(null); // State for adding a new row
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [errorData, setErrorData] = useState({});

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
        setErrorData((prev) => ({
            ...prev,
            [id]: {},
        }));

        try {
            if (id === "new") {
                // Save new row to the database
                const createdRow = await pb
                    .collection(collectionName)
                    .create(newRow);
                setData((prevData) => [...prevData, createdRow]);
                setNewRow(null);
                console.log("New row added successfully!");
            } else {
                // Save existing row to the database
                const updatedRow = data.find((row) => row.id === id);
                await pb.collection(collectionName).update(id, updatedRow);
                setEditingRow(null);
                console.log("Row updated successfully!");
            }
            afterSave && afterSave();
        } catch (err) {
            console.error("Error saving data:", err.response);
            if (err.response?.data) {
                setErrorData((prev) => ({
                    ...prev,
                    [id]: err.response?.data,
                }));
            }
            setError("Failed to save changes.");
        } finally {
            setLoading(false);
        }
    };

    console.log("Error Data:", errorData);

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
            <table className="table-auto w-full text-left ">
                <thead className="bg-gray-400">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.field} className="px-2 py-1">
                                {col.label}
                            </th>
                        ))}
                        {!!!readOnly && <th className="w-14"></th>}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row) => (
                        <tr
                            key={row.id}
                            className="odd:bg-gray-200 even:bg-gray-300"
                        >
                            {columns.map((col) => (
                                <TableCell
                                    key={col.field}
                                    column={col}
                                    value={row[col.field]}
                                    onChange={(e) =>
                                        handleInputChange(e, row.id)
                                    }
                                    readOnly={editingRow !== row.id}
                                    error={errorData[row.id]?.[col.field]}
                                />
                            ))}
                            {!!!readOnly && (
                                <td className="flex items-center justify-end">
                                    {editingRow === row.id ? (
                                        <>
                                            <button
                                                className="m-0.5 p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
                                                onClick={() =>
                                                    handleSave(row.id)
                                                }
                                                disabled={loading}
                                            >
                                                <SaveIcon size={16} />
                                            </button>
                                            <button
                                                className="m-0.5 p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
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
                                                className="m-0.5 p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
                                                onClick={() => {
                                                    setEditingRow(row.id);
                                                    setErrorData({});
                                                }}
                                                disabled={loading}
                                            >
                                                <EditIcon size={16} />
                                            </button>
                                        </>
                                    )}
                                </td>
                            )}
                        </tr>
                    ))}
                    {newRow && (
                        <tr className="odd:bg-gray-200 even:bg-gray-300">
                            {columns.map((col) => (
                                <TableCell
                                    key={col.field}
                                    column={col}
                                    value={newRow[col.field]}
                                    onChange={(e) =>
                                        handleInputChange(e, "new")
                                    }
                                    error={errorData["new"]?.[col.field]}
                                />
                            ))}
                            <td className="flex items-center justify-end">
                                <button
                                    className="m-1 p-1 rounded-full hover:bg-gray-400 cursor-pointer"
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
                    {!!!readOnly && !newRow && (
                        <tr className="odd:bg-gray-200 even:bg-gray-300">
                            <td colSpan={columns.length}></td>
                            <td className="flex items-center justify-end">
                                <button
                                    className="m-0.5 p-1.5 rounded-full hover:bg-gray-400 cursor-pointer invisible"
                                    disabled={true}
                                >
                                    <EditIcon size={16} />
                                </button>
                                <button
                                    className="m-0.5 p-1.5 rounded-full hover:bg-gray-400 cursor-pointer"
                                    onClick={() => {
                                        setNewRow({});
                                        setErrorData({});
                                    }}
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
