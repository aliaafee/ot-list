import React from "react";
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
}) {
    if (type === "select") {
        return (
            <div className={twMerge("flex flex-col", className)}>
                <label className="text-xs text-left text-gray-700">
                    {label}
                </label>
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={twMerge(
                        "w-full rounded p-1 bg-white",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50",
                        disabled && "appearance-none"
                    )}
                    disabled={disabled}
                >
                    {children}
                </select>
                {!!errorMessage && (
                    <p className="text-xs text-red-500">{errorMessage}</p>
                )}
            </div>
        );
    }

    return (
        <div className={twMerge("flex flex-col", className)}>
            <label
                className={twMerge(
                    "text-xs opacity-0 text-left text-gray-700",
                    !!value && "opacity-100"
                )}
            >
                {label}
            </label>
            {type === "textarea" ? (
                <textarea
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={!!placeholder ? placeholder : label}
                    disabled={disabled}
                    className={twMerge(
                        "w-full rounded p-1 bg-white",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50"
                    )}
                ></textarea>
            ) : (
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={!!placeholder ? placeholder : label}
                    disabled={disabled}
                    className={twMerge(
                        "w-full rounded p-1 bg-white",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50"
                    )}
                />
            )}
            {!!errorMessage && (
                <p className="text-xs text-red-500">{errorMessage}</p>
            )}
        </div>
    );
}
