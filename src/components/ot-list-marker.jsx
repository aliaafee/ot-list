import { twMerge } from "tailwind-merge";
import { OtListColours } from "@/utils/colours";

function OtListMarker({ otList }) {
    return (
        <span
            className={twMerge(
                "text-xs py-0.5 px-1 ml-2 rounded-sm text-white max-w-20 block whitespace-nowrap overflow-hidden text-ellipsis",
                "bg-gray-500",
                OtListColours[otList.colour],
            )}
            title={otList.name}
        >
            {otList.name}
        </span>
    );
}

export default OtListMarker;
