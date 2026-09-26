import { useEffect, useMemo, useState } from "react";
import { ListChecksIcon } from "lucide-react";

import EditTable from "@/components/edit-table";
import ChecklistTemplateItems from "@/components/checklist-template-items";
import ChecklistPreview from "@/components/checklist-preview";
import { pb } from "@/lib/pb";
import { SCOPES, SCOPE_LABEL } from "@/lib/checklists";

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
    content: function Checklists() {
        const [sites, setSites] = useState([]);
        const [conceptOptions, setConceptOptions] = useState([]);
        const [subspecialties, setSubspecialties] = useState([]);
        const [templates, setTemplates] = useState([]);
        const [selectedId, setSelectedId] = useState("");
        const [refreshKey, setRefreshKey] = useState(0);
        const [stale, setStale] = useState(false);

        // Options for the multi-select columns. Read from PocketBase rather
        // than from the bundled catalogue, because these are relation fields
        // and store record ids, which the bundled concepts do not carry.
        //
        // Every read here passes an explicit `requestKey`. PocketBase derives
        // one from method + path by default and cancels any in-flight request
        // that shares it, so two components reading the same collection at the
        // same time abort each other - the concepts read collides with the
        // catalogue context's, and the templates read below collides with the
        // EditTable's.
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
                }
            })();

            return () => {
                ignore = true;
            };
        }, []);

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
                    if (!ignore) setTemplates(records);
                } catch (err) {
                    console.error("Error loading templates:", err);
                }
            })();

            return () => {
                ignore = true;
            };
        }, [refreshKey]);

        const selected = useMemo(
            () => templates.find((template) => template.id === selectedId),
            [templates, selectedId],
        );

        const columns = useMemo(
            () => [
                { field: "name", label: "Name" },
                {
                    field: "scope",
                    label: "Applies to",
                    type: "select",
                    options: SCOPES,
                },
                {
                    field: "subspecialties",
                    label: "Subspecialties",
                    type: "multi-select",
                    options: subspecialties,
                },
                {
                    field: "sites",
                    label: "Sites",
                    type: "multi-select",
                    options: sites,
                },
                {
                    field: "concepts",
                    label: "Procedure codes",
                    type: "multi-select",
                    options: conceptOptions,
                },
                { field: "position", label: "Order" },
                {
                    field: "active",
                    label: "Status",
                    type: "select",
                    options: [
                        { value: true, label: "Active" },
                        { value: false, label: "Inactive" },
                    ],
                },
            ],
            [subspecialties, sites, conceptOptions],
        );

        return (
            <div className="flex flex-col gap-6">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-2 text-sm">
                    Editing a template does not change checklists that already
                    exist. A procedure picks up a reworded item only when its
                    procedure codes next change, because each checklist keeps
                    the wording it was created with.
                </div>

                <div>
                    <h2 className="text-lg mb-1">Templates</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        Only the column matching &quot;Applies to&quot; is read:
                        a template scoped to Site uses its Sites and ignores the
                        others. Where two templates share an item key, the more
                        specific one wins — all, then subspecialty, then site,
                        then procedure code.
                    </p>
                    <EditTable
                        collectionName="checklistTemplates"
                        columns={columns}
                        afterSave={() => {
                            setRefreshKey((key) => key + 1);
                            setStale(true);
                        }}
                    />
                </div>

                <div>
                    <h2 className="text-lg mb-1">Items</h2>
                    <select
                        className="text-sm py-1 px-2 rounded border border-gray-300 bg-white mb-2"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        <option value="">Select a template...</option>
                        {templates.map((template) => (
                            <option key={template.id} value={template.id}>
                                {template.name} (
                                {SCOPE_LABEL[template.scope] || template.scope})
                            </option>
                        ))}
                    </select>
                    <ChecklistTemplateItems
                        key={selectedId}
                        template={selected}
                        onChanged={() => setStale(true)}
                    />
                </div>

                <div>
                    <h2 className="text-lg mb-1">Preview</h2>
                    <p className="text-sm text-gray-600 mb-2">
                        Pick the codes a procedure would carry and see what it
                        would be given, which template won each item, and what
                        was overridden.
                    </p>
                    <ChecklistPreview stale={stale} />
                </div>
            </div>
        );
    },
};
