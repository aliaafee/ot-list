import React from "react";
import { twMerge } from "tailwind-merge";

export function LoadingSpinner({ message, className }) {
    return (
        <div
            className={twMerge(
                "h-full flex flex-col items-center justify-center",
                className
            )}
        >
            <div className="animate-spin w-4 h-4 rounded-full border-2 border-grey-200 border-t-black border-solid"></div>
        </div>
    );
}

export function LoadingSpinnerFull({ size = "large", message, className }) {
    if (size === "small") {
        return (
            <div
                className={twMerge(
                    "h-full flex flex-col items-center justify-center",
                    className
                )}
            >
                <div className="animate-spin w-4 h-4 rounded-full border-2 border-grey-200 border-t-black border-solid"></div>
            </div>
        );
    }
    return (
        <div className="bg-black/30 fixed inset-0 z-100 w-screen h-screen flex flex-col items-center justify-center">
            <div className="text-center text-sm p-2 max-w-80">{message}</div>
            <div className="animate-spin w-8 h-8 rounded-full border-4 border-white border-t-black border-solid"></div>
        </div>
    );
}
