import { useEffect, useState } from "react";
import { FileUpIcon } from "lucide-react";

import ModalWindow from "./modal-window";
import { api } from "@/lib/api";
import { SCOPE_LABEL, describeCriteria } from "@/lib/checklists";

/**
 * ImportChecklistTemplatesModal - shows what importing a file would do, then
 * does it
 *
 * Runs the import as a dry run first, against the same server code that does
 * the real import, so what is listed here is what will happen: which
 * templates are created, which are skipped because the name is taken, and any
 * warnings. A file with errors cannot be imported at all - the server refuses
 * it whole - so the errors are listed and there is no Import button.
 *
 * @param {Object} props - Component props
 * @param {Object} props.file - The parsed export file
 * @param {string} props.fileName - Shown so the admin knows which file this is
 * @param {function} props.onCancel - Closes without importing
 * @param {function} props.onImported - Called with the import result
 * @returns {JSX.Element} The modal
 */
function ImportChecklistTemplatesModal({ file, fileName, onCancel, onImported }) {
    // Off by default would let a file switch on templates that change what
    // new procedures get before anyone has looked at them.
    const [inactive, setInactive] = useState(true);
    const [plan, setPlan] = useState(null);
    const [checking, setChecking] = useState(true);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const result = await api.importChecklistTemplates(file, {
                    dryRun: true,
                    inactive,
                });
                if (ignore) return;
                setPlan(result);
                setError("");
            } catch (err) {
                if (ignore) return;
                console.error("Import check failed:", err);
                setError(err?.message || "Could not check the file.");
            } finally {
                if (!ignore) setChecking(false);
            }
        })();
        return () => {
            ignore = true;
        };
    }, [file, inactive]);

    const runImport = async () => {
        setImporting(true);
        setError("");
        try {
            const result = await api.importChecklistTemplates(file, {
                inactive,
            });
            if (!result.success) {
                // The data changed between the check and the import - a name
                // taken meanwhile, say. Show the fresh answer.
                setPlan(result);
                setImporting(false);
                return;
            }
            onImported(result);
        } catch (err) {
            console.error("Import failed:", err);
            setError(err?.message || "Import failed.");
            setImporting(false);
        }
    };

    const toCreate = plan?.templates || [];
    const errors = plan?.errors || [];
    const canImport = !checking && !!plan && !errors.length && toCreate.length > 0;

    return (
        <ModalWindow
            title="Import checklist templates"
            icon={<FileUpIcon width={24} height={24} />}
            iconColor="bg-blue-100 text-blue-600"
            okColor="bg-blue-600 hover:bg-blue-500"
            okLabel={
                toCreate.length
                    ? `Import ${toCreate.length} template${toCreate.length === 1 ? "" : "s"}`
                    : "Import"
            }
            cancelLabel="Cancel"
            large
            loading={importing}
            // No Import button at all until there is something valid to import.
            onOk={canImport ? runImport : null}
            onCancel={onCancel}
        >
            <p className="text-sm text-gray-600 mb-2">
                From <span className="font-mono">{fileName}</span>. Templates
                are added alongside the existing ones; a template whose name is
                already taken is skipped, never overwritten.
            </p>

            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input
                    type="checkbox"
                    checked={inactive}
                    disabled={importing}
                    onChange={(e) => {
                        setChecking(true);
                        setInactive(e.target.checked);
                    }}
                />
                Import as inactive, so nothing changes until each one is
                switched on
            </label>

            {!!error && (
                <div className="bg-red-400/20 rounded-md p-2 text-sm mb-2">
                    {error}
                </div>
            )}

            {checking ? (
                <div className="text-sm text-gray-500">Checking the file...</div>
            ) : (
                plan && (
                    <div className="flex flex-col gap-3 text-sm">
                        {errors.length > 0 && (
                            <div className="bg-red-50 border border-red-300 rounded-md p-2 text-red-800">
                                <div className="font-semibold">
                                    This file cannot be imported (
                                    {errors.length} problem
                                    {errors.length === 1 ? "" : "s"})
                                </div>
                                <p className="text-xs mb-1">
                                    Nothing will be written until every problem
                                    is fixed.
                                </p>
                                <ul className="list-disc ml-5 text-xs">
                                    {errors.map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div>
                            <div className="font-semibold mb-1">
                                To create ({toCreate.length})
                            </div>
                            {toCreate.length === 0 ? (
                                <div className="text-xs text-gray-500">
                                    Nothing new to import.
                                </div>
                            ) : (
                                <ul className="bg-white rounded-md border border-gray-200 p-2">
                                    {toCreate.map((template) => (
                                        <li key={template.name} className="py-0.5">
                                            {template.name}
                                            <span className="text-xs text-gray-500">
                                                {" — "}
                                                {SCOPE_LABEL[template.scope] ||
                                                    template.scope}
                                                {!!describeCriteria(template) &&
                                                    ` · ${describeCriteria(template)}`}
                                                , {template.items} item
                                                {template.items === 1 ? "" : "s"},{" "}
                                                {template.active
                                                    ? "active"
                                                    : "inactive"}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {plan.skipped.length > 0 && (
                            <div>
                                <div className="font-semibold mb-1">
                                    Skipped ({plan.skipped.length})
                                </div>
                                <ul className="bg-white rounded-md border border-gray-200 p-2 text-gray-600">
                                    {plan.skipped.map((entry, index) => (
                                        <li
                                            key={`${entry.name}-${index}`}
                                            className="py-0.5"
                                        >
                                            {entry.name}
                                            <span className="text-xs text-gray-500">
                                                {" — "}
                                                {entry.reason}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {plan.warnings.length > 0 && (
                            <div className="bg-amber-50 border border-amber-400 rounded-md p-2 text-amber-800">
                                <div className="font-semibold">
                                    Warnings ({plan.warnings.length})
                                </div>
                                <ul className="list-disc ml-5 text-xs">
                                    {plan.warnings.map((message) => (
                                        <li key={message}>{message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )
            )}
        </ModalWindow>
    );
}

export default ImportChecklistTemplatesModal;
