import { ChevronLeft, Edit } from "lucide-react";
import BodyLayout from "@/components/body-layout";
import { ToolBar, ToolBarButtonLabel, ToolBarLink } from "@/components/toolbar";
import EditTable from "@/components/edit-table";

function Settings({}) {
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
            />
            <h2 className="mb-2 text-lg">Operating Rooms</h2>
            <p>Manage your operating rooms here.</p>
            <h2 className="mb-2 text-lg">Operating Lists</h2>
            <p>Manage your operating lists here.</p>
            <h2 className="mb-2 text-lg">Surgeons</h2>
            <p>Manage your surgeons here.</p>
        </BodyLayout>
    );
}

export default Settings;
