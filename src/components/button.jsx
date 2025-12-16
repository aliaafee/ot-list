import { twMerge } from "tailwind-merge";
import { forwardRef } from "react";

/**
 * Button - A flexible, reusable button component with uniform styling
 *
 * @param {string} variant - Visual style: 'primary', 'secondary', 'danger', 'ghost', 'link'
 * @param {string} size - Size variant: 'xs', 'sm', 'md', 'lg'
 * @param {boolean} disabled - Disabled state
 * @param {boolean} loading - Loading state (shows spinner, disables interaction)
 * @param {boolean} fullWidth - Whether button should take full width
 * @param {ReactNode} children - Button content
 * @param {string} className - Additional CSS classes to merge with base styles
 * @param {string} type - Button type attribute ('button', 'submit', 'reset')
 * @param {function} onClick - Click handler
 */
const Button = forwardRef(
    (
        {
            variant = "primary",
            size = "md",
            disabled = false,
            loading = false,
            fullWidth = false,
            children,
            className,
            type = "button",
            onClick,
            ...props
        },
        ref
    ) => {
        // Base classes applied to all buttons
        const baseClasses = [
            "inline-flex",
            "items-center",
            "justify-center",
            "rounded-md",
            "font-semibold",
            "transition-colors",
            "focus:outline-none",
            "focus:ring-2",
            "focus:ring-offset-2",
            "disabled:cursor-not-allowed",
            "disabled:opacity-50",
        ].join(" ");

        // Variant-specific styles
        const variantClasses = {
            primary: [
                "bg-blue-600",
                "text-white",
                "shadow-xs",
                "hover:bg-blue-500",
                "focus:ring-blue-500",
                "disabled:hover:bg-blue-600",
            ].join(" "),
            secondary: [
                "bg-white",
                "text-gray-900",
                "shadow-xs",
                "ring-1",
                "ring-inset",
                "ring-gray-300",
                "hover:bg-gray-50",
                "focus:ring-gray-500",
                "disabled:hover:bg-white",
            ].join(" "),
            danger: [
                "bg-red-600",
                "text-white",
                "shadow-xs",
                "hover:bg-red-500",
                "focus:ring-red-500",
                "disabled:hover:bg-red-600",
            ].join(" "),
            ghost: [
                "bg-transparent",
                "text-gray-700",
                "hover:bg-gray-100",
                "focus:ring-gray-500",
                "disabled:hover:bg-transparent",
            ].join(" "),
            link: [
                "bg-transparent",
                "text-blue-600",
                "underline-offset-4",
                "hover:underline",
                "focus:ring-blue-500",
                "disabled:no-underline",
            ].join(" "),
        };

        // Size-specific styles
        const sizeClasses = {
            xs: "px-2 py-1 text-xs",
            sm: "px-2 py-1 text-sm",
            md: "px-3 py-2 text-sm",
            lg: "px-4 py-3 text-base",
        };

        // Width classes
        const widthClasses = fullWidth ? "w-full" : "";

        // Combine all classes
        const buttonClasses = twMerge(
            baseClasses,
            variantClasses[variant] || variantClasses.primary,
            sizeClasses[size] || sizeClasses.md,
            widthClasses,
            "cursor-pointer",
            className
        );

        return (
            <button
                ref={ref}
                type={type}
                onClick={onClick}
                disabled={disabled || loading}
                className={buttonClasses}
                {...props}
            >
                {loading && (
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        ></circle>
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                    </svg>
                )}
                {children}
            </button>
        );
    }
);

Button.displayName = "Button";

export default Button;
