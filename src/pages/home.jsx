import { useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import OtDaysEditor from "@/components/ot-days-editor";

export default function Home() {
    const { user, logout } = useAuth();
    const [selectedDay, setSelectedDay] = useState(null);

    return (
        <div className="">
            <div className="sticky top-0 h-8 bg-gray-200 p-1 text-right">
                {user?.name || user?.email} [<a onClick={logout}>Logout</a>]
            </div>
            <OtDaysEditor
                selectedDay={selectedDay}
                onSelectDay={(day) => setSelectedDay(day)}
            />
        </div>
    );
}
