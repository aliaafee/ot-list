import React from "react";
import { twMerge } from "tailwind-merge";

export default function FormField({
    label,
    name,
    value,
    onChange,
    children,
    type = "text",
    error = false,
    className = "",
    inputClassName = "",
}) {
    if (type === "select") {
        return (
            <div className={twMerge("flex flex-col", className)}>
                <label className="text-xs">{label}</label>
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    className={twMerge(
                        "w-full rounded p-1 bg-white",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50"
                    )}
                >
                    {children}
                </select>
            </div>
        );
    }

    return (
        <div className={twMerge("flex flex-col", className)}>
            <label
                className={twMerge(
                    "text-xs opacity-0",
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
                    placeholder={label}
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
                    placeholder={label}
                    className={twMerge(
                        "w-full rounded p-1 bg-white",
                        inputClassName,
                        !!error && "border-red-500 bg-red-50"
                    )}
                />
            )}
        </div>
    );
}
