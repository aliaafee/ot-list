import { useState } from "react";
import { twMerge } from "tailwind-merge";

import OtDaysEditor from "@/components/ot-days-editor";
import TitleBar from "@/components/title-bar";
import ProcedureListEditor from "@/components/procedure-list-editor";
import Panels from "@/components/panels";

export default function Home() {
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [showDaysList, setShowDaysList] = useState(true);

    return (
        <Panels
            title={<TitleBar />}
            sidebar={
                <OtDaysEditor
                    selectedDayId={selectedDayId}
                    onSelectDay={(dayId) => {
                        setSelectedDayId(dayId);
                        setShowDaysList(false);
                    }}
                    className={"grow overflow-y-auto"}
                />
            }
            content={
                <ProcedureListEditor
                    procedureDayId={selectedDayId}
                    className="overflow-hidden w-full h-full col-start-1 row-start-1 lg:col-start-3 lg:col-span-8 z-0"
                    showDaysList={() => setShowDaysList(true)}
                />
            }
            showSideBar={showDaysList}
        />
    );
}
