import { useState } from "react";
import { twMerge } from "tailwind-merge";
import dayjs from "dayjs";
import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
dayjs.extend(isSameOrAfter);
import { XIcon, PencilOffIcon } from "lucide-react";

import { age } from "@/utils/dates";
import { ToolBar, ToolBarButton, ToolBarButtonLabel } from "./toolbar";
import { useProcedureList } from "@/contexts/procedure-list-context";

import { ProcedureForm } from "@/forms/procedure-form";

function ProcedureEditor({
    procedure,
    className,
    onDiscard,
    onClose,
    onAfterSave,
    error,
}) {
    const { otDay, updateProcedureAndPatient } = useProcedureList();

    const [updatedProcedure, setUpdatedProcedure] = useState({
        nid: procedure?.expand?.patient?.nid || "",
        hospitalId: procedure?.expand?.patient?.hospitalId || "",
        name: procedure?.expand?.patient?.name || "",
        age: age(procedure?.expand?.patient?.dateOfBirth) || "",
        sex: procedure?.expand?.patient?.sex || "",
        phone: procedure?.expand?.patient?.phone || "",
        diagnosis: procedure?.diagnosis || "",
        comorbids: procedure?.comorbids || "",
        procedure: procedure?.procedure || "",
        addedDate: dayjs(procedure?.addedDate).format("YYYY-MM-DD") || "",
        addedBy: procedure?.addedBy || "",
        remarks: procedure?.remarks || "",
        duration: procedure?.duration || "",
        bed: procedure?.bed || "",
        anesthesia: procedure?.anesthesia || "",
        requirements: procedure?.requirements || "",
    });

    const handleUpdateProcedure = () => {
        const updatedPatientRecord = {
            // id: procedure.patient,
            address: "", //updatedProcedure.address,
            dateOfBirth: `${dayjs().year() - updatedProcedure.age}-01-01`, //updatedProcedure.dateOfBirth,
            hospitalId: updatedProcedure.hospitalId,
            name: updatedProcedure.name,
            nid: updatedProcedure.nid,
            phone: updatedProcedure.phone,
            sex: updatedProcedure.sex,
        };
        const updatedProcedureRecord = {
            // id: procedure.id,
            addedBy: updatedProcedure.addedBy,
            addedDate: updatedProcedure.addedDate,
            anesthesia: updatedProcedure.anesthesia,
            bed: updatedProcedure.bed,
            comorbids: updatedProcedure.comorbids,
            diagnosis: updatedProcedure.diagnosis,
            duration: updatedProcedure.duration,
            procedure: updatedProcedure.procedure,
            remarks: updatedProcedure.remarks,
            removed: updatedProcedure.removed,
            requirements: updatedProcedure.requirements,
        };

        updateProcedureAndPatient(
            procedure.patient,
            updatedPatientRecord,
            procedure.id,
            updatedProcedureRecord,
            otDay
        );
        onAfterSave();
    };

    return (
        <div className={twMerge("flex-auto bg-gray-100 rounded-lg", className)}>
            <ToolBar
                className={twMerge(
                    "col-span-4 bg-gray-200 rounded-tr-lg rounded-tl-lg md:rounded-tl-none transition-colors"
                )}
            >
                <ToolBarButton disabled={true}>
                    <ToolBarButtonLabel className={"min-w-0"}>
                        {!procedure.removed ? procedure.order : <>&nbsp;</>}
                    </ToolBarButtonLabel>
                </ToolBarButton>
                <ToolBarButton title="Discard" onClick={onDiscard}>
                    <PencilOffIcon width={16} height={16} />
                    <ToolBarButtonLabel>Discard</ToolBarButtonLabel>
                </ToolBarButton>
                <div className="flex-grow"></div>
                {onClose && (
                    <ToolBarButton
                        title="close"
                        disabled={false}
                        onClick={onClose}
                    >
                        <XIcon className="" width={16} height={16} />
                    </ToolBarButton>
                )}
            </ToolBar>
            {error?.type === "update" && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    Update Failed
                </div>
            )}
            {procedure.removed && (
                <div className="bg-red-400/20 rounded-md m-2 p-2 text-sm">
                    Removed
                </div>
            )}
            <div className="p-2">
                <ProcedureForm
                    value={updatedProcedure}
                    onChange={(value) => setUpdatedProcedure(value)}
                    surgeons={
                        otDay?.expand?.otList?.expand?.department?.expand
                            ?.activeSurgeons_via_department
                    }
                    errorFields={error?.response?.data || {}}
                />
                <div className="sm:flex sm:flex-row-reverse col-span-full mt-3">
                    <button
                        type="button"
                        onClick={handleUpdateProcedure}
                        className="inline-flex w-full justify-center rounded-md  px-3 py-2 text-sm font-semibold text-white shadow-xs  sm:ml-3 sm:w-auto bg-blue-600 hover:bg-blue-500"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onDiscard}
                        className="mt-3 sm:mt-0 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-xs ring-1 ring-gray-300 ring-inset hover:bg-gray-50  sm:w-auto"
                    >
                        Discard
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ProcedureEditor;
