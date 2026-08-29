import { twMerge } from "tailwind-merge";

import LabelValue from "./label-value";

/**
 * LabelListValue - Display a label with a list of values
 *
 * The read-only counterpart to FormListField, the way LabelValue is the
 * read-only counterpart to FormField. The label is shown once and the entries
 * stack beneath it, so a list of three reads as one field with three values
 * rather than as three fields. More than one entry is numbered, so the order
 * a procedure was coded in stays legible.
 *
 * Entries are whatever LabelValue accepts, so a list of plain strings needs
 * nothing extra and richer entries can be passed as nodes.
 *
 * @param {string} label - Label text, shown once above the entries
 * @param {Array<string|ReactNode>} value - Values to display, numbered when there is more than one
 * @param {string} className - Additional CSS classes for the container
 * @param {string} itemClassName - Additional CSS classes for each row
 * @param {ReactNode} blank - Content shown for an empty list, or an empty entry (default: —)
 * @param {boolean} copyButton - Whether each row gets a copy button
 */
function LabelListValue({
    label,
    value,
    className,
    itemClassName,
    blank = <>&mdash;</>,
    copyButton = false,
}) {
    // An empty list still shows its label with a blank, so a field does not
    // disappear out of the layout when it happens to have nothing in it.
    const items = Array.isArray(value) && value.length > 0 ? value : [null];

    // A single entry reads as a plain value; numbering it would only add
    // furniture to what is really just one field with one value.
    const numbered = items.length > 1;

    return (
        <div
            className={twMerge("flex flex-col", className)}
            role="group"
            aria-label={label}
        >
            {label ? (
                // Mirrors the label LabelValue renders, so a list field and a
                // single-value field line up beside each other.
                <span className=" text-gray-700 text-xs select-none">
                    {label}
                </span>
            ) : (
                <></>
            )}
            {/* Keying by index is safe in both branches: the rows are display
                only and render straight from `value`, in the order given. */}
            {numbered ? (
                <ol className="flex flex-col">
                    {items.map((item, index) => (
                        <li
                            key={index}
                            className={twMerge(
                                "flex gap-1",
                                label && "p-1",
                                itemClassName,
                            )}
                        >
                            {/* The list itself carries the ordering for a
                                screen reader, so the printed number is
                                decoration and would only be read twice. */}
                            <span aria-hidden="true" className="select-none">
                                {index + 1}.
                            </span>
                            <LabelValue
                                value={item}
                                blank={blank}
                                copyButton={copyButton}
                                className="grow"
                            />
                        </li>
                    ))}
                </ol>
            ) : (
                <LabelValue
                    value={items[0]}
                    blank={blank}
                    copyButton={copyButton}
                    // The row carries no label of its own, so it takes the
                    // inset LabelValue would otherwise put on a labelled value.
                    className={twMerge(label && "p-1", itemClassName)}
                />
            )}
        </div>
    );
}

export default LabelListValue;
