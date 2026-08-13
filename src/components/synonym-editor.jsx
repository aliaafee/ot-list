import { PlusIcon, XIcon } from "lucide-react";
import { twMerge } from "tailwind-merge";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * SynonymEditor - add/edit/remove rows of {term, language, isAbbreviation}.
 *
 * Used both inside ProcedureCodeForm (a draft concept's synonyms) and
 * standalone on the procedure-codes page's browse tab (editing an
 * existing catalogue concept's synonyms in memory, without touching
 * PocketBase). A synonym added here is stamped with today's date - an
 * untouched synonym has none and falls back to its concept's
 * effectiveFrom at CSV-export time (see buildSynonymsCsv), which is only
 * right for synonyms that actually date from when the concept was
 * created.
 *
 * @param {Object[]} synonyms - {term, language, isAbbreviation, active,
 *   effectiveFrom?}[]
 * @param {function} onChange - Called with the updated array.
 */
export default function SynonymEditor({ synonyms, onChange, className = "" }) {
    const addSynonym = () =>
        onChange([
            ...synonyms,
            {
                term: "",
                language: "en",
                isAbbreviation: false,
                active: true,
                effectiveFrom: today(),
            },
        ]);

    const updateSynonym = (index, patch) =>
        onChange(
            synonyms.map((s, i) => (i === index ? { ...s, ...patch } : s)),
        );

    const removeSynonym = (index) =>
        onChange(synonyms.filter((_, i) => i !== index));

    return (
        <div className={twMerge("", className)}>
            <div className="flex items-center justify-between">
                <label className="text-xs text-gray-700">
                    Synonyms (abbreviations, department jargon)
                </label>
                <button
                    type="button"
                    onClick={addSynonym}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline cursor-pointer"
                >
                    <PlusIcon width={12} height={12} />
                    Add synonym
                </button>
            </div>
            {synonyms.length === 0 ? (
                <p className="mt-1 text-xs text-gray-400">
                    No synonyms added.
                </p>
            ) : (
                <div className="mt-1 space-y-1">
                    {synonyms.map((synonym, index) => (
                        <div key={index} className="flex items-center gap-1.5">
                            <input
                                type="text"
                                value={synonym.term}
                                onChange={(e) =>
                                    updateSynonym(index, {
                                        term: e.target.value,
                                    })
                                }
                                placeholder="Synonym"
                                className="flex-1 rounded p-1 bg-white border border-gray-200 text-sm"
                            />
                            <label className="flex items-center gap-1 text-xs text-gray-600 whitespace-nowrap cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={synonym.isAbbreviation}
                                    onChange={(e) =>
                                        updateSynonym(index, {
                                            isAbbreviation: e.target.checked,
                                        })
                                    }
                                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                abbrev.
                            </label>
                            <button
                                type="button"
                                onClick={() => removeSynonym(index)}
                                title="Remove synonym"
                                className="text-gray-400 hover:text-red-600 cursor-pointer shrink-0"
                            >
                                <XIcon width={14} height={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
