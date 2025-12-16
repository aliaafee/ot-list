import { useEffect, useState } from "react";

/**
 * Toast - Temporary notification message component
 *
 * @param {string} message - Message text to display
 * @param {number} duration - Duration in milliseconds before auto-close (default: 3000)
 * @param {function} onClose - Callback function when toast closes
 * @param {string} type - Toast type: 'success', 'error', or 'info' (default: 'success')
 */
export function Toast({ message, duration = 3000, onClose, type = "success" }) {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Allow fade out animation
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const bgColor =
        {
            success: "bg-green-600/80",
            error: "bg-red-600/80",
            info: "bg-blue-600/80",
        }[type] || "bg-gray-800/80";

    return (
        <div
            className={`z-50 transition-all duration-300 ${
                isVisible
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2"
            }`}
        >
            <div
                className={`${bgColor} text-white px-4 py-3 rounded-lg shadow-lg max-w-md`}
            >
                <p className="text-sm">{message}</p>
            </div>
        </div>
    );
}

export function ToastContainer({ toasts, removeToast }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2">
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => removeToast(toast.id)}
                />
            ))}
        </div>
    );
}
