import { TableIcon } from "lucide-react";

import EditTable from "@/components/edit-table";

/**
 * Surgeons - who a procedure can be added by, per department. A disabled
 * surgeon stays on old procedures but is no longer offered on new ones.
 */
export default {
    title: "Surgeons",
    icon: <TableIcon width={16} height={16} />,
    content: ({ isAdmin, departments }) => (
        <EditTable
            collectionName="surgeons"
            columns={[
                { field: "name", label: "Name" },
                {
                    field: "department",
                    label: "Department",
                    type: "select",
                    options: [{ value: "", label: "select" }, ...departments],
                },
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
            readOnly={!isAdmin}
        />
    ),
};
