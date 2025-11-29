import React from "react";
import { AlertTriangleIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { LoadingSpinner } from "@/components/loading-spinner";
import ModalContainer from "./modal-container";

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
                        <button
                            type="button"
                            className={twMerge(
                                "cursor-pointer inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs  sm:ml-3 sm:w-auto",
                                okColor
                            )}
                            onClick={() => onOk()}
                            disabled={loading}
                        >
                            {loading && (
                                <LoadingSpinner
                                    size="small"
                                    className={"mr-2"}
                                />
                            )}
                            {okLabel}
                        </button>
                    )}
                    {!!onCancel && (
                        <button
                            type="button"
                            className="cursor-pointer mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50 sm:mt-0 sm:w-auto"
                            onClick={() => onCancel()}
                            disabled={loading}
                        >
                            {cancelLabel}
                        </button>
                    )}
                </div>
            )}
        </ModalContainer>
    );
}
