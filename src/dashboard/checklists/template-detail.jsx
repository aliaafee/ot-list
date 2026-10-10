import { useState } from "react";

import ChecklistTemplateItems from "@/components/checklist-template-items";

import DeleteTemplateModal from "./delete-template-modal";
import TemplateProperties from "./template-properties";
import useCatalogueOptions from "./use-catalogue-options";
import useKeyOverlaps from "./use-key-overlaps";
import useTemplateEditor from "./use-template-editor";

/**
 * One template, at /settings/checklists/<template id>, or a new one at
 * /settings/checklists/new - where the shell hands us a null record.
 *
 * Everything about a template is edited here: the list is a list. An existing
 * template is written as it is changed, the way its items are below; a new one
 * is held until Create, because it does not exist yet and `name` is required.
 */
export default function TemplateDetail({ record }) {
    const creating = !record;
    const editor = useTemplateEditor(record);
    const { options, error: optionsError } = useCatalogueOptions();
    const { overlaps, itemCount, reload } = useKeyOverlaps(
        record,
        editor.template,
    );
    const [confirmDelete, setConfirmDelete] = useState(false);

    return (
        <div className="flex flex-col gap-6">
            <TemplateProperties
                editor={editor}
                creating={creating}
                options={options}
                overlaps={overlaps}
                error={editor.error || optionsError}
                onDelete={() => setConfirmDelete(true)}
            />

            <div>
                <h2 className="text-lg mb-1">Items</h2>
                {creating ? (
                    <p className="text-sm text-gray-600">
                        Items are added once the template exists.
                    </p>
                ) : (
                    /* The record, not the local copy: the item editor reloads
                       on any change of identity to this prop and reads only
                       the id, so handing it a fresh object on every property
                       save would refetch. */
                    <ChecklistTemplateItems
                        template={record}
                        onChanged={reload}
                    />
                )}
            </div>

            {confirmDelete && (
                <DeleteTemplateModal
                    templateId={record.id}
                    name={editor.template.name}
                    itemCount={itemCount}
                    onCancel={() => setConfirmDelete(false)}
                />
            )}
        </div>
    );
}
