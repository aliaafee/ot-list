import React, { useId } from "react";
import { twMerge } from "tailwind-merge";

/**
 * FormField - Reusable form input field with label and error handling
 *
 * @param {string} label - Label text for the input field
 * @param {string} name - Name attribute for the input
 * @param {string} value - Current value of the input
 * @param {function} onChange - Change handler function
 * @param {ReactNode} children - Options for select type (optional)
 * @param {string} type - Input type: 'text', 'email', 'password', 'number', 'date', 'textarea', 'select'
 * @param {boolean} error - Whether the field has an error
 * @param {string} errorMessage - Error message to display
 * @param {string} className - Additional CSS classes for the container
 * @param {string} inputClassName - Additional CSS classes for the input element
 * @param {boolean} disabled - Whether the input is disabled
 * @param {string} placeholder - Placeholder text for the input
 * @param {string} id - Optional id for the control; generated when omitted
 */
export default function FormField({
    label,
    name,
    value,
    onChange,
    children,
    type = "text",
    error = false,
    errorMessage = "",
    className = "",
    inputClassName = "",
    disabled = false,
    placeholder = "",
    id = "",
}) {
    // The label has to point at the control by id, so one is generated when
    // the caller does not supply it - without it the field is unlabelled to
    // assistive tech no matter how obvious the text above it looks.
    const generatedId = useId();
    const fieldId = id || `${generatedId}-field`;
    const errorId = `${generatedId}-error`;
    const describedBy = errorMessage ? errorId : undefined;

    if (type === "select") {
        return (
            <div className={twMerge("flex flex-col", className)}>
                <label
                    htmlFor={fieldId}
                    className="text-xs text-left text-gray-700"
                >
                    {label}
                </label>
                <select
                    id={fieldId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    aria-invalid={!!error || undefined}
                    aria-describedby={describedBy}
                    className={twMerge(
                        "w-full rounded p-1 bg-white border border-gray-200",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50",
                        disabled && "appearance-none",
                    )}
                    disabled={disabled}
                >
                    {children}
                </select>
                {!!errorMessage && (
                    <p id={errorId} className="text-xs text-red-500">
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    }

    return (
        <div className={twMerge("flex flex-col", className)}>
            {/* The label fades out when the box is empty, but it stays in the
                accessibility tree - opacity is not a way to hide it from a
                screen reader, and the field still needs a name. */}
            <label
                htmlFor={fieldId}
                className={twMerge(
                    "text-xs opacity-0 text-left text-gray-700",
                    !!value && "opacity-100",
                )}
            >
                {label}
            </label>
            {type === "textarea" ? (
                <textarea
                    id={fieldId}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder || label}
                    disabled={disabled}
                    aria-invalid={!!error || undefined}
                    aria-describedby={describedBy}
                    className={twMerge(
                        "w-full rounded p-1 bg-white border border-gray-200",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50",
                    )}
                ></textarea>
            ) : (
                <input
                    id={fieldId}
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder || label}
                    disabled={disabled}
                    aria-invalid={!!error || undefined}
                    aria-describedby={describedBy}
                    className={twMerge(
                        "w-full rounded p-1 bg-white border border-gray-200",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50",
                    )}
                />
            )}
            {!!errorMessage && (
                <p id={errorId} className="text-xs text-red-500">
                    {errorMessage}
                </p>
            )}
        </div>
    );
}
