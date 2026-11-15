import BodyLayout from "@/components/body-layout";
import SidebarLayout from "@/components/sidebar-layout";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router";

function OTWorkspace() {
    const { otDayId } = useParams();
    const { procedureId } = useParams();
    const [showProcedureList, setShowProcedureList] = useState(!procedureId);

    const handleShowProcedureList = () => {
        setShowProcedureList(true);
    };

    const procedureToolBar = (
        <ToolBar>
            <ToolBarButton
                title="OT Dates"
                disabled={false}
                onClick={handleShowProcedureList}
                // className="lg:hidden"
            >
                <MenuIcon width={16} height={16} />
                <ToolBarButtonLabel>Cases</ToolBarButtonLabel>
            </ToolBarButton>
        </ToolBar>
    );

    return (
        <SidebarLayout
            sidebarTitle={"Cases"}
            open={showProcedureList}
            onClose={() => {
                setShowProcedureList(false);
            }}
            sidebar={<div className="bg-gray-200 grow">List here</div>}
        >
            <BodyLayout header={procedureToolBar}>
                <div>Procedure write</div>
            </BodyLayout>
        </SidebarLayout>
    );
}

export default OTWorkspace;
