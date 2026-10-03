import { useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import ProcedureCodeBrowserModal from "@/modals/procedure-code-browser-modal";
import { api } from "@/lib/api";
import {
    GROUP_LABEL,
    PATIENT_FACTS,
    PATIENT_FACT_LABEL,
    PRIORITIES,
    SCOPE_LABEL,
    SEXES,
    describeCriteria,
    formatAgeMonths,
    withGroupHeadings,
} from "@/lib/checklists";
import ErrorBanner from "@/components/error-banner";

/** Why a criterion excluded a template, for the preview codes and patient. */
function describeExclusion(failure, patient) {
    // Priority is a code's, not the patient's: the template found a code in
    // its scope, but none at a priority it lists.
    if (failure.field === "priority") {
        return failure.reason === "unknown"
            ? "no priority recorded"
            : "no code at that priority";
    }
    if (failure.reason === "unknown") {
        return failure.field === "age" ? "age unknown" : "sex unknown";
    }
    if (failure.field === "age") {
        return `patient is ${formatAgeMonths(patient.ageMonths)}`;
    }
    return `patient is ${patient.sex}`;
}

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
    // The preview patient. Both start unknown - the narrowest case, as for a
    // patient with nothing recorded - with every template that needed a
    // value listed as excluded, so what is being left out is visible at once.
    const [ageText, setAgeText] = useState("");
    const [ageUnit, setAgeUnit] = useState("years");
    const [sex, setSex] = useState("");

    // An age, not a date of birth: the author asks "what does a 14-year-old
    // get", and inventing two dates to say that adds nothing.
    const ageNumber = ageText.trim() === "" ? null : Number(ageText);
    const ageMonths =
        ageNumber === null
            ? null
            : ageUnit === "years"
              ? ageNumber * 12
              : ageNumber;
    const ageValid =
        ageMonths === null || (Number.isInteger(ageMonths) && ageMonths >= 0);
    const patient = {
        ageMonths: ageValid ? ageMonths : null,
        sex: sex || null,
    };

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const response = await api.previewChecklist(
                    concepts.map((concept) => ({
                        conceptId: concept.conceptId,
                        priority: concept.priority || null,
                    })),
                    patient,
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
        // `patient` is rebuilt each render; its two values are the real deps.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [concepts, runKey, patient.ageMonths, patient.sex]);

    const addConcept = (concept) => {
        setBrowsing(false);
        if (!concept) return;
        // Priority starts not recorded - the narrowest case, as for a code
        // entered without one: every priority-specific template is left out
        // and listed with its reason.
        setConcepts((prev) =>
            prev.some((c) => c.conceptId === concept.conceptId)
                ? prev
                : [...prev, { ...concept, priority: "" }],
        );
    };

    // Per code, not one for the preview: priority is a qualifier on each
    // code, and a mixed-priority procedure is the case worth reproducing.
    const setPriority = (conceptId, priority) =>
        setConcepts((prev) =>
            prev.map((c) => (c.conceptId === conceptId ? { ...c, priority } : c)),
        );

    const rows = withGroupHeadings(result?.items || []);
    const matchedTemplates = (result?.templates || []).filter(
        (template) => !template.excludedBy,
    );
    const excludedTemplates = (result?.templates || []).filter(
        (template) => template.excludedBy,
    );
    const missing = result?.missingFacts || [];
    const missingPatient = missing.filter((field) =>
        PATIENT_FACTS.includes(field),
    );

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
                        <select
                            value={concept.priority}
                            title="Priority this code is recorded at"
                            className="border border-gray-300 rounded bg-white text-xs"
                            onChange={(e) =>
                                setPriority(concept.conceptId, e.target.value)
                            }
                        >
                            <option value="">Priority not recorded</option>
                            {PRIORITIES.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
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

            <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-gray-600">Patient:</span>
                <input
                    type="number"
                    min={0}
                    step={1}
                    value={ageText}
                    placeholder="age unknown"
                    className={twMerge(
                        "w-32 px-2 py-0.5 border border-gray-300 rounded-md bg-white text-sm",
                        !ageValid && "border-red-500",
                    )}
                    onChange={(e) => setAgeText(e.target.value)}
                />
                <select
                    value={ageUnit}
                    className="px-1 py-0.5 border border-gray-300 rounded-md bg-white text-sm"
                    onChange={(e) => setAgeUnit(e.target.value)}
                >
                    <option value="years">years</option>
                    <option value="months">months</option>
                </select>
                <select
                    value={sex}
                    className="px-1 py-0.5 border border-gray-300 rounded-md bg-white text-sm"
                    onChange={(e) => setSex(e.target.value)}
                >
                    <option value="">Sex unknown</option>
                    {SEXES.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                {!ageValid && (
                    <span className="text-xs text-red-600">
                        Age must be a whole number of months; previewing as
                        unknown.
                    </span>
                )}
            </div>

            {!!error && <ErrorBanner>{error}</ErrorBanner>}

            {!loading && missingPatient.length > 0 && (
                <div className="bg-amber-50 border border-amber-400 rounded-md p-2 text-sm text-amber-800">
                    {missingPatient
                        .map((field) => PATIENT_FACT_LABEL[field] || field)
                        .join(" and ")
                        .replace(/^./, (c) => c.toUpperCase())}{" "}
                    not recorded:{" "}
                    {missingPatient.length > 1
                        ? "age- and sex"
                        : missingPatient[0]}
                    -specific items have been left out. This is what a ward
                    would see.
                </div>
            )}
            {!loading && missing.includes("priority") && (
                <div className="bg-amber-50 border border-amber-400 rounded-md p-2 text-sm text-amber-800">
                    Priority not recorded: priority-specific items have been
                    left out. This is what a ward would see.
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
                                                {!!describeCriteria(
                                                    row.item.sourceCriteria,
                                                ) &&
                                                    ` · ${describeCriteria(row.item.sourceCriteria)}`}
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
                                    Matched templates ({matchedTemplates.length}
                                    )
                                </div>
                                <ul className="text-sm bg-white rounded-md border border-gray-200 p-2">
                                    {matchedTemplates.length === 0 && (
                                        <li className="text-gray-500 text-xs">
                                            No template matches.
                                        </li>
                                    )}
                                    {matchedTemplates.map((template) => (
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
                                                {!!describeCriteria(
                                                    template.criteria,
                                                ) &&
                                                    ` · ${describeCriteria(template.criteria)}`}
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

                            {/* Scope matched, a criterion did not - the
                                answer to "why does my template not apply to
                                this procedure". */}
                            <div>
                                <div className="text-sm font-semibold mb-1">
                                    Excluded by criteria (
                                    {excludedTemplates.length})
                                </div>
                                <ul className="text-sm bg-white rounded-md border border-gray-200 p-2">
                                    {excludedTemplates.length === 0 && (
                                        <li className="text-gray-500 text-xs">
                                            None.
                                        </li>
                                    )}
                                    {excludedTemplates.map((template) => (
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
                                                {describeCriteria(
                                                    template.criteria,
                                                )}
                                                {" — "}
                                                {template.excludedBy
                                                    .map((failure) =>
                                                        describeExclusion(
                                                            failure,
                                                            patient,
                                                        ),
                                                    )
                                                    .join(", ")}
                                            </span>
                                            {!template.active && (
                                                <span className="text-xs">
                                                    {" "}
                                                    (inactive)
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
