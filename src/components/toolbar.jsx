import { Link } from "react-router";
import { twMerge } from "tailwind-merge";

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

const ToolBarLink = ({
    className,
    buttonClassName,
    children,
    title,
    to,
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
        <Link className={buttonClassName} title={title} to={to}>
            {content}
        </Link>
    );
};

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
                            disabled
                                ? "hover:bg-transparent"
                                : `hover:bg-gray-400 hover:text-black cursor-pointer`,
                            value === item.value &&
                                twMerge(item.color, "text-black")
                        )}
                    >
                        {item.label}
                    </div>
                </button>
            ))}
        </div>
    );
};

const ToolBar = ({ className, children }) => {
    return (
        <div className={twMerge("flex items-center", className)}>
            {children}
        </div>
    );
};

export { ToolBar, ToolBarButton, ToolBarButtonLabel, ToolBarPill, ToolBarLink };
