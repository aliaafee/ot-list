import { useState } from "react";

import OtDaysEditor from "@/components/ot-days-editor";
import TitleBar from "@/components/title-bar";

export default function Home() {
    const [selectedDay, setSelectedDay] = useState(null);

    return (
        <div className="">
            <TitleBar />
            <OtDaysEditor
                selectedDay={selectedDay}
                onSelectDay={(day) => setSelectedDay(day)}
            />
        </div>
    );
}
