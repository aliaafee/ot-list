import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ProcedureCodeBrowserModal from "@/modals/procedure-code-browser-modal";
import { api } from "@/lib/api";
import { GROUP_LABEL, SCOPE_LABEL, withGroupHeadings } from "@/lib/checklists";

/**
 * ChecklistPreview - what a procedure coded like this would actually get
 *
 * Calls the server so it runs the same assembly the write paths run. A copy
 * of the dedupe and specificity rules here would be a second implementation
 * of the subtlest logic in the feature, and it would drift silently while
 * still looking authoritative.
 *
 * Shows what was suppressed as well as what survived: the author's question
 * is almost always "why is my item not showing".
 *
 * @param {Object} props - Component props
 * @param {boolean} props.stale - Whether templates have been edited since the
 *   last run, so the result shown is out of date
 * @returns {JSX.Element} The preview pane
 */
function ChecklistPreview({ stale = false }) {
    const [concepts, setConcepts] = useState([]);
    const [result, setResult] = useState(null);
    const [browsing, setBrowsing] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);
    const [runKey, setRunKey] = useState(0);

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const response = await api.previewChecklist(
                    concepts.map((concept) => concept.conceptId),
                );
                if (ignore) return;
                setResult(response);
                setError("");
            } catch (err) {
                if (ignore) return;
                console.error("Preview failed:", err);
                setError(err?.message || "Preview failed.");
            } finally {
                if (!ignore) setLoading(false);
            }
        })();

        return () => {
            ignore = true;
        };
    }, [concepts, runKey]);

    const addConcept = (concept) => {
        setBrowsing(false);
        if (!concept) return;
        setConcepts((prev) =>
            prev.some((c) => c.conceptId === concept.conceptId)
                ? prev
                : [...prev, concept],
        );
    };

    const rows = withGroupHeadings(result?.items || []);

    return (
        <div className="flex flex-col gap-2">
            {stale && (
                <div className="bg-amber-50 border border-amber-400 rounded-md p-2 text-sm text-amber-800">
                    Templates have changed since this ran. Re-run to see the
                    current answer.
                </div>
            )}

            <div className="flex flex-wrap items-center gap-1">
                <span className="text-sm text-gray-600 mr-1">
                    Preview against:
                </span>
                {concepts.length === 0 && (
                    <span className="text-sm text-gray-500">
                        no codes — what a procedure with nothing coded gets
                    </span>
                )}
                {concepts.map((concept) => (
                    <span
                        key={concept.conceptId}
                        className="inline-flex items-center gap-1 text-xs bg-white border border-gray-300 rounded-full px-2 py-0.5"
                    >
                        <span className="font-mono text-gray-500">
                            {concept.conceptId}
                        </span>
                        {concept.preferredTerm}
                        <button
                            type="button"
                            className="text-gray-400 hover:text-red-600 cursor-pointer"
                            title="Remove"
                            onClick={() =>
                                setConcepts((prev) =>
                                    prev.filter(
                                        (c) =>
                                            c.conceptId !== concept.conceptId,
                                    ),
                                )
                            }
                        >
                            <XIcon size={12} />
                        </button>
                    </span>
                ))}
                <button
                    type="button"
                    className="text-sm text-blue-600 hover:bg-blue-100 rounded px-2 py-0.5 cursor-pointer"
                    onClick={() => setBrowsing(true)}
                >
                    Add a code
                </button>
                <button
                    type="button"
                    className="text-sm text-blue-600 hover:bg-blue-100 rounded px-2 py-0.5 cursor-pointer"
                    onClick={() => setRunKey((key) => key + 1)}
                >
                    Re-run
                </button>
            </div>

            {!!error && (
                <div className="bg-red-400/20 rounded-md p-2 text-sm">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="text-sm text-gray-500">Assembling...</div>
            ) : (
                result && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div>
                            <div className="text-sm font-semibold mb-1">
                                Assembled checklist ({result.items.length})
                            </div>
                            <ul className="text-sm bg-white rounded-md border border-gray-200 p-2">
                                {rows.length === 0 && (
                                    <li className="text-gray-500 text-xs">
                                        Nothing matches.
                                    </li>
                                )}
                                {rows.map((row) =>
                                    row.heading ? (
                                        <li
                                            key={row.key}
                                            className="text-xs font-semibold text-gray-500 mt-2 first:mt-0"
                                        >
                                            {GROUP_LABEL[row.heading] ||
                                                row.heading}
                                        </li>
                                    ) : (
                                        <li
                                            key={row.key}
                                            className="flex items-baseline gap-2 py-0.5"
                                        >
                                            <span className="grow">
                                                {row.item.label}
                                                {!row.item.required && (
                                                    <span className="text-xs text-gray-500">
                                                        {" "}
                                                        (advisory)
                                                    </span>
                                                )}
                                            </span>
                                            <span className="text-xs text-gray-400 shrink-0">
                                                {SCOPE_LABEL[
                                                    row.item.sourceScope
                                                ] || row.item.sourceScope}
                                            </span>
                                        </li>
                                    ),
                                )}
                            </ul>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <div className="text-sm font-semibold mb-1">
                                    Suppressed as duplicates (
                                    {result.suppressed.length})
                                </div>
                                <ul className="text-sm bg-white rounded-md border border-gray-200 p-2">
                                    {result.suppressed.length === 0 && (
                                        <li className="text-gray-500 text-xs">
                                            Nothing overridden.
                                        </li>
                                    )}
                                    {result.suppressed.map((entry) => (
                                        <li
                                            key={`${entry.templateId}-${entry.itemKey}`}
                                            className="py-0.5"
                                        >
                                            <span className="line-through text-gray-500">
                                                {entry.label}
                                            </span>
                                            <div className="text-xs text-gray-500">
                                                <span className="font-mono">
                                                    {entry.itemKey}
                                                </span>{" "}
                                                from {entry.templateName} —
                                                beaten by{" "}
                                                {entry.beatenByTemplateName}
                                                {entry.groupChanged && (
                                                    <span className="text-amber-700">
                                                        {" "}
                                                        (and moved to another
                                                        group)
                                                    </span>
                                                )}
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <div className="text-sm font-semibold mb-1">
                                    Matched templates ({result.templates.length}
                                    )
                                </div>
                                <ul className="text-sm bg-white rounded-md border border-gray-200 p-2">
                                    {result.templates.length === 0 && (
                                        <li className="text-gray-500 text-xs">
                                            No template matches.
                                        </li>
                                    )}
                                    {result.templates.map((template) => (
                                        <li
                                            key={template.id}
                                            className={twMerge(
                                                "py-0.5",
                                                !template.active &&
                                                    "text-gray-400",
                                            )}
                                        >
                                            {template.name}
                                            <span className="text-xs text-gray-500">
                                                {" — "}
                                                {SCOPE_LABEL[template.scope] ||
                                                    template.scope}
                                                , {template.contributed} item
                                                {template.contributed === 1
                                                    ? ""
                                                    : "s"}
                                            </span>
                                            {!template.active && (
                                                <span className="text-xs">
                                                    {" "}
                                                    (inactive)
                                                </span>
                                            )}
                                            {template.active &&
                                                template.contributed === 0 && (
                                                    <span className="text-xs text-amber-700">
                                                        {" "}
                                                        contributes nothing
                                                    </span>
                                                )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                )
            )}

            {browsing && (
                <ProcedureCodeBrowserModal
                    onCancel={() => setBrowsing(false)}
                    onSelect={addConcept}
                />
            )}
        </div>
    );
}

export default ChecklistPreview;
