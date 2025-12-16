import React from "react";

/**
 * ErrorMessage - Generic error message display component
 * @param {string} title - Title of the error message
 * @param {string} message - Error message content
 * @param {React.ReactNode} children - Additional content to display below the message
 */
export default function ErrorMessage({ title, message, children }) {
    return (
        <div className="w-full h-full flex items-center justify-center">
            <div>
                <div className="text-center w-80">{title}</div>
                <div className="text-sm text-center w-80">{message}</div>
                {children && <div className="text-center w-80">{children}</div>}
            </div>
        </div>
    );
}
