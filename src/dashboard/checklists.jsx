import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import {
    CheckIcon,
    ChevronRightIcon,
    ListChecksIcon,
    LoaderCircleIcon,
    PlusIcon,
    ViewIcon,
    XIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";

import Button from "@/components/button";
import FormField from "@/components/form-field";
import MultiSelectField from "@/components/multi-select-field";
import ChecklistTemplateItems from "@/components/checklist-template-items";
import ChecklistPreview from "@/components/checklist-preview";
import ModalWindow from "@/modals/modal-window";
import { pb } from "@/lib/pb";
import { SCOPES, SCOPE_LABEL } from "@/lib/checklists";

/** Which target field each scope reads, and what to call it. */
const SCOPE_TARGET = {
    subspecialty: { field: "subspecialties", label: "Subspecialties" },
    site: { field: "sites", label: "Sites" },
    concept: { field: "concepts", label: "Procedure codes" },
};

/** The target fields, which a change of scope clears. */
const TARGET_FIELDS = ["subspecialties", "sites", "concepts"];

const STATUSES = [
    { value: true, label: "Active" },
    { value: false, label: "Inactive" },
];

/**
 * What /settings/checklists/new starts from. Inactive, so a template does
 * nothing until it has been given its items and switched on.
 */
const BLANK_TEMPLATE = {
    name: "",
    description: "",
    scope: "all",
    position: 0,
    active: false,
    subspecialties: [],
    sites: [],
    concepts: [],
};

/**
 * Checklists - the templates a procedure's checklist is assembled from.
 *
 * Admin only: templates are admin-write, and a page hidden entirely reads
 * better than one shown read-only. See specs/checklists/README.md.
 */
export default {
    title: "Checklists",
    icon: <ListChecksIcon width={16} height={16} />,
    adminOnly: true,
    /**
     * One template, at /settings/checklists/<template id>, or a new one at
     * /settings/checklists/new - where the shell hands us a null record.
     *
     * Everything about a template is edited here: the list is a list. An
     * existing template is written as it is changed, the way its items are
     * below; a new one is held until Create, because it does not exist yet and
     * `name` is required.
     */
    detail: {
        collection: "checklistTemplates",
        titleField: "name",
        newTitle: "New template",
        content: function ChecklistTemplate({ record }) {
            const creating = !record;
            const navigate = useNavigate();

            const [template, setTemplate] = useState(record ?? BLANK_TEMPLATE);
            const [sites, setSites] = useState([]);
            const [conceptOptions, setConceptOptions] = useState([]);
            const [subspecialties, setSubspecialties] = useState([]);
            const [error, setError] = useState("");
            const [saving, setSaving] = useState(false);
            // Writes still in flight - a count, since a blur and a select can
            // overlap - and whether the last one landed, shown for a moment.
            const [updating, setUpdating] = useState(0);
            const [saved, setSaved] = useState(false);

            useEffect(() => {
                if (!saved) return;
                const timer = setTimeout(() => setSaved(false), 2000);
                return () => clearTimeout(timer);
            }, [saved]);

            // Options for the target fields. Read from PocketBase rather than
            // from the bundled catalogue, because these are relation fields
            // and store record ids, which the bundled concepts do not carry.
            //
            // Every read passes an explicit `requestKey`. PocketBase derives
            // one from method + path by default and cancels any in-flight
            // request that shares it, so two components reading the same
            // collection at the same time abort each other - this concepts
            // read would otherwise collide with the catalogue context's.
            useEffect(() => {
                let ignore = false;
                (async () => {
                    try {
                        const siteRecords = await pb
                            .collection("procedureFacetValues")
                            .getFullList({
                                filter: 'facet = "site"',
                                sort: "+term",
                                requestKey: "checklist-admin-sites",
                            });
                        if (ignore) return;
                        setSites(
                            siteRecords.map((site) => ({
                                value: site.id,
                                label: site.term,
                            })),
                        );

                        const conceptRecords = await pb
                            .collection("procedureConcepts")
                            .getFullList({
                                sort: "+conceptId",
                                requestKey: "checklist-admin-concepts",
                            });
                        if (ignore) return;
                        setConceptOptions(
                            conceptRecords.map((concept) => ({
                                value: concept.id,
                                label: `${concept.conceptId} — ${concept.preferredTerm}`,
                            })),
                        );
                        setSubspecialties(
                            [
                                ...new Set(
                                    conceptRecords
                                        .map((concept) => concept.subspecialty)
                                        .filter(Boolean),
                                ),
                            ]
                                .sort()
                                .map((value) => ({ value, label: value })),
                        );
                    } catch (err) {
                        console.error("Error loading catalogue options:", err);
                        if (!ignore)
                            setError("Failed to load the catalogue options.");
                    }
                })();

                return () => {
                    ignore = true;
                };
            }, []);

            // The local copy moves first so a select does not snap back while
            // the write is in flight.
            const persist = async (patch) => {
                const previous = template;
                setTemplate((current) => ({ ...current, ...patch }));
                setError("");
                setSaved(false);
                setUpdating((n) => n + 1);
                try {
                    await pb
                        .collection("checklistTemplates")
                        .update(record.id, patch, {
                            requestKey: "checklist-admin-template-save",
                        });
                    setSaved(true);
                } catch (err) {
                    console.error("Error saving template:", err);
                    setTemplate(previous);
                    setError(err?.message || "Failed to save the change.");
                } finally {
                    setUpdating((n) => n - 1);
                }
            };

            /** A discrete choice: written as soon as it is made. */
            const change = (patch) => {
                if (creating) setTemplate((cur) => ({ ...cur, ...patch }));
                else persist(patch);
            };

            /** Typed into: held locally, written when the field is left. */
            const edit = (field) => (e) =>
                setTemplate((cur) => ({ ...cur, [field]: e.target.value }));

            const commit =
                (field, coerce = (v) => v, { required = false } = {}) =>
                () => {
                    if (creating) return;
                    const value = coerce(template[field]);
                    if (value === record[field]) return;
                    // A required field cannot be emptied, and the write would
                    // only be rejected: put back what was there and say so,
                    // rather than leaving the box blank under an error.
                    if (required && !value) {
                        setTemplate((cur) => ({
                            ...cur,
                            [field]: record[field],
                        }));
                        setError(`A template needs a ${field}.`);
                        return;
                    }
                    persist({ [field]: value });
                };

            // Changing scope clears the other two targets rather than leaving
            // them as orphans that silently never match - spec section 8.2.
            const changeScope = (scope) =>
                change({
                    scope,
                    ...Object.fromEntries(
                        TARGET_FIELDS.filter(
                            (field) => field !== SCOPE_TARGET[scope]?.field,
                        ).map((field) => [field, []]),
                    ),
                });

            const create = async () => {
                if (!template.name.trim()) {
                    setError("A template needs a name.");
                    return;
                }
                setSaving(true);
                setError("");
                try {
                    const created = await pb
                        .collection("checklistTemplates")
                        .create({
                            ...template,
                            name: template.name.trim(),
                            position: Number(template.position) || 0,
                        });
                    // replace, so Back goes to the list rather than to a
                    // create form for a template that now exists.
                    navigate(`/settings/checklists/${created.id}`, {
                        replace: true,
                    });
                } catch (err) {
                    console.error("Error creating template:", err);
                    setError(err?.message || "Failed to create the template.");
                    setSaving(false);
                }
            };

            const target = SCOPE_TARGET[template.scope];
            // Every save shares one request key, so a second write started
            // while one is in flight would cancel it. Lock the form instead.
            const busy = updating > 0;
            const targetOptions = {
                subspecialties,
                sites,
                concepts: conceptOptions,
            };

            return (
                <div className="flex flex-col gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-lg">Properties</h2>
                            {updating > 0 ? (
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                    <LoaderCircleIcon
                                        size={14}
                                        className="animate-spin"
                                    />
                                    Saving...
                                </span>
                            ) : (
                                saved && (
                                    <span className="flex items-center gap-1 text-xs text-green-700">
                                        <CheckIcon size={14} />
                                        Saved
                                    </span>
                                )
                            )}
                        </div>
                        {!!error && (
                            <div className="bg-red-400/20 rounded-md p-2 text-sm mb-2">
                                {error}
                            </div>
                        )}
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
                                onBlur={commit(
                                    "position",
                                    (v) => Number(v) || 0,
                                )}
                            />

                            <FormField
                                label="Status"
                                name="active"
                                disabled={busy}
                                type="select"
                                value={template.active}
                                onChange={(e) =>
                                    change({
                                        active: e.target.value === "true",
                                    })
                                }
                            >
                                {STATUSES.map((status) => (
                                    <option
                                        key={String(status.value)}
                                        value={status.value}
                                    >
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
                                onChange={(e) => changeScope(e.target.value)}
                            >
                                {SCOPES.map((scope) => (
                                    <option
                                        key={scope.value}
                                        value={scope.value}
                                    >
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
                                            options={
                                                targetOptions[target.field]
                                            }
                                            value={template[target.field]}
                                            emptyLabel="Nothing chosen, so this template matches nothing."
                                            disabled={busy}
                                            onChange={(items) =>
                                                change({
                                                    [target.field]: items,
                                                })
                                            }
                                        />
                                    </p>
                                </div>
                            )}
                        </div>
                        {creating && (
                            <div className="mt-3 flex gap-2">
                                <Button onClick={create} loading={saving}>
                                    Create template
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() =>
                                        navigate("/settings/checklists")
                                    }
                                >
                                    Cancel
                                </Button>
                            </div>
                        )}
                    </div>

                    <div>
                        <h2 className="text-lg mb-1">Items</h2>
                        {creating ? (
                            <p className="text-sm text-gray-600">
                                Items are added once the template exists.
                            </p>
                        ) : (
                            /* The record, not the local copy: the item editor
                               reloads on any change of identity to this prop
                               and reads only the id, so handing it a fresh
                               object on every property save would refetch. */
                            <ChecklistTemplateItems template={record} />
                        )}
                    </div>
                </div>
            );
        },
    },
    content: function Checklists() {
        const navigate = useNavigate();
        // The search lives in the URL so it survives opening a template and
        // coming back, which is the whole traffic pattern of this page.
        const [searchParams, setSearchParams] = useSearchParams();
        const search = searchParams.get("search") || "";

        const [templates, setTemplates] = useState([]);
        const [loading, setLoading] = useState(true);
        const [error, setError] = useState("");
        const [showPreview, setShowPreview] = useState(false);

        useEffect(() => {
            let ignore = false;
            (async () => {
                try {
                    const records = await pb
                        .collection("checklistTemplates")
                        .getFullList({
                            sort: "+position",
                            requestKey: "checklist-admin-templates",
                        });
                    if (ignore) return;
                    setTemplates(records);
                    setLoading(false);
                } catch (err) {
                    console.error("Error loading templates:", err);
                    if (ignore) return;
                    setError("Failed to load the templates.");
                    setLoading(false);
                }
            })();

            return () => {
                ignore = true;
            };
        }, []);

        const setSearch = (value) => {
            const params = new URLSearchParams(searchParams);
            if (value.trim()) params.set("search", value);
            else params.delete("search");
            setSearchParams(params, { replace: true });
        };

        // Few enough templates to filter in the browser, and it keeps the box
        // instant. Scope is matched by its label, which is what is on screen.
        const filtered = useMemo(() => {
            const query = search.trim().toLowerCase();
            if (!query) return templates;
            return templates.filter((template) =>
                [
                    template.name,
                    template.description,
                    SCOPE_LABEL[template.scope],
                ].some((field) => (field || "").toLowerCase().includes(query)),
            );
        }, [templates, search]);

        return (
            <div className="flex flex-col gap-6">
                <div>
                    <h2 className="text-lg mb-1">Templates</h2>

                    <div className="mb-2 flex gap-2">
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, description or what it applies to"
                                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                            {!!search && (
                                <button
                                    type="button"
                                    onClick={() => setSearch("")}
                                    className="absolute right-2 top-4 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                    title="Clear search"
                                >
                                    <XIcon width={14} height={14} />
                                </button>
                            )}
                        </div>
                        <Button
                            className="gap-2 whitespace-nowrap py-1"
                            onClick={() => navigate("/settings/checklists/new")}
                        >
                            <PlusIcon size={16} />
                            Add Template
                        </Button>
                        <Button
                            className="gap-2 whitespace-nowrap py-1"
                            variant="secondary"
                            onClick={() => setShowPreview(true)}
                        >
                            <ViewIcon size={16} />
                            Preview
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-red-400/20 rounded-md p-2 mb-2 text-sm">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            Loading templates...
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            {search.trim()
                                ? `No templates match "${search.trim()}".`
                                : "No templates yet."}
                        </div>
                    ) : (
                        <div className="border border-gray-300 rounded-md overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Name
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Applies to
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Order
                                        </th>
                                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                            Status
                                        </th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {filtered.map((template) => (
                                        <tr
                                            key={template.id}
                                            className="hover:bg-blue-200"
                                        >
                                            <td className="px-3 py-2 text-sm">
                                                <Link
                                                    to={`/settings/checklists/${template.id}`}
                                                    className="text-blue-700 hover:underline"
                                                >
                                                    {template.name}
                                                </Link>
                                                {!!template.description && (
                                                    <p className="text-xs text-gray-500">
                                                        {template.description}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                {SCOPE_LABEL[template.scope] ||
                                                    template.scope}
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                {template.position}
                                            </td>
                                            <td
                                                className={twMerge(
                                                    "px-3 py-2 text-sm",
                                                    !template.active &&
                                                        "text-gray-500",
                                                )}
                                            >
                                                {template.active
                                                    ? "Active"
                                                    : "Inactive"}
                                            </td>
                                            <td className="px-3 py-2 text-sm">
                                                <Link
                                                    to={`/settings/checklists/${template.id}`}
                                                    title={`Open ${template.name}`}
                                                    className="inline-flex p-1.5 rounded-full hover:bg-gray-400"
                                                >
                                                    <ChevronRightIcon
                                                        size={16}
                                                    />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {showPreview && (
                    <ModalWindow
                        title="Preview"
                        icon={<ViewIcon width={24} height={24} />}
                        iconColor="bg-blue-100 text-blue-600"
                        large
                        cancelLabel="Close"
                        onCancel={() => setShowPreview(false)}
                    >
                        <p className="text-sm text-gray-600 mb-2">
                            Pick the codes a procedure would carry and see what
                            it would be given, which template won each item, and
                            what was overridden.
                        </p>
                        {/* Nothing on this page edits a template, so the
                            preview is never showing data this page has made
                            stale. */}
                        <ChecklistPreview />
                    </ModalWindow>
                )}
            </div>
        );
    },
};
