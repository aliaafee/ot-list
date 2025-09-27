import { useState } from "react";

import OtDaysEditor from "@/components/ot-days-editor";
import ProcedureListEditor from "@/components/procedure-list-editor";
import TitleBar from "@/components/title-bar";
import { twMerge } from "tailwind-merge";

function Procedures() {
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [showDaysList, setShowDaysList] = useState(true);

    return (
        <div className="lg:overflow-hidden lg:h-screen lg:flex lg:flex-col">
            <TitleBar />
            <div className="lg:flex lg:flex-row-reverse lg:overflow-hidden">
                <ProcedureListEditor
                    procedureDayId={selectedDayId}
                    showDaysList={() => setShowDaysList(true)}
                    className="lg:grow"
                />
                <div
                    className={twMerge(
                        "bg-gray-600/50 top-0 h-full w-full fixed overflow-hidden lg:static lg:w-72 flex",
                        !showDaysList && "hidden lg:flex"
                    )}
                >
                    <OtDaysEditor
                        selectedDayId={selectedDayId}
                        onSelectDay={(dayId) => {
                            setSelectedDayId(dayId);
                            setShowDaysList(false);
                        }}
                        className={
                            "w-full max-w-72 overflow-y-auto mt-16 lg:mt-0 lg:grow"
                        }
                    />
                </div>
            </div>
        </div>
    );
}

export default Procedures;
