import TitleBar from "@/components/title-bar";
import { Outlet } from "react-router";

function MainLayout() {
    return (
        <div className="flex flex-col lg:h-screen">
            <TitleBar />
            <Outlet />
        </div>
    );
}

export default MainLayout;
