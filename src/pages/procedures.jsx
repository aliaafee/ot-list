import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";

import OtDaysEditor from "@/components/ot-days-editor";
import ProcedureListEditor from "@/components/procedure-list-editor";
import { twMerge } from "tailwind-merge";
import { ToolBar, ToolBarButton } from "@/components/toolbar";

function Procedures() {
    const { otDayId } = useParams();
    const [showDaysList, setShowDaysList] = useState(false);

    useEffect(() => {
        if (!otDayId) {
            setShowDaysList(true);
        }
    }, [otDayId]);

    return (
        <div className="lg:flex lg:flex-col overflow-hidden grow">
            <div className="lg:flex lg:flex-row-reverse lg:overflow-hidden grow">
                <ProcedureListEditor
                    procedureDayId={otDayId}
                    handleShowDaysList={() => setShowDaysList(true)}
                    className="lg:grow"
                />

                <div
                    className={twMerge(
                        "bg-gray-600/50 top-0 h-full w-full fixed overflow-hidden lg:static lg:w-72 lg:min-w-72 flex",
                        !showDaysList && "hidden lg:flex"
                    )}
                >
                    <div className="w-full sm:max-w-72 lg:mt-0 lg:grow flex flex-col">
                        <div className="bg-gray-300 lg:hidden min-h-16 flex flex-col">
                            <div className="grow"></div>
                            <ToolBar className="">
                                <div className="grow" />
                                <ToolBarButton
                                    title="close"
                                    disabled={false}
                                    onClick={() => setShowDaysList(false)}
                                >
                                    <XIcon
                                        className=""
                                        width={16}
                                        height={16}
                                    />
                                </ToolBarButton>
                            </ToolBar>
                        </div>
                        <OtDaysEditor
                            selectedDayId={otDayId}
                            onSelectDay={(dayId) => {
                                setShowDaysList(false);
                            }}
                            className={"grow"}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Procedures;
