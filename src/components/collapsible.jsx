import { ChevronRight } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

/**
 * Collapsible - A single section that expands and collapses on click
 *
 * Owns its open state; the caller supplies the summary shown next to the
 * chevron and the content to reveal. For a set of sections where only one is
 * open at a time, see accordion.jsx.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.summary - Content of the always-visible toggle
 * @param {ReactNode} props.children - Content revealed while expanded
 * @param {boolean} [props.defaultOpen=false] - Whether it starts expanded
 * @param {number} [props.iconSize=12] - Chevron size in pixels
 * @param {string} [props.className] - Optional classes for the wrapper
 * @param {string} [props.summaryClassName] - Optional classes for the toggle
 * @param {string} [props.contentClassName] - Optional classes for the content
 * @returns {JSX.Element} A collapsible section
 */
export default function Collapsible({
    summary,
    children,
    defaultOpen = false,
    iconSize = 12,
    className = "",
    summaryClassName = "",
    contentClassName = "",
}) {
    const [open, setOpen] = useState(defaultOpen);

    return (
        <div className={twMerge("flex flex-col", className)}>
            <button
                type="button"
                aria-expanded={open}
                className={twMerge(
                    "flex items-center gap-1 text-left cursor-pointer",
                    summaryClassName,
                )}
                onClick={() => setOpen((prev) => !prev)}
            >
                <ChevronRight
                    size={iconSize}
                    className={twMerge(
                        "shrink-0 transition-transform",
                        open && "rotate-90",
                    )}
                />
                {summary}
            </button>
            {open && <div className={contentClassName}>{children}</div>}
        </div>
    );
}
