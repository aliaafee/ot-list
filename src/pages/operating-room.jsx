import { useParams } from "react-router";
import { useEffect, useState } from "react";
import {
    ChevronLeftIcon,
    PrinterIcon,
    TestTubeIcon,
    XIcon,
} from "lucide-react";

import { twMerge } from "tailwind-merge";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";
import BodyLayout from "@/components/body-layout";
import SidebarLayout from "@/components/sidebar-layout";

function OperatingRoom() {
    // const { otDayId } = useParams();
    // const [showSidebar, setShowSidebar] = useState(false);

    // useEffect(() => {
    //     if (!otDayId) {
    //         setShowSidebar(true);
    //     }
    // }, [otDayId]);

    // const CurrentToolBar = () => (
    //     <ToolBar>
    //         <ToolBarButton
    //             title="OT Dates"
    //             disabled={false}
    //             onClick={() => setShowSidebar(true)}
    //             className="lg:invisible"
    //         >
    //             <ChevronLeftIcon width={16} height={16} />
    //             <ToolBarButtonLabel>Sidebar</ToolBarButtonLabel>
    //         </ToolBarButton>
    //     </ToolBar>
    // );

    // return (
    //     <div className="lg:flex lg:flex-col overflow-hidden grow">
    //         <div className="lg:flex lg:flex-row-reverse lg:overflow-hidden grow">
    //             <div className="flex flex-col overflow-y-auto lg:mt-0 mt-16 lg:grow">
    //                 <BodyLayout
    //                     className="lg:grow"
    //                     header={<CurrentToolBar />}
    //                 />
    //             </div>

    //             <div
    //                 className={twMerge(
    //                     "bg-gray-600/50 top-0 h-[calc(100%-4rem)] w-full fixed overflow-hidden lg:static lg:w-72 lg:min-w-72 flex mt-16 lg:mt-0 lg:h-auto z-30",
    //                     !showSidebar && "hidden lg:flex",
    //                 )}
    //             >
    //                 <div className="w-full sm:max-w-72 lg:mt-0 lg:grow flex flex-col bg-gray-200">
    //                     <div className="lg:hidden flex flex-col">
    //                         <ToolBar className="h-10 bg-gray-200">
    //                             <div className="grow px-3 uppercase font-medium text-gray-500 text-xs">
    //                                 Operating Room
    //                             </div>
    //                             <ToolBarButton
    //                                 title="close"
    //                                 disabled={false}
    //                                 onClick={() => setShowSidebar(false)}
    //                             >
    //                                 <XIcon
    //                                     className=""
    //                                     width={16}
    //                                     height={16}
    //                                 />
    //                             </ToolBarButton>
    //                         </ToolBar>
    //                     </div>
    //                     <div className="">Todays List</div>
    //                 </div>
    //             </div>
    //         </div>
    //     </div>
    // );

    const ToolbarItems = () => (
        <>
            <ToolBarButton
                title="Print List"
                disabled={false}
                onClick={() => {}}
                className=""
            >
                <PrinterIcon width={16} height={16} />
                <ToolBarButtonLabel>Print List</ToolBarButtonLabel>
            </ToolBarButton>
        </>
    );

    return (
        <SidebarLayout
            sidebarTitle="Operating List"
            showSidebarButtonTitle="OT List"
            sidebarContent={<div className="">Todays List</div>}
            toolBarItems={<ToolbarItems />}
        >
            <div className="text-center text-gray-500">
                <TestTubeIcon className="mx-auto mb-2" size={48} />
                <div className="text-lg font-medium">Operating Room</div>
                <div className="text-sm">
                    Select an Case to view the details
                </div>
            </div>
        </SidebarLayout>
    );
}

export default OperatingRoom;
