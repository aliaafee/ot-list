import { ChevronLeft, Edit } from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import EditTable from "@/components/edit-table";
import { OtListColours } from "@/utils/colours";
import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";

function Settings({}) {
    const [departments, setDepartments] = useState([]);
    const [operatingRooms, setOperatingRooms] = useState([]);

    const fetchData = async () => {
        const gotDepartments = await pb.collection("departments").getFullList();
        setDepartments(
            gotDepartments.map((dept) => ({ label: dept.name, value: dept.id }))
        );

        const gotOperatingRooms = await pb
            .collection("operatingRooms")
            .getFullList();
        setOperatingRooms(
            gotOperatingRooms.map((room) => ({
                label: room.name,
                value: room.id,
            }))
        );
    };

    useEffect(() => {
        fetchData();
    }, []);

    const Tools = () => (
        <ToolBar>
            <ToolBarLink title="Home" to="/">
                <ChevronLeft width={16} height={16} />
                <ToolBarButtonLabel>Home</ToolBarButtonLabel>
            </ToolBarLink>
        </ToolBar>
    );
    return (
        <BodyLayout header={<Tools />}>
            <h1 className="mb-2 text-xl">Settings</h1>
            <h2 className="mb-2 text-lg">Departments</h2>
            <EditTable
                collectionName="Departments"
                columns={[
                    { field: "name", label: "Name" },
                    { field: "description", label: "Description" },
                    { field: "hospital", label: "Hospital" },
                ]}
                afterSave={fetchData}
            />
            <h2 className="my-2 text-lg">Operating Rooms</h2>
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
                afterSave={fetchData}
            />
            <h2 className="my-2 text-lg">Operating Lists</h2>
            <EditTable
                collectionName="otLists"
                columns={[
                    { field: "name", label: "Name" },
                    { field: "description", label: "Description" },
                    {
                        field: "department",
                        label: "Department",
                        type: "select",
                        options: departments,
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
                        options: Object.keys(OtListColours).map((colour) => ({
                            value: colour,
                            label:
                                colour.charAt(0).toUpperCase() +
                                colour.slice(1),
                        })),
                    },
                ]}
            />
            <h2 className="my-2 text-lg">Surgeons</h2>
            <EditTable
                collectionName="surgeons"
                columns={[
                    { field: "name", label: "Name" },
                    {
                        field: "department",
                        label: "Department",
                        type: "select",
                        options: departments,
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
            />
        </BodyLayout>
    );
}

export default Settings;
