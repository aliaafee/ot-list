import { useNavigate } from "react-router";
import { TrashIcon } from "lucide-react";

import Button from "@/components/button";
import ErrorBanner from "@/components/error-banner";
import FormField from "@/components/form-field";
import MultiSelectField from "@/components/multi-select-field";
import AgeBoundField from "@/components/age-bound-field";
import SaveStatus from "@/components/save-status";
import {
    SCOPES,
    SCOPE_TARGET,
    SEXES,
    describeAgeRange,
} from "@/lib/checklists";

import KeyOverlapWarning from "./key-overlap-warning";

const STATUSES = [
    { value: true, label: "Active" },
    { value: false, label: "Inactive" },
];

/**
 * The Properties section of a template: its fields, the overlap warning, and
 * Create or Delete.
 *
 * @param {object} editor - What useTemplateEditor returns
 * @param {boolean} creating - Whether the template does not exist yet
 * @param {object} options - Target field options, from useCatalogueOptions
 * @param {Array} overlaps - From useKeyOverlaps
 * @param {string} error - The message to show, if any
 * @param {function} onDelete - Asks to delete the template
 */
export default function TemplateProperties({
    editor,
    creating,
    options,
    overlaps,
    error,
    onDelete,
}) {
    const navigate = useNavigate();
    const { template, edit, commit, change } = editor;

    const target = SCOPE_TARGET[template.scope];
    // Every save shares one request key, so a second write started while one
    // is in flight would cancel it. Lock the form instead.
    const busy = editor.updating;

    return (
        <div>
            <div className="flex items-center gap-3 mb-1">
                <h2 className="text-lg">Properties</h2>
                <SaveStatus saving={editor.updating} saved={editor.saved} />
                {!creating && (
                    <button
                        type="button"
                        className="ml-auto flex items-center gap-1 text-sm text-red-600 hover:bg-red-100 rounded px-2 py-1 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={busy}
                        onClick={onDelete}
                    >
                        <TrashIcon size={14} />
                        Delete template
                    </button>
                )}
            </div>
            {!!error && <ErrorBanner className="mb-2">{error}</ErrorBanner>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 bg-gray-100 p-2 rounded-lg">
                <FormField
                    label="Name"
                    name="name"
                    disabled={busy}
                    value={template.name ?? ""}
                    className="md:col-span-2"
                    onChange={edit("name")}
                    onBlur={commit("name", (v) => v.trim(), {
                        required: true,
                    })}
                />

                <FormField
                    label="Order"
                    name="position"
                    disabled={busy}
                    type="number"
                    value={template.position ?? 0}
                    onChange={edit("position")}
                    onBlur={commit("position", (v) => Number(v) || 0)}
                />

                <FormField
                    label="Status"
                    name="active"
                    disabled={busy}
                    type="select"
                    value={template.active}
                    onChange={(e) =>
                        change({ active: e.target.value === "true" })
                    }
                >
                    {STATUSES.map((status) => (
                        <option key={String(status.value)} value={status.value}>
                            {status.label}
                        </option>
                    ))}
                </FormField>

                <FormField
                    label="Description"
                    name="description"
                    disabled={busy}
                    type="textarea"
                    value={template.description ?? ""}
                    className="md:col-span-2"
                    onChange={edit("description")}
                    onBlur={commit("description")}
                />

                <FormField
                    label="Applies to"
                    name="scope"
                    disabled={busy}
                    type="select"
                    value={template.scope}
                    onChange={(e) => editor.changeScope(e.target.value)}
                >
                    {SCOPES.map((scope) => (
                        <option key={scope.value} value={scope.value}>
                            {scope.label}
                        </option>
                    ))}
                </FormField>

                {!!target && (
                    <div className="flex flex-col md:col-span-2">
                        <span className="text-xs text-left text-gray-700">
                            {target.label}
                        </span>
                        <p>
                            <MultiSelectField
                                label={target.label}
                                options={options[target.field]}
                                value={template[target.field]}
                                emptyLabel="Nothing chosen, so this template matches nothing."
                                disabled={busy}
                                onChange={(items) =>
                                    change({ [target.field]: items })
                                }
                            />
                        </p>
                    </div>
                )}

                <div className="flex flex-col md:col-span-2">
                    <span className="text-xs text-left text-gray-700">Sex</span>
                    <p>
                        <MultiSelectField
                            label="Sex"
                            options={SEXES}
                            value={template.sexes || []}
                            emptyLabel="Any sex"
                            disabled={busy}
                            onChange={editor.changeSexes}
                        />
                    </p>
                </div>

                <div className="flex flex-wrap items-end gap-4 md:col-span-2">
                    <AgeBoundField
                        key={`min-${template.ageMinMonths || 0}`}
                        label="From age"
                        months={template.ageMinMonths || 0}
                        disabled={busy}
                        onCommit={(months) =>
                            editor.changeAge("ageMinMonths", months)
                        }
                    />
                    <AgeBoundField
                        key={`max-${template.ageMaxMonths || 0}`}
                        label="Under age"
                        months={template.ageMaxMonths || 0}
                        disabled={busy}
                        onCommit={(months) =>
                            editor.changeAge("ageMaxMonths", months)
                        }
                    />
                    <span className="text-sm text-gray-600 pb-1">
                        {describeAgeRange(
                            template.ageMinMonths || 0,
                            template.ageMaxMonths || 0,
                        ) || "Any age"}
                    </span>
                </div>

                <KeyOverlapWarning
                    overlaps={overlaps}
                    className="md:col-span-2"
                />
            </div>
            {creating && (
                <div className="mt-3 flex gap-2">
                    <Button onClick={editor.create} loading={editor.saving}>
                        Create template
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => navigate("/settings/checklists")}
                    >
                        Cancel
                    </Button>
                </div>
            )}
        </div>
    );
}
