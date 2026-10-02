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
import checklistsPage from "@/dashboard/checklists";

/**
 * The settings pages, keyed by the :page segment of the route ("settings" is
 * the bare /settings landing).
 *
 * This object is the whole navigation: the sidebar lists it and the body
 * renders whichever entry the route names. Each page lives in its own file
 * under src/dashboard and default-exports { title, icon, adminOnly?, content },
 * so adding one is a file there and a line here.
 *
 * A page that outgrows one file - one with a `detail`, or past a few hundred
 * lines - becomes a folder, src/dashboard/<page>/, whose index.jsx is only
 * that descriptor and imports its components and hooks from beside it. The
 * import here does not change. See src/dashboard/checklists.
 *
 * `content` is a component rather than a ready-made element: most of these
 * tables need the lookups and the permission this dashboard holds, and it is
 * mounted rather than called, so a page can hold state and effects of its own
 * the way the dashboard page's health check does.
 *
 * A page may also carry a `detail`, which is what /settings/<page>/<id>
 * renders in place of `content`:
 *
 *   detail: {
 *       collection: "checklistTemplates",  // read with getOne(id)
 *       titleField: "name",                // for the breadcrumb
 *       newTitle: "New template",          // breadcrumb for /<page>/new
 *       content: Component,                // gets { record, ...page props }
 *   }
 *
 * The record is loaded here rather than by the detail page so that the
 * breadcrumb, the missing-record state and the remount on id change are the
 * same on every page instead of being rebuilt on each one. A detail page that
 * needs more than one record can ignore `collection` and load its own.
 *
 * /<page>/new is the one id that names no record: nothing is read, and the
 * detail page is handed `record: null` to mean "creating". A PocketBase id is
 * fifteen characters, so "new" can never be one.
 */
const NEW_DETAIL_ID = "new";
const sidebarPages = {
    settings: systemInfo,
    users: users,
    departments: departmentsPage,
    operatingrooms: operatingRoomsPage,
    operatinglists: operatingListsPage,
    surgeons: surgeonsPage,
    checklists: checklistsPage,
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

/**
 * The one record a detail route names.
 *
 * `detail` is the page's detail descriptor from the registry above, which is
 * module-level and so stable enough to depend on directly. Passing null - a
 * list route, or a page that has no detail view - leaves this idle rather than
 * fetching. A record that will not load is reported as absent rather than as
 * an error of its own: for a mistyped or deleted id the page is simply not
 * there, which the body already knows how to say.
 */
function useDetailRecord(detail, detailId) {
    // Keyed by the id it was loaded for, so a record left over from the
    // previous id is never handed back as this one's. That is also what makes
    // `loading` derivable instead of a second piece of state to keep in step.
    const [loaded, setLoaded] = useState({ id: null, record: null });

    useEffect(() => {
        if (!detail || !detailId) return;

        let ignore = false;
        (async () => {
            let record = null;
            try {
                record = await pb
                    .collection(detail.collection)
                    .getOne(detailId, {
                        requestKey: `settings-detail-${detail.collection}`,
                    });
            } catch (err) {
                console.error("Error loading detail record:", err);
            }
            if (!ignore) setLoaded({ id: detailId, record });
        })();

        return () => {
            ignore = true;
        };
    }, [detail, detailId]);

    const settled = loaded.id === detailId;
    return {
        record: settled ? loaded.record : null,
        loading: !!detail && !!detailId && !settled,
    };
}

function SettingsDashboard() {
    const { page = "settings", detailId } = useParams();
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

    // A detail route on a page that has no detail view is a route that does not
    // exist, and reads the same way as an unknown page name.
    const detail = detailId ? (current?.detail ?? null) : null;
    const creating = !!detail && detailId === NEW_DETAIL_ID;
    // Nothing to read when creating, so the hook is left idle.
    const { record: detailRecord, loading: detailLoading } = useDetailRecord(
        creating ? null : detail,
        detailId,
    );
    const DetailContent = detail?.content ?? null;

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

    // What every page is handed. Detail pages get the same, plus their record.
    const pageProps = { isAdmin, departments, operatingRooms, refreshData };

    const notFound = (
        <div className="text-gray-500 py-8 text-center">
            There is no &quot;{page}&quot; settings page.
        </div>
    );

    let body;
    if (!PageContent || (detailId && !detail)) {
        body = notFound;
    } else if (detail) {
        if (detailLoading) {
            body = <div className="text-gray-500 py-8">Loading...</div>;
        } else if (!creating && !detailRecord) {
            body = (
                <div className="text-gray-500 py-8 text-center">
                    That {current.title.toLowerCase()} entry no longer exists.{" "}
                    <Link
                        to={`/settings/${page}`}
                        className="text-blue-700 hover:underline"
                    >
                        Back to {current.title}
                    </Link>
                </div>
            );
        } else {
            body = (
                <>
                    <h1 className="mb-2 text-xl">
                        <Link
                            to={`/settings/${page}`}
                            className="text-blue-700 hover:underline"
                        >
                            {current.title}
                        </Link>
                        <span className="text-gray-400 mx-2">/</span>
                        {creating
                            ? (detail.newTitle ?? "New")
                            : detailRecord[detail.titleField]}
                    </h1>
                    {/* Keyed so moving between records mounts the detail page
                        from scratch, for the same reason pages are. */}
                    <DetailContent
                        key={detailId}
                        record={detailRecord}
                        {...pageProps}
                    />
                </>
            );
        }
    } else {
        body = (
            <>
                <h1 className="mb-2 text-xl">{current.title}</h1>
                <PageContent {...pageProps} />
            </>
        );
    }

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
            <BodyLayout header={settingsToolbar}>{body}</BodyLayout>
        </SidebarLayout>
    );
}

export default SettingsDashboard;
