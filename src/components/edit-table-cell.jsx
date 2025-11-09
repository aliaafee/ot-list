import { useMemo, useState } from "react";

import FormField from "@/components/form-field";
import ModalWindow from "@/modals/modal-window";

function TableCell({ column, value, onChange, readOnly }) {
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedItems, setSelectedItems] = useState([]);

    const valueLabelMap = useMemo(() => {
        if (column.type === "multi-select" && column.options) {
            const map = {};
            column.options.forEach((option) => {
                map[option.value] = option.label;
            });
            return map;
        }
        return null;
    }, [column]);

    const handleAddItems = () => {
        const fakeEvent = {
            target: {
                name: column.field,
                value: selectedItems,
            },
        };
        onChange(fakeEvent);
        setShowEditModal(false);
    };

    if (column.type === "multi-select") {
        return (
            <td className="focus-within:outline-2 focus-within:bg-white outline-gray-600 align-top px-2 py-1">
                {value?.map((val) => (
                    <span
                        key={val}
                        className="inline-block bg-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                    >
                        {valueLabelMap[val] || val}
                    </span>
                ))}
                {!readOnly && (
                    <>
                        <button
                            className="ml-2 text-sm text-blue-600 underline cursor-pointer"
                            onClick={() => {
                                setSelectedItems(value || []);
                                setShowEditModal(true);
                            }}
                        >
                            Edit
                        </button>
                        {showEditModal && (
                            <ModalWindow
                                title="Add Items"
                                okLabel="Add"
                                onOk={handleAddItems}
                                onCancel={() => setShowEditModal(false)}
                            >
                                <p className="mb-2">
                                    Add items to the{" "}
                                    <strong>{column.label}</strong> field.
                                </p>
                                <p className="mb-2">
                                    Select from the options below:
                                </p>
                                <p className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-2 ml-2">
                                    {column.options.map((option) => (
                                        <span
                                            className="flex gap-2"
                                            key={option.value}
                                        >
                                            <input
                                                key={option.value}
                                                type="checkbox"
                                                id={`option-${option.value}`}
                                                name={option.value}
                                                checked={selectedItems.includes(
                                                    option.value
                                                )}
                                                onChange={(e) => {
                                                    let newSelectedItems = [
                                                        ...selectedItems,
                                                    ];
                                                    if (e.target.checked) {
                                                        newSelectedItems.push(
                                                            option.value
                                                        );
                                                    } else {
                                                        newSelectedItems =
                                                            newSelectedItems.filter(
                                                                (item) =>
                                                                    item !==
                                                                    option.value
                                                            );
                                                    }
                                                    setSelectedItems(
                                                        newSelectedItems
                                                    );
                                                }}
                                            />
                                            {option.label}
                                        </span>
                                    ))}
                                </p>
                                <p className="mb-2">Selected Items:</p>
                                <div className="flex flex-wrap gap-2 mb-2 ml-2">
                                    {selectedItems.map((val) => (
                                        <span
                                            key={val}
                                            className="inline-block bg-gray-400 text-xs px-2 py-1 rounded-full"
                                        >
                                            {valueLabelMap[val] || val}
                                        </span>
                                    ))}
                                </div>
                            </ModalWindow>
                        )}
                    </>
                )}
            </td>
        );
    }

    if (readOnly) {
        return (
            <td className="align-top">
                <FormField
                    disabled={true}
                    value={value || ""}
                    className="w-full"
                    inputClassName="bg-transparent border-0 py-1 px-2"
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
            </td>
        );
    }

    return (
        <td className="focus-within:outline-2 focus-within:bg-white outline-gray-600 align-top">
            <FormField
                name={column.field}
                value={value || ""}
                onChange={(e) => onChange(e)}
                type={column.type || "text"}
                className="w-full"
                placeholder={column.label}
                inputClassName="bg-transparent border-0 py-1 px-2 focus:outline-none focus:ring-0"
            >
                {column.type === "select" &&
                    column.options &&
                    column.options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
            </FormField>
        </td>
    );
}

export default TableCell;
