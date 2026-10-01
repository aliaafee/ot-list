import { useState } from "react";

const AGE_UNITS = [
    { value: "years", label: "years" },
    { value: "months", label: "months" },
];

/** Months that are not whole years are shown in months; anything else in years. */
function unitFor(months) {
    return months > 0 && months % 12 !== 0 ? "months" : "years";
}

function textFor(months, unit) {
    return months > 0 ? String(unit === "years" ? months / 12 : months) : "";
}

/**
 * AgeBoundField - one age bound, entered in years or months, stored in months
 *
 * Holds what is typed locally and hands a whole number of months to
 * `onCommit` when the field is left or the unit changes. `onCommit` returns
 * false to refuse the value, and the field goes back to the saved one. Blank
 * or 0 means no bound.
 *
 * Give it `key={months}` so a saved value arriving from outside remounts it
 * with that value, rather than syncing local state in an effect.
 *
 * @param {Object} props - Component props
 * @param {string} props.label - Field label, e.g. "From age"
 * @param {number} props.months - The saved bound, in months; 0 = none
 * @param {boolean} [props.disabled] - Locks the field
 * @param {function} props.onCommit - Called with months, or null for an
 *   invalid entry; return false to refuse
 * @returns {JSX.Element} The labelled field
 */
function AgeBoundField({ label, months, disabled = false, onCommit }) {
    const [unit, setUnit] = useState(() => unitFor(months));
    const [text, setText] = useState(() => textFor(months, unitFor(months)));

    const revert = () => {
        setUnit(unitFor(months));
        setText(textFor(months, unitFor(months)));
    };

    const commit = (value, withUnit) => {
        const trimmed = String(value).trim();
        const number = trimmed === "" ? 0 : Number(trimmed);
        const total = withUnit === "years" ? number * 12 : number;
        if (!Number.isInteger(total) || total < 0) {
            onCommit(null);
            revert();
            return;
        }
        if (total === months) return;
        if (onCommit(total) === false) revert();
    };

    return (
        <div className="flex flex-col">
            <span className="text-xs text-left text-gray-700">{label}</span>
            <div className="flex gap-1">
                <input
                    type="number"
                    min={0}
                    step={1}
                    disabled={disabled}
                    value={text}
                    placeholder="any"
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md bg-white"
                    onChange={(e) => setText(e.target.value)}
                    onBlur={() => commit(text, unit)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") commit(text, unit);
                    }}
                />
                <select
                    disabled={disabled}
                    value={unit}
                    className="px-1 py-1 border border-gray-300 rounded-md bg-white text-sm"
                    onChange={(e) => {
                        setUnit(e.target.value);
                        if (text.trim() !== "") commit(text, e.target.value);
                    }}
                >
                    {AGE_UNITS.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}

export default AgeBoundField;
