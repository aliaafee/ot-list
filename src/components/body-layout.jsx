import { twMerge } from "tailwind-merge";

/**
 * BodyLayout - Main content layout wrapper with fixed header
 *
 * @param {string} className - Additional CSS classes to apply to the container
 * @param {ReactNode} header - Header content (usually toolbar or navigation)
 * @param {ReactNode} children - Main content to display in the body
 */
function BodyLayout({ className, header, children }) {
    return (
        <div
            className={twMerge(
                "flex flex-col overflow-y-auto mt-26 lg:mt-0",
                className
            )}
        >
            <div className="bg-gray-200 fixed top-16 lg:sticky lg:top-0 w-full shadow-md z-20">
                <div className="mx-auto max-w-4xl">{header}</div>
            </div>

            <div className="bg-white grow  px-2 pt-4 pb-20 w-full max-w-4xl mx-auto">
                {children}
            </div>
        </div>
    );
}

export default BodyLayout;
