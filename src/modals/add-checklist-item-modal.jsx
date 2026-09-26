import { useState } from "react";
import { PlusIcon } from "lucide-react";

import ModalWindow from "./modal-window";
import FormField from "@/components/form-field";
import { api } from "@/lib/api";
import { GROUPS } from "@/lib/checklists";

/**
 * AddChecklistItemModal - Modal for adding a one-off checklist item
 *
 * The item belongs to this procedure alone rather than to a template, so it
 * survives a change of procedure codes (specs/checklists/README.md section 7).
 *
 * @param {Function} onCancel - Callback when modal is cancelled
 * @param {Function} onSuccess - Callback with the created item
 * @param {string} procedureId - ID of the procedure to add the item to
 * @param {string} defaultGroup - Group to preselect
 */
function AddChecklistItemModal({
    onCancel = () => {},
    onSuccess = () => {},
    procedureId,
    defaultGroup = "preop",
}) {
    const [label, setLabel] = useState("");
    const [group, setGroup] = useState(defaultGroup);
    const [required, setRequired] = useState(true);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");

    const handleAddItem = async () => {
        const trimmed = label.trim();
        if (!trimmed) {
            setError("Please enter what needs checking");
            return;
        }

        setAdding(true);
        setError("");

        try {
            const created = await api.addChecklistItem(procedureId, {
                label: trimmed,
                group,
                required,
            });

            setAdding(false);
            onSuccess(created);
        } catch (e) {
            console.error("Failed to add checklist item:", e);
            setError(e.message || "Failed to add checklist item");
            setAdding(false);
        }
    };

    return (
        <ModalWindow
            title="Add Checklist Item"
            okLabel="Add"
            onOk={handleAddItem}
            onCancel={onCancel}
            icon={<PlusIcon width={24} height={24} />}
            iconColor="bg-green-100 text-green-600"
            okColor="bg-green-600 hover:bg-green-500"
            loading={adding}
        >
            <p className="text-sm text-gray-600 mb-2">
                For this procedure only. It stays on the checklist even if the
                procedure codes change later.
            </p>
            <form>
                <FormField
                    label="What needs checking"
                    name="label"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="e.g. Ring the blood bank"
                    className="mb-2"
                    disabled={adding}
                />
                <FormField
                    label="When"
                    name="group"
                    type="select"
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                    className="mb-2"
                    disabled={adding}
                >
                    {GROUPS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </FormField>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        checked={required}
                        disabled={adding}
                        onChange={(e) => setRequired(e.target.checked)}
                    />
                    Counts towards the outstanding total
                </label>
            </form>
            {!!error && (
                <div className="bg-red-400/20 rounded-md mt-2 py-1 px-2">
                    {error}
                </div>
            )}
        </ModalWindow>
    );
}

export default AddChecklistItemModal;
