import React from "react";
import { twMerge } from "tailwind-merge";

/**
 * LoadingSpinner - Small inline loading spinner
 *
 * @param {string} message - Optional loading message (currently unused)
 * @param {string} className - Additional CSS classes for the spinner container
 */
export function LoadingSpinner({ className }) {
    return (
        <div
            className={twMerge(
                "h-full flex flex-col items-center justify-center",
                className
            )}
        >
            <span className="border-[3px] border-black border-t-black/30 animate-spin rounded-full w-6 h-6"></span>
        </div>
    );
}

/**
 * LoadingSpinnerFull - Full-screen or large loading spinner with optional message
 *
 * @param {string} size - Size variant: 'small' or 'large' (default: 'large')
 * @param {string} message - Optional loading message to display
 * @param {string} className - Additional CSS classes for the spinner container
 */
export function LoadingSpinnerFull({ message, className }) {
    return (
        <div
            className={twMerge(
                "bg-white/50 fixed inset-0 z-100 w-screen h-screen flex flex-col items-center justify-center",
                className
            )}
        >
            <div className="text-center text-sm p-2 max-w-80">{message}</div>
            <span className="border-[3px] border-black/80 border-t-black/30 animate-spin rounded-full w-6 h-6"></span>
            {/* <div className="animate-spin w-8 h-8 rounded-full border-4 border-white border-t-black border-solid"></div> */}
        </div>
    );
}
