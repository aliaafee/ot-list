import BodyLayout from "@/components/body-layout";
import OtDaySidebar from "@/components/ot-day-sidebar";
import OtProcedureView from "@/components/ot-procedure-view";
import SidebarLayout from "@/components/sidebar-layout";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";
import { hospitalToday } from "@/lib/app-settings";
import { findOtDayOnDate } from "@/lib/ot-days";
import { MenuIcon, PlusIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

function OTWorkspace() {
    const { otDayId, otListId, procedureId } = useParams();
    const [showProcedureList, setShowProcedureList] = useState(!procedureId);
    const navigate = useNavigate();
    const { loadProcedures, subscribeProcedures } = useProcedureList();

    // With no day in the route, open today's date: the hospital's date, on
    // the first list by name when several run today. No list is made active,
    // so the sidebar starts with every list closed. When no list runs today,
    // the workspace stays on /ot.
    useEffect(() => {
        if (otDayId) return;
        let cancelled = false;
        findOtDayOnDate(hospitalToday())
            .then((day) => {
                if (!cancelled && day) {
                    navigate(`/ot/${day.id}`, { replace: true });
                }
            })
            .catch((error) => {
                console.error("Error fetching today's OT day:", error);
            });
        return () => {
            cancelled = true;
        };
    }, [otDayId, navigate]);

    // The page owns the open day, not the sidebar: the body will show the
    // same procedures from the same context.
    useEffect(() => {
        loadProcedures(otDayId);
        return subscribeProcedures(otDayId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [otDayId]);

    const procedureToolBar = (
        <ToolBar>
            <ToolBarButton
                title="Cases"
                disabled={false}
                onClick={() => setShowProcedureList(true)}
                className="lg:hidden"
            >
                <MenuIcon width={16} height={16} />
                <ToolBarButtonLabel>Cases</ToolBarButtonLabel>
            </ToolBarButton>
            <ToolBarButton
                title="Add Something"
                disabled={false}
                onClick={() => {}}
            >
                <PlusIcon width={16} height={16} />
                <ToolBarButtonLabel>Add Something</ToolBarButtonLabel>
            </ToolBarButton>
        </ToolBar>
    );

    return (
        <SidebarLayout
            sidebarTitle={"Cases"}
            open={showProcedureList}
            onClose={() => setShowProcedureList(false)}
            sidebar={
                <OtDaySidebar
                    otDayId={otDayId}
                    otListId={otListId}
                    selectedProcedureId={procedureId}
                    onNavigate={() => setShowProcedureList(false)}
                    className="grow"
                />
            }
        >
            <BodyLayout header={procedureToolBar}>
                <OtProcedureView otDayId={otDayId} procedureId={procedureId} />
            </BodyLayout>
        </SidebarLayout>
    );
}

export default OTWorkspace;
