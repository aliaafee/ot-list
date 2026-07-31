import { twMerge } from "tailwind-merge";
import { OtListColours } from "@/utils/colours";

function OtListMarker({ otList }) {
    return (
        <span
            className={twMerge(
                "text-xs py-0.5 px-1 ml-2 rounded-sm text-white",
                "bg-gray-500",
                OtListColours[otList.colour],
            )}
        >
            {otList.name}
        </span>
    );
}

export default OtListMarker;
