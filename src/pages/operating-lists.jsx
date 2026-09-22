import { useParams } from "react-router";
import { useState } from "react";

import SidebarLayout from "@/components/sidebar-layout";
import OtDaysEditor from "@/components/ot-days-editor";
import ProcedureListEditor from "@/components/procedure-list-editor";

function OperatingLists() {
    const { otDayId } = useParams();
    const [showDaysList, setShowDaysList] = useState(!otDayId);

    // Reopen the sidebar whenever the route drops back to no selected day.
    const [prevOtDayId, setPrevOtDayId] = useState(otDayId);
    if (prevOtDayId !== otDayId) {
        setPrevOtDayId(otDayId);
        if (!otDayId) {
            setShowDaysList(true);
        }
    }

    return (
        <SidebarLayout
            sidebarTitle="Lists"
            open={showDaysList}
            onClose={() => setShowDaysList(false)}
            sidebar={
                <OtDaysEditor
                    selectedDayId={otDayId}
                    onSelectDay={() => setShowDaysList(false)}
                    className="grow"
                />
            }
        >
            <ProcedureListEditor
                procedureDayId={otDayId}
                handleShowDaysList={() => setShowDaysList(true)}
            />
        </SidebarLayout>
    );
}

export default OperatingLists;
