import { TableIcon } from "lucide-react";

import EditTable from "@/components/edit-table";

/**
 * OperatingRooms - the theatres procedures are scheduled into.
 *
 * `afterSave` refreshes the dashboard's lookups, because the room list is a
 * multi-select on the Operating Lists page.
 */
export default {
    title: "OperatingRooms",
    icon: <TableIcon width={16} height={16} />,
    content: ({ isAdmin, refreshData }) => (
        <EditTable
            collectionName="operatingRooms"
            columns={[
                { field: "name", label: "Name" },
                { field: "description", label: "Description" },
                {
                    field: "disabled",
                    label: "Status",
                    type: "select",
                    options: [
                        { value: false, label: "Enabled" },
                        { value: true, label: "Disabled" },
                    ],
                },
            ]}
            afterSave={refreshData}
            readOnly={!isAdmin}
        />
    ),
};
