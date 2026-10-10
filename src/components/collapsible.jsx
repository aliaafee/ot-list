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
 * @param {boolean} [props.open] - Controls the state instead, when given
 * @param {function} [props.onOpenChange] - Called with the state the toggle
 *   asks for; required to change a controlled one
 * @param {number} [props.iconSize=12] - Chevron size in pixels
 * @param {string} [props.className] - Optional classes for the wrapper
 * @param {string} [props.summaryClassName] - Optional classes for the toggle
 * @param {string} [props.contentClassName] - Optional classes for the content
 * @param {Ref} [props.ref] - Attached to the wrapper, e.g. to scroll to it
 * @returns {JSX.Element} A collapsible section
 */
export default function Collapsible({
    summary,
    children,
    defaultOpen = false,
    open: openProp,
    onOpenChange,
    iconSize = 12,
    className = "",
    summaryClassName = "",
    contentClassName = "",
    ref,
}) {
    const [openState, setOpenState] = useState(defaultOpen);
    const controlled = openProp !== undefined;
    const open = controlled ? openProp : openState;

    const toggle = () => {
        if (!controlled) setOpenState(!open);
        onOpenChange?.(!open);
    };

    return (
        <div ref={ref} className={twMerge("flex flex-col", className)}>
            <button
                type="button"
                aria-expanded={open}
                className={twMerge(
                    "flex items-center gap-1 text-left cursor-pointer",
                    summaryClassName,
                )}
                onClick={toggle}
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
