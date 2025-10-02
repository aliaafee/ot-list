import { useState } from "react";

import OtDaysEditor from "@/components/ot-days-editor";
import ProcedureListEditor from "@/components/procedure-list-editor";
import TitleBar from "@/components/title-bar";
import { twMerge } from "tailwind-merge";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import { XIcon } from "lucide-react";

function Procedures() {
    const [selectedDayId, setSelectedDayId] = useState(null);
    const [showDaysList, setShowDaysList] = useState(true);

    return (
        <div className="lg:overflow-hidden lg:h-screen lg:flex lg:flex-col">
            <TitleBar />
            <div className="lg:flex lg:flex-row-reverse lg:overflow-hidden grow">
                <ProcedureListEditor
                    procedureDayId={selectedDayId}
                    handleShowDaysList={() => setShowDaysList(true)}
                    className="lg:grow"
                />
                <div
                    className={twMerge(
                        "bg-gray-600/50 top-0 h-full w-full fixed overflow-hidden lg:static lg:w-72 flex",
                        !showDaysList && "hidden lg:flex"
                    )}
                >
                    <div className="w-full max-w-72  mt-16 lg:mt-0 lg:grow flex flex-col">
                        <ToolBar className="bg-gray-300 lg:hidden min-h-10">
                            <div className="grow" />
                            <ToolBarButton
                                title="close"
                                disabled={false}
                                onClick={() => setShowDaysList(false)}
                            >
                                <XIcon className="" width={16} height={16} />
                            </ToolBarButton>
                        </ToolBar>
                        <OtDaysEditor
                            selectedDayId={selectedDayId}
                            onSelectDay={(dayId) => {
                                setSelectedDayId(dayId);
                                setShowDaysList(false);
                            }}
                            className={"overflow-y-auto grow"}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Procedures;
