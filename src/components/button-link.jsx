import { twMerge } from "tailwind-merge";
import { forwardRef } from "react";
import { Link } from "react-router";

/**
 * ButtonLink - A Link component styled as a Button for navigation
 *
 * @param {string} variant - Visual style: 'primary', 'secondary', 'danger', 'ghost', 'link'
 * @param {string} size - Size variant: 'xs', 'sm', 'md', 'lg'
 * @param {boolean} disabled - Disabled state (prevents navigation)
 * @param {boolean} fullWidth - Whether button should take full width
 * @param {ReactNode} children - Button content
 * @param {string} className - Additional CSS classes to merge with base styles
 * @param {string} to - Navigation path (required)
 * @param {function} onClick - Click handler
 */
const ButtonLink = forwardRef(
    (
        {
            variant = "primary",
            size = "md",
            disabled = false,
            fullWidth = false,
            children,
            className,
            to,
            onClick,
            ...props
        },
        ref
    ) => {
        // Base classes applied to all button links
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
            "no-underline",
        ].join(" ");

        // Variant-specific styles
        const variantClasses = {
            primary: [
                "bg-blue-600",
                "text-white",
                "shadow-xs",
                "hover:bg-blue-500",
                "focus:ring-blue-500",
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
            ].join(" "),
            danger: [
                "bg-red-600",
                "text-white",
                "shadow-xs",
                "hover:bg-red-500",
                "focus:ring-red-500",
            ].join(" "),
            ghost: [
                "bg-transparent",
                "text-gray-700",
                "hover:bg-gray-100",
                "focus:ring-gray-500",
            ].join(" "),
            link: [
                "bg-transparent",
                "text-blue-600",
                "underline-offset-4",
                "hover:underline",
                "focus:ring-blue-500",
            ].join(" "),
        };

        // Size-specific styles
        const sizeClasses = {
            xs: "px-2 py-1 text-xs",
            sm: "px-2 py-1 text-sm",
            md: "px-3 py-2 text-sm",
            lg: "px-4 py-3 text-base",
        };

        // Disabled styles
        const disabledClasses = disabled
            ? "opacity-50 cursor-not-allowed pointer-events-none"
            : "";

        // Width classes
        const widthClasses = fullWidth ? "w-full" : "";

        // Combine all classes
        const linkClasses = twMerge(
            baseClasses,
            variantClasses[variant] || variantClasses.primary,
            sizeClasses[size] || sizeClasses.md,
            disabledClasses,
            widthClasses,
            className
        );

        if (disabled) {
            // Render as a span when disabled to prevent navigation
            return (
                <span ref={ref} className={linkClasses} {...props}>
                    {children}
                </span>
            );
        }

        return (
            <Link
                ref={ref}
                to={to}
                onClick={onClick}
                className={linkClasses}
                {...props}
            >
                {children}
            </Link>
        );
    }
);

ButtonLink.displayName = "ButtonLink";

export default ButtonLink;
