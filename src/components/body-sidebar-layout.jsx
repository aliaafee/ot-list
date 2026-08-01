import { twMerge } from "tailwind-merge";
import { XIcon } from "lucide-react";

import { ToolBar, ToolBarButton } from "@/components/toolbar";

/**
 * BodySidebarLayout - Two pane layout of a main body and a sidebar
 *
 * On large screens the sidebar is a fixed width column next to the body. On
 * smaller screens it becomes an overlay panel with its own bar and close
 * button, shown only while `open` is true.
 *
 * The body is rendered as a direct flex child, so the component placed in it
 * should carry "lg:grow" on its own root to take up the remaining width.
 *
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Main body content
 * @param {ReactNode} [props.sidebar] - Sidebar content
 * @param {ReactNode} [props.sidebarTitle] - Label on the small screen sidebar bar
 * @param {boolean} [props.open=false] - Whether the sidebar shows on small screens
 * @param {function} [props.onClose] - Called when the small screen sidebar is closed
 * @param {string} [props.side="left"] - Which side the sidebar sits on, "left" or "right"
 * @param {string} [props.className] - Additional CSS classes for the container
 * @param {string} [props.sidebarClassName] - Additional CSS classes for the sidebar column
 */

function BodySidebarLayout({
    children,
    sidebar,
    sidebarTitle,
    open = false,
    onClose = () => {},
    side = "left",
    className,
    sidebarClassName,
}) {
    return (
        <div
            className={twMerge(
                "lg:flex lg:flex-col overflow-hidden grow",
                className,
            )}
        >
            <div
                className={twMerge(
                    "lg:flex lg:overflow-hidden grow",
                    // The body comes first in the markup, so the row is
                    // reversed to seat the sidebar on the left
                    side === "left" ? "lg:flex-row-reverse" : "lg:flex-row",
                )}
            >
                {children}

                <div
                    className={twMerge(
                        "bg-gray-600/50 top-0 h-[calc(100%-4rem)] w-full fixed overflow-hidden lg:static lg:w-72 lg:min-w-72 flex mt-16 lg:mt-0 lg:h-auto z-30",
                        !open && "hidden lg:flex",
                        sidebarClassName,
                    )}
                >
                    <div className="w-full sm:max-w-72 lg:mt-0 lg:grow flex flex-col">
                        <div className="bg-gray-300 lg:hidden flex flex-col">
                            <ToolBar className="h-10 bg-gray-200">
                                <div className="grow px-3 uppercase font-medium text-gray-500 text-xs">
                                    {sidebarTitle}
                                </div>
                                <ToolBarButton title="close" onClick={onClose}>
                                    <XIcon width={16} height={16} />
                                </ToolBarButton>
                            </ToolBar>
                        </div>
                        {sidebar}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default BodySidebarLayout;
