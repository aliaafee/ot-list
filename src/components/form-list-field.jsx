import React, { useLayoutEffect, useRef } from "react";
import { twMerge } from "tailwind-merge";
import { PlusIcon, XIcon } from "lucide-react";
import FormField from "@/components/form-field";

/**
 * FormListField - A FormField that collects a list of values instead of one
 *
 * Renders one FormField per entry, with a control to add another and to remove
 * an existing one. The change handler receives a synthetic event shaped like a
 * native one - `{ target: { name, value } }` where value is the whole array -
 * so a form already wired up for FormField can use the same handler.
 *
 * @param {string} label - Label text, numbered per row once there is more than one
 * @param {string} name - Name attribute for the inputs, and on the emitted event
 * @param {string[]} value - Current list of values
 * @param {function} onChange - Change handler, called with { target: { name, value } }
 * @param {ReactNode} children - Options for select type (optional)
 * @param {string} type - Input type: 'text', 'email', 'password', 'number', 'date', 'textarea', 'select'
 * @param {boolean} error - Whether the list as a whole has an error
 * @param {string} errorMessage - Error message for the list as a whole
 * @param {string[]} itemErrors - Error message per entry, indexed to match value
 * @param {string} className - Additional CSS classes for the container
 * @param {string} inputClassName - Additional CSS classes for each input element
 * @param {boolean} disabled - Whether the inputs and the add/remove controls are disabled
 * @param {string} placeholder - Placeholder text for the inputs
 * @param {number} minItems - Number of entries that must remain (default 1)
 * @param {number} maxItems - Number of entries allowed (default unlimited)
 * @param {string} addLabel - Text for the add control (default "Add <label>")
 */
export default function FormListField({
    label,
    name,
    value,
    onChange,
    children,
    type = "text",
    error = false,
    errorMessage = "",
    itemErrors = [],
    className = "",
    inputClassName = "",
    disabled = false,
    placeholder = "",
    minItems = 1,
    maxItems = Infinity,
    addLabel = "",
}) {
    // An empty list still shows the minimum number of boxes, so the field does
    // not start as a bare button. These are display-only until typed in - the
    // parent's value is left alone rather than being back-filled with blanks.
    const items =
        Array.isArray(value) && value.length > 0
            ? value
            : Array(Math.max(minItems, 1)).fill("");

    // Focus the box that was just added, so adding an entry and typing into it
    // is one gesture rather than click, then aim, then click again.
    const containerRef = useRef(null);
    const focusLastRef = useRef(false);
    useLayoutEffect(() => {
        if (!focusLastRef.current) return;
        focusLastRef.current = false;
        const controls = containerRef.current?.querySelectorAll(
            "input, select, textarea",
        );
        controls?.[controls.length - 1]?.focus();
    });

    const emit = (nextItems) => {
        if (onChange) {
            onChange({ target: { name, value: nextItems } });
        }
    };

    const handleItemChange = (index) => (e) => {
        emit(items.map((item, i) => (i === index ? e.target.value : item)));
    };

    const handleAdd = () => {
        focusLastRef.current = true;
        emit([...items, ""]);
    };

    const handleRemove = (index) => () => {
        emit(items.filter((_, i) => i !== index));
    };

    const canAdd = !disabled && items.length < maxItems;
    const canRemove = !disabled && items.length > minItems;

    return (
        <div
            ref={containerRef}
            className={twMerge("flex flex-col gap-1", className)}
            role="group"
            aria-label={label}
        >
            {/* Keying by index is safe here because every box is controlled
                by `value` - a removal re-renders the surviving rows with the
                contents that belong to them. */}
            {items.map((item, index) => (
                <div key={index} className="flex gap-1">
                    <FormField
                        label={
                            items.length > 1 ? `${label} ${index + 1}` : label
                        }
                        name={name}
                        value={item}
                        onChange={handleItemChange(index)}
                        type={type}
                        error={!!itemErrors[index] || !!error}
                        errorMessage={itemErrors[index] || ""}
                        inputClassName={inputClassName}
                        disabled={disabled}
                        placeholder={placeholder}
                        className="grow"
                    >
                        {children}
                    </FormField>
                    {canRemove && (
                        <button
                            type="button"
                            onClick={handleRemove(index)}
                            // The label fades with the one above it, so the
                            // button is nudged down to sit level with the box.
                            className="mt-4 self-start rounded p-1 text-gray-500 cursor-pointer hover:bg-gray-100 hover:text-red-600"
                            aria-label={`Remove ${label} ${index + 1}`}
                        >
                            <XIcon size={16} />
                        </button>
                    )}
                </div>
            ))}
            {canAdd && (
                <button
                    type="button"
                    onClick={handleAdd}
                    className="flex items-center gap-1 self-start rounded p-1 text-xs text-blue-600 cursor-pointer hover:bg-gray-100"
                >
                    <PlusIcon size={14} />
                    {addLabel || `Add ${label}`}
                </button>
            )}
            {!!errorMessage && (
                <p className="text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    );
}
