import { ChevronLeft, Edit } from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import EditTable from "@/components/edit-table";
import { OtListColours } from "@/utils/colours";
import { useEffect, useState } from "react";
import { pb } from "@/lib/pb";
import { useAuth } from "@/contexts/auth-context";
import Accordion from "@/components/accordion";

function Settings({}) {
    const [departments, setDepartments] = useState([]);
    const [operatingRooms, setOperatingRooms] = useState([]);

    const { user } = useAuth();

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

    const accordionItems = [
        {
            title: "Departments",
            content: (
                <EditTable
                    collectionName="Departments"
                    columns={[
                        { field: "name", label: "Name" },
                        { field: "description", label: "Description" },
                        { field: "hospital", label: "Hospital" },
                    ]}
                    afterSave={fetchData}
                    readOnly={!(user?.role === "admin")}
                />
            ),
        },
        {
            title: "Operating Rooms",
            content: (
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
                    readOnly={!(user?.role === "admin")}
                />
            ),
        },
        {
            title: "Operating Lists",
            content: (
                <EditTable
                    collectionName="otLists"
                    columns={[
                        { field: "name", label: "Name" },
                        { field: "description", label: "Description" },
                        {
                            field: "department",
                            label: "Department",
                            type: "select",
                            options: [
                                { value: "", label: "select" },
                                ...departments,
                            ],
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
                />
            ),
        },
        {
            title: "Surgeons",
            content: (
                <EditTable
                    collectionName="surgeons"
                    columns={[
                        { field: "name", label: "Name" },
                        {
                            field: "department",
                            label: "Department",
                            type: "select",
                            options: [
                                { value: "", label: "select" },
                                ...departments,
                            ],
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
            ),
        },
    ];

    return (
        <BodyLayout header={<Tools />}>
            <h1 className="mb-2 text-xl">Settings</h1>
            <Accordion items={accordionItems} />
        </BodyLayout>
    );
}

export default Settings;
