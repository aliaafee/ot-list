import bundledCatalogue from "@/data/nspc-catalogue.json";
import bundledLevels from "@/data/spinal-levels.json";

export async function fetchCatalogue() {
    return {
        concepts: bundledCatalogue,
        levels: bundledLevels,
    };
}

export function buildSearchIndex(concepts) {
    return concepts
        .filter((concept) => concept.active)
        .map((concept) => ({
            concept,
            preferredTermLower: concept.preferredTerm.toLowerCase(),
            fsnLower: concept.fsn.toLowerCase(),
            subspecialtyLower: concept.subspecialty.toLowerCase(),
            synonymsLower: concept.synonyms
                .filter((s) => s.active)
                .map((s) => s.term.toLowerCase()),
        }));
}

/** Score one index entry against a query. Lower is better. Null = no match. */
function scoreEntry(entry, queryLower, tokens) {
    if (entry.preferredTermLower === queryLower) return 0;
    if (entry.synonymsLower.includes(queryLower)) return 1;
    if (entry.preferredTermLower.startsWith(queryLower)) return 2;
    if (entry.synonymsLower.some((s) => s.startsWith(queryLower))) return 3;
    if (entry.preferredTermLower.includes(queryLower)) return 4;
    if (entry.synonymsLower.some((s) => s.includes(queryLower))) return 5;
    if (entry.fsnLower.includes(queryLower)) return 6;

    // Multi-word query: fall back to "every token appears somewhere",
    // which is what makes "vp shunt insertion" find a concept whose
    // preferred term and synonyms only cover the phrase between them.
    if (tokens.length > 1) {
        const haystack = [
            entry.preferredTermLower,
            entry.fsnLower,
            entry.subspecialtyLower,
            ...entry.synonymsLower,
        ].join(" | ");
        if (tokens.every((t) => haystack.includes(t))) return 7;
    }

    return null;
}

export function searchConcepts(index, query, limit = 20) {
    const queryLower = query.trim().toLowerCase();
    if (!queryLower) return [];

    const tokens = queryLower.split(/\s+/).filter(Boolean);

    const matched = [];
    for (const entry of index) {
        const score = scoreEntry(entry, queryLower, tokens);
        if (score !== null) matched.push({ entry, score });
    }

    matched.sort((a, b) => {
        if (a.score !== b.score) return a.score - b.score;
        return a.entry.preferredTermLower.localeCompare(
            b.entry.preferredTermLower,
        );
    });

    return matched.slice(0, limit).map((m) => m.entry.concept);
}

export function searchCatalogue(index, query) {
    const results = searchConcepts(index, query);

    return results;
}
