import { Link } from "react-router";
import { twMerge } from "tailwind-merge";

/**
 * ToolBarButton - Button component for toolbars with hover and active states
 *
 * @param {string} className - Additional CSS classes for the inner container
 * @param {string} buttonClassName - Additional CSS classes for the button element
 * @param {ReactNode} children - Button content
 * @param {boolean} disabled - Whether the button is disabled
 * @param {string} title - Tooltip text
 * @param {boolean} active - Whether the button is in active state
 * @param {function} onClick - Click handler function
 */
const ToolBarButton = ({
    className,
    buttonClassName,
    children,
    disabled,
    title,
    active = false,
    onClick = () => {},
}) => {
    return (
        <button
            className={twMerge("disabled:text-gray-500", buttonClassName)}
            onClick={onClick}
            title={title}
            disabled={disabled}
        >
            <div
                className={twMerge(
                    "rounded-lg flex items-center justify-center px-1.5 py-1.5 gap-1.5 m-1 whitespace-nowrap overflow-clip",
                    disabled
                        ? "hover:bg-transparent"
                        : "hover:bg-gray-400 cursor-pointer",
                    className,
                    active && " bg-gray-400"
                )}
            >
                {children}
            </div>
        </button>
    );
};

/**
 * ToolBarLink - Link component styled as a toolbar button
 *
 * @param {string} className - Additional CSS classes for the inner container
 * @param {string} buttonClassName - Additional CSS classes for the link element
 * @param {ReactNode} children - Link content
 * @param {string} title - Tooltip text
 * @param {string} to - Navigation path
 * @param {string} target - Link target attribute
 * @param {boolean} disabled - Whether the link is disabled
 */
const ToolBarLink = ({
    className,
    buttonClassName,
    children,
    title,
    to,
    target,
    disabled = false,
}) => {
    const content = (
        <div
            className={twMerge(
                "rounded-lg flex items-center justify-center px-1.5 py-1.5 gap-1.5 m-1 whitespace-nowrap overflow-clip",
                disabled
                    ? "hover:bg-transparent"
                    : "hover:bg-gray-400 cursor-pointer",
                className
            )}
        >
            {children}
        </div>
    );
    if (disabled) {
        return (
            <div
                className={twMerge("text-gray-500", buttonClassName)}
                title={title}
                to={to}
            >
                {content}
            </div>
        );
    }
    return (
        <Link className={buttonClassName} title={title} to={to} target={target}>
            {content}
        </Link>
    );
};

/**
 * ToolBarButtonLabel - Label component for toolbar buttons
 *
 * @param {string} className - Additional CSS classes
 * @param {ReactNode} children - Label text content
 */
const ToolBarButtonLabel = ({ className, children }) => (
    <div
        className={twMerge(
            "min-w-[50px] pr-2 text-left text-sm whitespace-nowrap overflow-clip",
            className
        )}
    >
        {children}
    </div>
);

/**
 * ToolBarPill - Segmented control/pill selector for toolbars
 *
 * @param {string} className - Additional CSS classes for the container
 * @param {Array} items - Array of {value, label, color} objects for each option
 * @param {string} value - Currently selected value
 * @param {boolean} disabled - Whether the pill selector is disabled
 * @param {function} setValue - Callback when a value is selected
 * @param {function} onClick - Additional click handler
 */
const ToolBarPill = ({
    className,
    items = [{ value: "a", label: "A", color: "" }],
    value = "",
    disabled = false,
    setValue = (value) => {},
    onClick = () => {},
}) => {
    return (
        <div
            className={twMerge(
                "rounded-lg bg-gray-600 flex gap-1 p-1 m-1",
                className
            )}
        >
            {items.map((item, index) => (
                <button
                    key={index}
                    onClick={() => {
                        setValue(item.value);
                        onClick();
                    }}
                    className={"disabled:text-gray-500"}
                    disabled={disabled}
                >
                    <div
                        className={twMerge(
                            "rounded-sm flex items-center justify-center px-1 py-0.5 gap-1 whitespace-nowrap overflow-clip text-sm text-white text-center",
                            value === item.value
                                ? twMerge(item.color, "text-black")
                                : disabled
                                ? "hover:bg-transparent"
                                : `hover:bg-gray-400 hover:text-black cursor-pointer`
                        )}
                    >
                        {item.label}
                    </div>
                </button>
            ))}
        </div>
    );
};

/**
 * ToolBar - Container component for toolbar buttons and controls
 *
 * @param {string} className - Additional CSS classes for the toolbar
 * @param {ReactNode} children - Toolbar content (buttons, links, etc.)
 */
const ToolBar = ({ className, children }) => {
    return (
        <div className={twMerge("flex items-center", className)}>
            {children}
        </div>
    );
};

export { ToolBar, ToolBarButton, ToolBarButtonLabel, ToolBarPill, ToolBarLink };
