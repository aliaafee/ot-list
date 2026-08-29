import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
    CATALOGUE_RELEASE,
    fetchBundledCatalogue,
    fetchCatalogue,
} from "@/lib/catalogue-source";
import {
    buildLevelLookup,
    buildSearchIndex,
    levelOptions,
    searchWithQualifiers,
    sortLevelCodes,
} from "@/lib/procedure-catalogue";

const CatalogueContext = createContext(null);

export function CatalogueProvider({ children }) {
    const { isAuthed } = useAuth();
    const [data, setData] = useState(fetchBundledCatalogue());
    const [error, setError] = useState(null);

    useEffect(() => {
        // The catalogue collections require a signed-in user, so there is
        // nothing to try until there is one.
        if (!isAuthed) return;

        let cancelled = false;

        (async () => {
            try {
                const fresh = await fetchCatalogue();

                if (!cancelled) {
                    setData(fresh);
                    setError(null);
                }
            } catch (e) {
                console.log(e);
                if (!cancelled) setError(e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthed]);

    const value = useMemo(() => {
        const concepts = data.concepts;
        const index = buildSearchIndex(concepts);
        const levelLookup = buildLevelLookup(data.levels);

        // Keyed by every concept, active or not: a procedure coded years ago
        // still has to load into the editor after its concept was retired.
        const byConceptId = new Map(concepts.map((c) => [c.conceptId, c]));

        return {
            concepts: concepts,
            levels: data.levels,
            release: CATALOGUE_RELEASE,
            error,
            conceptById: (conceptId) => byConceptId.get(conceptId) ?? null,
            search: (query) => searchWithQualifiers(index, levelLookup, query),
            levelsFor: (concept, all) =>
                levelOptions(levelLookup, concept, all),
            levelCount: (kind) => levelLookup.byKind[kind]?.length ?? 0,
            sortLevels: (codes, kind) =>
                sortLevelCodes(levelLookup, codes, kind),
        };
    }, [data, error]);

    return (
        <CatalogueContext.Provider value={value}>
            {children}
        </CatalogueContext.Provider>
    );
}

export function useCatalogue() {
    const context = useContext(CatalogueContext);
    if (!context) {
        throw new Error("useCatalogue must be used within a CatalogueProvider");
    }
    return context;
}
