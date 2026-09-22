import { TableIcon } from "lucide-react";

import EditTable from "@/components/edit-table";
import { OtListColours } from "@/utils/colours";

/**
 * OperatingLists - the recurring lists, each owned by a department and run in
 * one or more theatres. The colour is what marks a list throughout the app.
 */
export default {
    title: "Operating Lists",
    icon: <TableIcon width={16} height={16} />,
    content: ({ isAdmin, departments, operatingRooms }) => (
        <EditTable
            collectionName="otLists"
            columns={[
                { field: "name", label: "Name" },
                { field: "description", label: "Description" },
                {
                    field: "department",
                    label: "Department",
                    type: "select",
                    options: [{ value: "", label: "select" }, ...departments],
                },
                {
                    field: "operatingRooms",
                    label: "OperatingRooms",
                    type: "multi-select",
                    options: operatingRooms,
                },
                {
                    field: "colour",
                    label: "Colour",
                    type: "select",
                    options: [
                        { value: "", label: "select" },
                        ...Object.keys(OtListColours).map((colour) => ({
                            value: colour,
                            label:
                                colour.charAt(0).toUpperCase() +
                                colour.slice(1),
                        })),
                    ],
                },
            ]}
            readOnly={!isAdmin}
        />
    ),
};
