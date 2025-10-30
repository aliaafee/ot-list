import { twMerge } from "tailwind-merge";

function BodyLayout({ className, header, children }) {
    return (
        <div
            className={twMerge(
                "flex flex-col overflow-y-auto mt-26 lg:mt-0",
                className
            )}
        >
            <div className="bg-gray-200 fixed top-16 lg:sticky lg:top-0 w-full">
                <div className="mx-auto max-w-4xl">{header}</div>
            </div>

            <div className="bg-white grow  px-2 py-4 w-full max-w-4xl mx-auto">
                {children}
            </div>
        </div>
    );
}

export default BodyLayout;
