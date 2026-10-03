import { useState } from "react";

import { api } from "@/lib/api";
import { hospitalToday } from "@/lib/app-settings";
import { downloadJson } from "@/utils/download";

/**
 * Export of every template to a file, and import from one.
 *
 * Import is two steps: `chooseImportFile` reads and parses the file into
 * `importing`, for the import modal to check on the server before anything is
 * written, and `finishImport` takes the modal's result.
 *
 * @param {function} onImported - Called once an import has written templates
 */
export default function useTemplateTransfer(onImported) {
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    // The parsed file waiting for the admin to confirm, and its name.
    const [importing, setImporting] = useState(null);

    // Downloads every template as one file. Built from the server's export,
    // which writes catalogue ids rather than record ids so the file imports
    // into another database.
    const exportTemplates = async () => {
        setExporting(true);
        setError("");
        setNotice("");
        try {
            const data = await api.exportChecklistTemplates();
            downloadJson(
                data,
                `checklist-templates-${hospitalToday()}.json`,
            );
        } catch (err) {
            console.error("Error exporting templates:", err);
            setError(err?.message || "Failed to export the templates.");
        } finally {
            setExporting(false);
        }
    };

    const chooseImportFile = async (e) => {
        const chosen = e.target.files?.[0];
        // Cleared so choosing the same file again still fires a change.
        e.target.value = "";
        if (!chosen) return;
        setError("");
        setNotice("");
        try {
            const file = JSON.parse(await chosen.text());
            setImporting({ file, fileName: chosen.name });
        } catch (err) {
            console.error("Error reading import file:", err);
            setError(`${chosen.name} is not a valid JSON file.`);
        }
    };

    const cancelImport = () => setImporting(null);

    const finishImport = (result) => {
        setImporting(null);
        setNotice(
            `Imported ${result.created} template${result.created === 1 ? "" : "s"}` +
                (result.skipped.length
                    ? `; skipped ${result.skipped.length} whose name was already taken.`
                    : "."),
        );
        onImported();
    };

    return {
        exporting,
        exportTemplates,
        importing,
        chooseImportFile,
        cancelImport,
        finishImport,
        error,
        notice,
    };
}
