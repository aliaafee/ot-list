import { useState } from "react";
import { LibraryBigIcon } from "lucide-react";

import Button from "@/components/button";
import ProcedureCodeBrowser from "@/components/procedure-code-browser";
import { useCatalogue } from "@/contexts/catalogue-context";
import { UNCODED_CONCEPT_ID } from "@/lib/procedure-codes";
import ModalWindow from "./modal-window";

/**
 * ProcedureCodeBrowserModal - browse the whole catalogue as a
 * subspecialty -> site -> concept tree and pick one.
 *
 * Complements the type-ahead in ProcedureCodeSelector: search is faster when
 * you know what you want, this is for when you do not. The tree, filter and
 * detail card are ProcedureCodeBrowser; this owns the selection and the modal
 * frame. `onSelect` is called with the chosen catalogue concept (the same
 * object shape the selector's search results carry).
 *
 * @param {function} onSelect - Called with the chosen concept.
 * @param {function} onCancel - Called when the modal is dismissed.
 * @param {string} initialConceptId - Concept to preselect and expand to.
 * @param {string} title - Header text.
 */
export default function ProcedureCodeBrowserModal({
    onSelect = () => {},
    onCancel = () => {},
    initialConceptId = null,
    title = "Browse procedure codes",
}) {
    const { concepts } = useCatalogue();

    const [selectedConceptId, setSelectedConceptId] = useState(
        initialConceptId && initialConceptId !== UNCODED_CONCEPT_ID
            ? initialConceptId
            : null,
    );

    const selectedConcept =
        concepts.find((c) => c.conceptId === selectedConceptId) ?? null;

    const confirm = () => {
        if (selectedConcept) onSelect(selectedConcept);
    };

    return (
        <ModalWindow
            title={title}
            icon={<LibraryBigIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            large
            customButtons={
                <>
                    <Button
                        variant="primary"
                        onClick={confirm}
                        disabled={!selectedConcept}
                        className="w-full sm:ml-3 sm:w-auto"
                    >
                        Select
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => onCancel()}
                        className="mt-3 sm:mt-0 w-full sm:w-auto"
                    >
                        Cancel
                    </Button>
                </>
            }
        >
            <ProcedureCodeBrowser
                concepts={concepts}
                selectedConceptId={selectedConceptId}
                onSelectedConceptIdChange={setSelectedConceptId}
                onConfirm={onSelect}
                initialConceptId={initialConceptId}
            />
        </ModalWindow>
    );
}
