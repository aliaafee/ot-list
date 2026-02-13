import { useParams } from "react-router";
import { useEffect, useState } from "react";
import { ChevronLeftIcon, TestTubeIcon, XIcon } from "lucide-react";

import { twMerge } from "tailwind-merge";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import BodyLayout from "@/components/body-layout";

function OperatingRoom() {
    const { otDayId } = useParams();
    const [showSidebar, setShowSidebar] = useState(false);

    useEffect(() => {
        if (!otDayId) {
            setShowSidebar(true);
        }
    }, [otDayId]);

    const CurrentToolBar = () => (
        <ToolBar>
            <ToolBarButton
                title="OT Dates"
                disabled={false}
                onClick={() => setShowSidebar(true)}
                className="lg:hidden"
            >
                <ChevronLeftIcon width={16} height={16} />
                <ToolBarButtonLabel>Sidebar</ToolBarButtonLabel>
            </ToolBarButton>
            <div className="flex-grow"></div>
            <ToolBarButton title="Blank" disabled={false} onClick={() => {}}>
                <TestTubeIcon width={16} height={16} />
            </ToolBarButton>
        </ToolBar>
    );

    return (
        <div className="lg:flex lg:flex-col overflow-hidden grow">
            <div className="lg:flex lg:flex-row-reverse lg:overflow-hidden grow">
                <div className="flex flex-col overflow-y-auto lg:mt-0 mt-16 lg:grow">
                    <BodyLayout
                        className="lg:grow"
                        header={<CurrentToolBar />}
                    />
                </div>

                <div
                    className={twMerge(
                        "bg-gray-600/50 top-0 h-[calc(100%-4rem)] w-full fixed overflow-hidden lg:static lg:w-72 lg:min-w-72 flex mt-16 lg:mt-0 lg:h-auto z-30",
                        !showSidebar && "hidden lg:flex",
                    )}
                >
                    <div className="w-full sm:max-w-72 lg:mt-0 lg:grow flex flex-col bg-gray-200">
                        <div className="lg:hidden flex flex-col">
                            <ToolBar className="h-10 bg-gray-200">
                                <div className="grow px-3 uppercase font-medium text-gray-500 text-xs">
                                    Operating Room
                                </div>
                                <ToolBarButton
                                    title="close"
                                    disabled={false}
                                    onClick={() => setShowSidebar(false)}
                                >
                                    <XIcon
                                        className=""
                                        width={16}
                                        height={16}
                                    />
                                </ToolBarButton>
                            </ToolBar>
                        </div>
                        <div className="">Todays List</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default OperatingRoom;
