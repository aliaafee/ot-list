import { useState } from "react";
import { useNavigate } from "react-router";
import { TrashIcon } from "lucide-react";

import ErrorBanner from "@/components/error-banner";
import ModalWindow from "@/modals/modal-window";
import { pb } from "@/lib/pb";

/**
 * Confirms and deletes a template, then goes back to the list.
 *
 * The template's items go with it (cascade). Procedures keep the rows already
 * built from it - those are snapshots, and their `sourceTemplate` is simply
 * cleared - until their next rebuild, which removes untouched ones and keeps
 * ticked or commented ones as no longer applying. Spec sections 2 and 7.
 */
export default function DeleteTemplateModal({
    templateId,
    name,
    itemCount,
    onCancel,
}) {
    const navigate = useNavigate();
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState("");

    const deleteTemplate = async () => {
        setDeleting(true);
        setError("");
        try {
            await pb.collection("checklistTemplates").delete(templateId);
            navigate("/settings/checklists", { replace: true });
        } catch (err) {
            console.error("Error deleting template:", err);
            setError(err?.message || "Failed to delete the template.");
            setDeleting(false);
        }
    };

    return (
        <ModalWindow
            title="Delete template"
            icon={<TrashIcon width={24} height={24} />}
            iconColor="bg-red-100 text-red-600"
            okLabel="Delete"
            cancelLabel="Cancel"
            loading={deleting}
            onOk={deleteTemplate}
            onCancel={onCancel}
        >
            <p className="mb-2">
                Delete <strong>{name}</strong> and its {itemCount} item
                {itemCount === 1 ? "" : "s"}? This cannot be undone.
            </p>
            <p className="mb-2 text-sm text-gray-600">
                Procedures keep the items already on their checklists until the
                checklist is next rebuilt. Then untouched items from this
                template are removed, and ticked or commented ones stay, marked
                as no longer applying.
            </p>
            <p className="text-sm text-gray-600">
                To stop it applying without losing it, set its status to
                Inactive instead.
            </p>
            {!!error && <ErrorBanner className="mt-2">{error}</ErrorBanner>}
        </ModalWindow>
    );
}
