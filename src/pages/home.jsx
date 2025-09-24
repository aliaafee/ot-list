import { useState } from "react";
import { twMerge } from "tailwind-merge";

import OtDaysEditor from "@/components/ot-days-editor";
import TitleBar from "@/components/title-bar";
import ProcedureListEditor from "@/components/procedure-list-editor";

export default function Home() {
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [showDaysList, setShowDaysList] = useState(true);

    return (
        <div className="overflow-hidden flex flex-col h-screen w-screen">
            <TitleBar />
            <div className="grid grid-cols-1 print:grid-cols-1 lg:grid-cols-10 h-screen w-screen overflow-hidden">
                <div
                    className={twMerge(
                        "grid grid-col-1 col-start-1 row-start-1 bg-black/50",
                        "lg:col-start-1 lg:col-end-3 lg:col-span-2 z-10",
                        "overflow-hidden",
                        "print:hidden",
                        !showDaysList && "hidden lg:inline"
                    )}
                >
                    <OtDaysEditor
                        selectedDayId={selectedDayId}
                        onSelectDay={(dayId) => {
                            setSelectedDayId(dayId);
                            setShowDaysList(false);
                        }}
                        className={twMerge(
                            "overflow-y-auto w-full md:w-80 lg:w-full h-full"
                        )}
                    />
                </div>
                <ProcedureListEditor
                    procedureDayId={selectedDayId}
                    className="overflow-hidden w-full h-full col-start-1 row-start-1 lg:col-start-3 lg:col-span-8 z-0"
                    showDaysList={() => setShowDaysList(true)}
                />
            </div>
        </div>
    );
}
