const SAMPLE_CODES = [
    { code: "0DTJ4ZZ", description: "Laparoscopic cholecystectomy" },
    { code: "0DTJ0ZZ", description: "Open cholecystectomy" },
    { code: "0DBJ4ZZ", description: "Laparoscopic appendectomy" },
    { code: "0DTU0ZZ", description: "Open appendectomy" },
    { code: "0YQ50ZZ", description: "Inguinal hernia repair, open" },
    { code: "0YQ54ZZ", description: "Inguinal hernia repair, laparoscopic" },
    { code: "0SRC0J9", description: "Total knee replacement, right" },
    { code: "0SRD0J9", description: "Total knee replacement, left" },
    { code: "0UT90ZZ", description: "Total abdominal hysterectomy" },
    { code: "10D00Z1", description: "Lower segment caesarean section" },
    { code: "08RJ3JZ", description: "Cataract extraction with IOL, right" },
    { code: "08RK3JZ", description: "Cataract extraction with IOL, left" },
    { code: "0CTP0ZZ", description: "Tonsillectomy" },
    { code: "0W9G3ZZ", description: "Drainage of abscess, percutaneous" },
];

export async function fetchCatalogue() {
    return {
        concepts: SAMPLE_CODES,
    };
}

export function buildSearchIndex(concepts) {
    console.log("Building search index");
    return concepts.map((concept) => ({
        concept,
        preferredTermLower: concept.description.toLowerCase(),
        fsnLower: "",
        subspecialtyLower: "",
        synonymsLower: ["", ""],
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
