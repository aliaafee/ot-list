import { Link } from "react-router";
import { twMerge } from "tailwind-merge";

import { describeCriteria } from "@/lib/checklists";

/**
 * The warning for keys this template shares with another under overlapping
 * criteria, as findKeyOverlaps reports them. Nothing when none.
 */
export default function KeyOverlapWarning({ overlaps, className }) {
    if (!overlaps.length) return null;
    return (
        <div
            className={twMerge(
                "bg-amber-50 border border-amber-400 rounded-md p-2 text-xs text-amber-800",
                className,
            )}
        >
            <div className="font-semibold">
                Keys shared under overlapping criteria
            </div>
            <p>
                A procedure can match both templates, and at the same scope
                and criteria count, Order decides whose item wins.
            </p>
            <ul className="mt-1">
                {overlaps.map((overlap) => (
                    <li key={`${overlap.itemKey}-${overlap.template.id}`}>
                        <span className="font-mono">{overlap.itemKey}</span>{" "}
                        also in{" "}
                        <Link
                            to={`/settings/checklists/${overlap.template.id}`}
                            className="underline"
                        >
                            {overlap.template.name}
                        </Link>{" "}
                        ({describeCriteria(overlap.template) || "no criteria"})
                    </li>
                ))}
            </ul>
        </div>
    );
}
