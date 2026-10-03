import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { DownloadIcon, PlusIcon, UploadIcon, ViewIcon } from "lucide-react";

import Button from "@/components/button";
import ErrorBanner from "@/components/error-banner";
import SearchBox from "@/components/search-box";
import ChecklistPreview from "@/components/checklist-preview";
import ModalWindow from "@/modals/modal-window";
import ImportChecklistTemplatesModal from "@/modals/import-checklist-templates-modal";
import { pb } from "@/lib/pb";
import { SCOPE_LABEL, describeCriteria } from "@/lib/checklists";

import TemplatesTable from "./templates-table";
import useTemplateTransfer from "./use-template-transfer";
import {
    ToolBar,
    ToolBarButton,
    ToolBarButtonLabel,
} from "@/components/toolbar";

/** Every template, searchable, with export, import and a preview. */
export default function TemplateList() {
    const navigate = useNavigate();
    // The search lives in the URL so it survives opening a template and
    // coming back, which is the whole traffic pattern of this page.
    const [searchParams, setSearchParams] = useSearchParams();
    const search = searchParams.get("search") || "";

    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [showPreview, setShowPreview] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);
    const fileInput = useRef(null);

    const transfer = useTemplateTransfer(() => setReloadKey((key) => key + 1));

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
                setLoadError("Failed to load the templates.");
                setLoading(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, [reloadKey]);

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
                describeCriteria(template),
            ].some((field) => (field || "").toLowerCase().includes(query)),
        );
    }, [templates, search]);

    const error = transfer.error || loadError;

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h2 className="text-lg mb-1">Templates</h2>
                <ToolBar className="bg-gray-200 rounded-lg mb-2">
                    <ToolBarButton
                        title="Add Template"
                        onClick={() => navigate("/settings/checklists/new")}
                    >
                        <PlusIcon size={16} />
                        <ToolBarButtonLabel>Add Template</ToolBarButtonLabel>
                    </ToolBarButton>
                    <ToolBarButton
                        title="Preview Template"
                        onClick={() => setShowPreview(true)}
                    >
                        <ViewIcon size={16} />
                        <ToolBarButtonLabel>Preview</ToolBarButtonLabel>
                    </ToolBarButton>
                    <div className="grow"></div>
                    <ToolBarButton
                        title="Export All Templates"
                        disabled={transfer.exporting}
                        onClick={transfer.exportTemplates}
                    >
                        <UploadIcon size={16} />
                        <ToolBarButtonLabel className="hidden sm:inline">
                            Export
                        </ToolBarButtonLabel>
                    </ToolBarButton>
                    <ToolBarButton
                        title="Import Templates fron File"
                        onClick={() => fileInput.current?.click()}
                    >
                        <DownloadIcon size={16} />
                        <ToolBarButtonLabel className="hidden sm:inline">
                            Import
                        </ToolBarButtonLabel>
                    </ToolBarButton>
                </ToolBar>

                <input
                    ref={fileInput}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={transfer.chooseImportFile}
                />

                <SearchBox
                    className="flex-1 mb-2"
                    value={search}
                    onChange={setSearch}
                    placeholder="Search by name, description or what it applies to"
                />

                {!!error && <ErrorBanner className="mb-2">{error}</ErrorBanner>}
                {!!transfer.notice && (
                    <div className="bg-green-100 border border-green-400 rounded-md p-2 mb-2 text-sm text-green-800">
                        {transfer.notice}
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
                    <TemplatesTable templates={filtered} />
                )}
            </div>

            {transfer.importing && (
                <ImportChecklistTemplatesModal
                    file={transfer.importing.file}
                    fileName={transfer.importing.fileName}
                    onCancel={transfer.cancelImport}
                    onImported={transfer.finishImport}
                />
            )}

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
                        Pick the codes a procedure would carry and the patient's
                        age and sex, and see what it would be given, which
                        template won each item, what was overridden, and what
                        the patient criteria left out.
                    </p>
                    {/* Nothing on this page edits a template, so the preview
                        is never showing data this page has made stale. */}
                    <ChecklistPreview />
                </ModalWindow>
            )}
        </div>
    );
}
