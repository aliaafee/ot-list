import { useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

import Collapsible from "./collapsible";

/**
 * Placeholder checklist items.
 *
 * Hardcoded for now. Each item keeps an id separate from its label so the
 * ticks can be stored per procedure later without depending on the wording.
 */
const CHECKLIST_ITEMS = [
    { id: "consent", label: "Consent signed" },
    { id: "fasting", label: "Fasting confirmed" },
    { id: "site", label: "Surgical site marked" },
    { id: "crossmatch", label: "Blood grouped and cross-matched" },
    { id: "investigations", label: "Investigations available" },
    { id: "anaesthesia", label: "Anaesthesia review completed" },
    { id: "equipment", label: "Implants and equipment available" },
    { id: "allergies", label: "Allergies checked" },
];

/**
 * ProcedureChecklist - Dummy pre-operative checklist
 *
 * Placeholder UI. The items are hardcoded and the ticks live in component
 * state only, so every procedure shows the same list and nothing is saved.
 *
 * Renders its own collapsible section rather than being placed inside one,
 * because the summary carries a count of the items still to be ticked and that
 * count comes from state this component owns.
 *
 * @param {Object} props - Component props
 * @param {string} [props.className] - Optional classes for the section
 * @param {boolean} [props.defaultOpen=false] - Whether it starts expanded
 * @returns {JSX.Element} A collapsible list of checkboxes
 */
function ProcedureChecklist({ className = "", defaultOpen = false }) {
    const [checked, setChecked] = useState(() => new Set());

    const toggleItem = (itemId) => {
        setChecked((prev) => {
            const next = new Set(prev);
            if (next.has(itemId)) {
                next.delete(itemId);
            } else {
                next.add(itemId);
            }
            return next;
        });
    };

    const pendingCount = CHECKLIST_ITEMS.length - checked.size;

    return (
        <Collapsible
            className={className}
            summaryClassName="text-sm font-semibold"
            defaultOpen={defaultOpen}
            summary={
                <>
                    Checklist
                    {pendingCount > 0 && (
                        <span className="ml-2 flex items-center gap-1 font-normal text-xs text-red-600">
                            <TriangleAlertIcon size={14} aria-hidden="true" />
                            {pendingCount} of {CHECKLIST_ITEMS.length}{" "}
                            incomplete
                        </span>
                    )}
                </>
            }
        >
            <ul className="flex flex-col gap-1 py-1 ml-4">
                {CHECKLIST_ITEMS.map((item) => (
                    <li key={item.id}>
                        <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                                type="checkbox"
                                className="cursor-pointer"
                                checked={checked.has(item.id)}
                                onChange={() => toggleItem(item.id)}
                            />
                            <span
                                className={twMerge(
                                    checked.has(item.id) &&
                                        "line-through text-gray-500",
                                )}
                            >
                                {item.label}
                            </span>
                        </label>
                    </li>
                ))}
            </ul>
        </Collapsible>
    );
}

export default ProcedureChecklist;
