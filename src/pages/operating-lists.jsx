import { useParams } from "react-router";
import { useEffect, useState } from "react";

import SidebarLayout from "@/components/sidebar-layout";
import OtDaysEditor from "@/components/ot-days-editor";
import ProcedureListEditor from "@/components/procedure-list-editor";

function OperatingLists() {
    const { otDayId } = useParams();
    const [showDaysList, setShowDaysList] = useState(false);

    useEffect(() => {
        if (!otDayId) {
            setShowDaysList(true);
        }
    }, [otDayId]);

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
                className="lg:grow"
            />
        </SidebarLayout>
    );
}

export default OperatingLists;
