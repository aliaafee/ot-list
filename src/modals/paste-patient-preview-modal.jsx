import { ClipboardPasteIcon } from "lucide-react";
import ModalWindow from "./modal-window";
import PatientInfo from "@/components/patient-info";
import LabelValue from "@/components/label-value";

/**
 * PastePatientPreviewModal - Preview patient information parsed from the clipboard
 * @param {Object} patient - Parsed patient fields to preview
 * @param {string} bed - Parsed bed number; the bed row is shown only when this is provided
 * @param {string} note - Note shown below the preview explaining how it will be applied
 * @param {Function} onApply - Callback when the pasted information is applied
 * @param {Function} onDiscard - Callback when the pasted information is discarded
 */
export default function PastePatientPreviewModal({
    patient,
    bed,
    note = "Blank fields will keep their current values.",
    onApply,
    onDiscard,
}) {
    return (
        <ModalWindow
            title="Pasted Patient Information"
            icon={<ClipboardPasteIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600 hover:bg-blue-500"
            okLabel="Apply"
            cancelLabel="Discard"
            onOk={onApply}
            onCancel={onDiscard}
            large={true}
        >
            <PatientInfo
                patient={patient}
                showAddress={true}
                className="px-0"
            />
            {bed !== undefined && (
                <LabelValue label="Bed" value={bed} className="pb-2" />
            )}
            {note && <div className="text-xs text-gray-600">{note}</div>}
        </ModalWindow>
    );
}
