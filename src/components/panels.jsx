import { twMerge } from "tailwind-merge";

/**
 * Panels - Two-panel layout with sidebar and main content
 *
 * @param {ReactNode} title - Title content to display at the top
 * @param {ReactNode} sidebar - Sidebar content (left panel)
 * @param {ReactNode} content - Main content (right panel)
 * @param {boolean} showSideBar - Whether to show the sidebar (default: true)
 */
function Panels({ title, sidebar, content, showSideBar = true }) {
    return (
        <div className="flex flex-col h-full overflow-hidden grow">
            <div className="bg-red-300">{title}</div>
            <div className="grid grid-cols-1 lg:flex lg:flex-row grow overflow-hidden">
                <div
                    className={twMerge(
                        "col-start-1 row-start-1 z-10 bg-black/50 overflow-hidden lg:w-72 flex flex-col",
                        !showSideBar && "hidden lg:flex"
                    )}
                >
                    <div className="w-full sm:w-72 lg:w-full overflow-hidden flex grow">
                        {sidebar}
                    </div>
                </div>
                <div className="col-start-1 row-start-1 z-0 bg-blue-400 grow overflow-hidden flex">
                    {content}
                </div>
            </div>
        </div>
    );
}

export default Panels;
