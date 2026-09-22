import { TableIcon } from "lucide-react";

import EditTable from "@/components/edit-table";

/**
 * Departments - the hospital departments an OT list can belong to.
 *
 * `afterSave` refreshes the dashboard's lookups, because the department list
 * is a dropdown on the Operating Lists and Surgeons pages.
 */
export default {
    title: "Departments",
    icon: <TableIcon width={16} height={16} />,
    content: ({ isAdmin, refreshData }) => (
        <EditTable
            collectionName="Departments"
            columns={[
                { field: "name", label: "Name" },
                { field: "description", label: "Description" },
                { field: "hospital", label: "Hospital" },
            ]}
            afterSave={refreshData}
            readOnly={!isAdmin}
        />
    ),
};
