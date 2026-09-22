import { Link, useParams } from "react-router";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";
import { ChevronLeft, MenuIcon } from "lucide-react";

import SidebarLayout from "@/components/sidebar-layout";
import BodyLayout from "@/components/body-layout";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
    ToolBarLink,
} from "@/components/toolbar";
import { useTreeKeyboardNav } from "@/hooks/use-tree-keyboard-nav";
import { useAuth } from "@/contexts/auth-context";
import { pb } from "@/lib/pb";

import systemInfo from "@/dashboard/system-info";
import users from "@/dashboard/users";
import departmentsPage from "@/dashboard/departments";
import operatingRoomsPage from "@/dashboard/operating-rooms";
import operatingListsPage from "@/dashboard/operating-lists";
import surgeonsPage from "@/dashboard/surgeons";

/**
 * The settings pages, keyed by the :page segment of the route ("settings" is
 * the bare /settings landing).
 *
 * This object is the whole navigation: the sidebar lists it and the body
 * renders whichever entry the route names. Each page lives in its own file
 * under src/dashboard and default-exports { title, icon, adminOnly?, content },
 * so adding one is a file there and a line here.
 *
 * `content` is a component rather than a ready-made element: most of these
 * tables need the lookups and the permission this dashboard holds, and it is
 * mounted rather than called, so a page can hold state and effects of its own
 * the way the dashboard page's health check does.
 */
const sidebarPages = {
    settings: systemInfo,
    users: users,
    departments: departmentsPage,
    operatingrooms: operatingRoomsPage,
    operatinglists: operatingListsPage,
    surgeons: surgeonsPage,
};

const sidebarLinks = Object.entries(sidebarPages).map(
    ([name, { title, icon, adminOnly }]) =>
        name === "settings"
            ? { name, icon, title, adminOnly, to: `/settings` }
            : {
                  name,
                  icon,
                  title,
                  adminOnly,
                  to: `/settings/${name}`,
              },
);

const SidebarLinks = ({ pages, onSelect = () => {} }) => {
    const { page = "settings" } = useParams();
    const { ref: treeRef, onKeyDown: treeKeyDown } = useTreeKeyboardNav();

    return (
        <ul
            ref={treeRef}
            onKeyDown={treeKeyDown}
            className="flex flex-col p-2 gap-2 overflow-y-auto overscroll-contain grow"
        >
            {pages.map(({ name, icon, title, to }) => (
                <li key={name}>
                    <Link
                        to={to}
                        data-tree-item
                        aria-current={page === name ? "page" : undefined}
                        onClick={onSelect}
                        className={twMerge(
                            "flex w-full p-2 cursor-pointer hover:bg-blue-200 items-center gap-2 rounded-md",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600",
                            page === name && "bg-blue-300 hover:bg-blue-300",
                        )}
                    >
                        {icon}
                        {title}
                    </Link>
                </li>
            ))}
        </ul>
    );
};

function SettingsDashboard() {
    const { page = "settings" } = useParams();
    const [showSideBar, setShowSideBar] = useState(true);

    const { isAdmin } = useAuth();

    const [departments, setDepartments] = useState([]);
    const [operatingRooms, setOperatingRooms] = useState([]);
    const [refreshKey, setRefreshKey] = useState(0);

    const refreshData = () => setRefreshKey((k) => k + 1);

    // The lookups the Operating Lists and Surgeons tables offer as options.
    // Loaded here rather than inside either table because both need them, and
    // reloaded after a save so a department added on one page shows up in the
    // dropdowns on the others.
    useEffect(() => {
        let ignore = false;
        const loadData = async () => {
            const gotDepartments = await pb
                .collection("departments")
                .getFullList();
            if (!ignore) {
                setDepartments(
                    gotDepartments.map((dept) => ({
                        label: dept.name,
                        value: dept.id,
                    })),
                );
            }

            const gotOperatingRooms = await pb
                .collection("operatingRooms")
                .getFullList();
            if (!ignore) {
                setOperatingRooms(
                    gotOperatingRooms.map((room) => ({
                        label: room.name,
                        value: room.id,
                    })),
                );
            }
        };
        loadData();
        return () => {
            ignore = true;
        };
    }, [refreshKey]);

    const pages = sidebarLinks.filter((link) => isAdmin || !link.adminOnly);
    // A page this user cannot see reads as missing rather than forbidden, so
    // the sidebar and the body agree on what exists.
    const current = pages.some((link) => link.name === page)
        ? sidebarPages[page]
        : null;
    // Mounted as an element below, not called: a page owns its own state and
    // effects, and switching pages should mount the new one from scratch.
    const PageContent = current?.content ?? null;

    const settingsToolbar = (
        <ToolBar>
            <ToolBarButton
                title="Settings"
                disabled={false}
                onClick={() => setShowSideBar(true)}
                className="lg:hidden"
            >
                <MenuIcon width={16} height={16} />
                <ToolBarButtonLabel>Settings</ToolBarButtonLabel>
            </ToolBarButton>
            <ToolBarLink title="Home" to="/">
                <ChevronLeft width={16} height={16} />
                <ToolBarButtonLabel>Home</ToolBarButtonLabel>
            </ToolBarLink>
        </ToolBar>
    );

    return (
        <SidebarLayout
            sidebarTitle="Settings"
            open={showSideBar}
            onClose={() => setShowSideBar(false)}
            sidebar={
                <div className="bg-gray-200 overflow-hidden flex flex-col grow">
                    <SidebarLinks
                        pages={pages}
                        onSelect={() => setShowSideBar(false)}
                    />
                </div>
            }
        >
            <BodyLayout header={settingsToolbar}>
                {PageContent ? (
                    <>
                        <h1 className="mb-2 text-xl">{current.title}</h1>
                        <PageContent
                            isAdmin={isAdmin}
                            departments={departments}
                            operatingRooms={operatingRooms}
                            refreshData={refreshData}
                        />
                    </>
                ) : (
                    <div className="text-gray-500 py-8 text-center">
                        There is no &quot;{page}&quot; settings page.
                    </div>
                )}
            </BodyLayout>
        </SidebarLayout>
    );
}

export default SettingsDashboard;
