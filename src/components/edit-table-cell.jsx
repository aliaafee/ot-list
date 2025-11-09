import { useMemo } from "react";

import FormField from "@/components/form-field";

function TableCell({ column, value, onChange, readOnly }) {
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

    if (column.type === "multi-select") {
        return (
            <td className="focus-within:outline-2 focus-within:bg-white outline-gray-600 align-top px-2 py-1">
                {value.map((val) => (
                    <span
                        key={val}
                        className="inline-block bg-gray-400 text-xs px-2 py-1 rounded-full mr-1 mb-1"
                    >
                        {valueLabelMap[val] || val}
                    </span>
                ))}
                {!readOnly && (
                    <button
                        className="ml-2 text-sm text-blue-600 underline cursor-pointer"
                        onClick={() => {
                            const newValue = prompt(
                                `Enter comma-separated values for ${column.label}:`,
                                value || ""
                            );
                            if (newValue !== null) {
                                const fakeEvent = {
                                    target: {
                                        name: column.field,
                                        value: String(newValue)
                                            .split(",")
                                            .map((v) => v.trim()),
                                    },
                                };
                                onChange(fakeEvent);
                            }
                        }}
                    >
                        Edit
                    </button>
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
