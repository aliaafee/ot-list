import { twMerge } from "tailwind-merge";

/**
 * BodyLayout - Main content layout wrapper with fixed header
 *
 * @param {Object} props - Component props
 * @param {string} [props.className] - Additional CSS classes to apply to the container
 * @param {ReactNode} [props.header] - Header content (usually toolbar or navigation)
 * @param {ReactNode} [props.title] - Title content section
 * @param {ReactNode} props.children - Main content to display in the body
 * @param {string} [props.topMargin="mt-16"] - Top margin CSS class
 * @param {string} [props.titleClassName] - Additional CSS classes for the title section
 */

function BodyLayout({
    className,
    header,
    title,
    children,
    topMargin = "mt-16",
    titleClassName,
}) {
    return (
        <div
            className={twMerge(
                "flex flex-col overflow-y-auto lg:mt-0",
                topMargin,
                className
            )}
        >
            {!!header && (
                <div className="bg-gray-200 fixed top-16 lg:sticky lg:top-0 w-full shadow-md">
                    <div className="mx-auto max-w-4xl">{header}</div>
                </div>
            )}

            {!!title && (
                <div
                    className={twMerge(
                        "w-full bg-gray-200 shadow-md px-2 z-10",
                        titleClassName
                    )}
                >
                    <div className="mx-auto max-w-4xl">{title}</div>
                </div>
            )}

            <div className="bg-white grow px-2 pt-4 pb-20 w-full max-w-4xl mx-auto mt-10 lg:mt-0">
                {children}
            </div>
        </div>
    );
}

export default BodyLayout;
