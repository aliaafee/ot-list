import { useState } from "react";
import { twMerge } from "tailwind-merge";
import { CopyCheckIcon, CopyIcon } from "lucide-react";

/**
 * LabelValue - Display a label with its corresponding value
 *
 * @param {string} label - Label text to display above the value
 * @param {string|ReactNode} value - Value to display
 * @param {string} className - Additional CSS classes for the container
 * @param {ReactNode} blank - Content to display when value is empty (default: —)
 */
function LabelValue({
    label,
    value,
    className,
    blank = <>&mdash;</>,
    copyButton = false,
}) {
    const [copied, setCopied] = useState(false);

    const handleCopyValue = (e) => {
        e.stopPropagation();
        // Copy to clipboard
        navigator.clipboard
            .writeText(value)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            })
            .catch((err) => {
                console.error("Failed to copy advice: ", err);
            });
    };
    return (
        <div className={twMerge("flex flex-col", className)}>
            {label ? (
                <span className=" text-gray-700 text-xs select-none">
                    {label}
                </span>
            ) : (
                <></>
            )}
            <span
                className={twMerge(
                    "flex items-start flex-wrap overflow-clip text-ellipsis",
                    label ? "p-1" : "",
                )}
            >
                <span
                    className={twMerge(
                        "text-gray-900 overflow-clip text-ellipsis",
                    )}
                >
                    <span className="select-all">{value ? value : blank}</span>
                </span>
                {copyButton && (
                    <button
                        className={twMerge(
                            "cursor-pointer text-gray-500 hover:text-blue-500",
                            "p-1.5",
                            copied && "text-green-500 hover:text-green-500",
                        )}
                        onClick={handleCopyValue}
                        title="Copy"
                    >
                        {copied ? (
                            <CopyCheckIcon width={12} height={12} />
                        ) : (
                            <CopyIcon width={12} height={12} />
                        )}
                    </button>
                )}
            </span>
        </div>
    );
}

export default LabelValue;
