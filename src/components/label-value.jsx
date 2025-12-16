import { twMerge } from "tailwind-merge";

/**
 * LabelValue - Display a label with its corresponding value
 *
 * @param {string} label - Label text to display above the value
 * @param {string|ReactNode} value - Value to display
 * @param {string} className - Additional CSS classes for the container
 * @param {ReactNode} blank - Content to display when value is empty (default: —)
 */
function LabelValue({ label, value, className, blank = <>&mdash;</> }) {
    return (
        <div className={twMerge("flex flex-col", className)}>
            {!!label ? (
                <span className=" text-gray-700 text-xs">{label}</span>
            ) : (
                <></>
            )}
            <span
                className={twMerge(
                    "text-gray-900 overflow-clip overflow-ellipsis",
                    !!label ? "p-1" : ""
                )}
            >
                <span className="select-all">{!!value ? value : blank}</span>
            </span>
        </div>
    );
}

export default LabelValue;
