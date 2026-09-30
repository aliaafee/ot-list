import FormField from "@/components/form-field";
import MultiSelectField from "@/components/multi-select-field";

/**
 * TableCell - Editable table cell component for EditTable
 *
 * @param {Object} column - Column definition object with type, options, etc.
 * @param {any} value - Current cell value
 * @param {function} onChange - Callback when value changes
 * @param {boolean} readOnly - Whether the cell is read-only
 * @param {boolean|string} error - Error state or message for the cell
 */
function TableCell({ column, value, onChange, readOnly, error }) {
    if (column.type === "multi-select") {
        return (
            <td className="focus-within:outline-2 focus-within:bg-white outline-gray-600 align-top">
                <p className="px-2 py-1">
                    <MultiSelectField
                        label={column.label}
                        options={column.options}
                        value={value}
                        disabled={readOnly}
                        onChange={(items) =>
                            onChange({
                                target: { name: column.field, value: items },
                            })
                        }
                    />
                </p>
                {!readOnly && error && (
                    <p className="text-sm text-red-600 px-2 pb-1">
                        {error?.message}
                    </p>
                )}
            </td>
        );
    }

    if (readOnly) {
        return (
            <td className="align-top">
                <FormField
                    disabled={true}
                    // `?? ""`, not `|| ""`: `false` and `0` are values here. A
                    // select falling back to "" matches no option and so shows
                    // the first one, which read an inactive row as Active.
                    value={value ?? ""}
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
                value={value ?? ""}
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
            {error && (
                <p className="text-sm text-red-600 px-2 pb-1">
                    {error?.message}
                </p>
            )}
        </td>
    );
}

export default TableCell;
