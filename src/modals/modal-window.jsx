import React from "react";
import { AlertTriangleIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import Button from "@/components/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import ModalContainer from "./modal-container";

/**
 * ModalWindow - Reusable modal dialog with customizable title, icon, and buttons
 * @param {string} title - Modal title text
 * @param {string} okLabel - Label for the OK/confirm button
 * @param {string} cancelLabel - Label for the cancel button
 * @param {Function} onOk - Callback when OK button is clicked
 * @param {Function} onCancel - Callback when cancel button is clicked
 * @param {React.ReactNode} icon - Icon element to display in the header
 * @param {string} iconColor - Tailwind classes for icon background and text color
 * @param {string} okColor - Tailwind classes for OK button color
 * @param {boolean} showButtons - Whether to show the button footer
 * @param {boolean} loading - Whether to show loading state on buttons
 * @param {boolean} large - Whether to use large modal size
 * @param {React.ReactNode} children - Content to display in the modal body
 * @param {React.ReactNode} customButtons - Custom button elements to replace default buttons
 */
export default function ModalWindow({
    title = "Alert",
    okLabel = "Ok",
    cancelLabel = "Cancel",
    onOk = null,
    onCancel = null,
    icon = <AlertTriangleIcon width={24} height={24} />,
    iconColor = "bg-red-100 text-red-600",
    okColor = "bg-red-600 hover:bg-red-500",
    showButtons = true,
    loading = false,
    large = false,
    children,
    customButtons = null,
}) {
    return (
        <ModalContainer large={large}>
            <div className="bg-gray-100 px-4 pt-4 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                    <div
                        className={twMerge(
                            "mx-auto flex size-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-10",
                            iconColor
                        )}
                    >
                        {icon}
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left grow">
                        <h3
                            className="text-base font-semibold text-gray-900"
                            id="dialog-title"
                        >
                            {title}
                        </h3>
                        <div className="mt-2">{children}</div>
                    </div>
                </div>
            </div>
            {showButtons && (
                <div className="bg-gray-200 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    {!!onOk && (
                        <Button
                            variant={
                                okColor.includes("red") ? "danger" : "primary"
                            }
                            onClick={() => onOk()}
                            disabled={loading}
                            loading={loading}
                            className="w-full sm:ml-3 sm:w-auto"
                        >
                            {okLabel}
                        </Button>
                    )}
                    {!!onCancel && (
                        <Button
                            variant="secondary"
                            onClick={() => onCancel()}
                            disabled={loading}
                            className="mt-3 sm:mt-0 w-full sm:w-auto"
                        >
                            {cancelLabel}
                        </Button>
                    )}
                    {customButtons}
                </div>
            )}
        </ModalContainer>
    );
}
