import { useState } from "react";
import { FolderTree } from "lucide-react";

import ModalWindow from "./modal-window";
import ProcedureCatalogueBrowser from "@/components/procedure-catalogue-browser";
import { useCatalogue } from "@/contexts/catalogue-context";

/**
 * ProcedureCodeBrowserModal - browse the NSPC catalogue as a collapsible
 * subspecialty -> procedure site -> concept tree, for cases where a
 * surgeon knows where a procedure lives but not what to type.
 *
 * Selection follows the same pick-then-confirm pattern as
 * PatientSearchModal: clicking a concept highlights it, "Select" confirms.
 * The tree itself is ProcedureCatalogueBrowser - this modal just wraps it
 * with a window chrome and lifts the selection up for the OK button.
 *
 * @param {function} onSelect - Called with the chosen catalogue concept.
 * @param {function} onCancel - Called when the modal is dismissed.
 * @param {string} initialConceptId - Concept ID to preselect and open the
 *   tree to, e.g. the currently coded value being edited.
 */
export default function ProcedureCodeBrowserModal({
    onSelect,
    onCancel,
    initialConceptId = null,
}) {
    const { concepts } = useCatalogue();
    const [selectedConceptId, setSelectedConceptId] = useState(
        initialConceptId,
    );

    const selectedConcept =
        concepts.find((c) => c.conceptId === selectedConceptId) ?? null;

    const handleConfirm = () => {
        if (selectedConcept) onSelect(selectedConcept);
    };

    return (
        <ModalWindow
            title="Browse procedure codes"
            icon={<FolderTree width={20} height={20} />}
            iconColor="bg-blue-100 text-blue-600"
            okLabel="Select"
            okColor="bg-blue-600 hover:bg-blue-500"
            onOk={handleConfirm}
            onCancel={onCancel}
            okDisabled={!selectedConcept}
            large={true}
        >
            <ProcedureCatalogueBrowser
                concepts={concepts}
                selectedConceptId={selectedConceptId}
                onSelectedConceptIdChange={setSelectedConceptId}
                onConfirm={onSelect}
                initialExpandConceptId={initialConceptId}
            />
        </ModalWindow>
    );
}
