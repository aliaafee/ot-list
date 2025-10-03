import { twMerge } from "tailwind-merge";

function LabelValue({ label, value, className, blank = <>&mdash;</> }) {
    return (
        <div className={twMerge("flex flex-col", className)}>
            {!!label ? (
                <span className=" text-gray-700 text-xs">{label}</span>
            ) : (
                <></>
            )}
            <span
                className={twMerge(
                    "text-gray-900 overflow-clip overflow-ellipsis",
                    !!label ? "p-1" : ""
                )}
            >
                <span className="select-all">{!!value ? value : blank}</span>
            </span>
        </div>
    );
}

export default LabelValue;
