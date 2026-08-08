import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import { bundledSnapshot, fetchCatalogue, readCache } from "@/lib/catalogue";
import {
    buildLevelLookup,
    buildSearchIndex,
    buildValueFromConcept,
    levelOptions,
    searchWithLevel,
    selectableConcepts,
    sortLevelCodes,
} from "@/lib/nspc";

const CatalogueContext = createContext(null);

/**
 * CatalogueProvider - makes the NSPC catalogue available to the pickers.
 *
 * Never renders a loading state and never renders empty: it starts from
 * the cached copy, or the snapshot bundled at build time, and replaces it
 * once PocketBase answers. A failed fetch is not an error the user needs
 * to see - the bundled catalogue is a complete, if possibly stale, one -
 * so it is recorded on the context for anything that wants to surface it
 * and otherwise ignored.
 */
export function CatalogueProvider({ children }) {
    const { isAuthed } = useAuth();
    const [data, setData] = useState(() => readCache() ?? bundledSnapshot());
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
                if (!cancelled) setError(e);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [isAuthed]);

    // Rebuilt only when the catalogue itself changes - normally once, when
    // the fetch lands. The search index is 88 entries, but it is walked on
    // every keystroke, so it must not be rebuilt per render.
    const value = useMemo(() => {
        // The uncoded sentinel is dropped from everything a user reaches
        // - search and the browser tree both read `concepts` - but stays
        // in `findById`, which resolves codes already stored.
        const selectable = selectableConcepts(data.concepts);
        const index = buildSearchIndex(selectable);
        const lookup = buildLevelLookup(data.levels);
        const byId = new Map(data.concepts.map((c) => [c.conceptId, c]));

        return {
            concepts: selectable,
            levels: data.levels,
            // Whichever release the data in hand came from, which is what
            // gets snapshotted onto a coded procedure.
            release: selectable[0]?.catalogueRelease ?? "",
            error,

            // Bound against the catalogue currently in hand, so callers
            // never have to thread it through themselves.
            search: (query) => searchWithLevel(index, query),
            buildValue: (concept, previous, initialLevels) =>
                buildValueFromConcept(
                    lookup,
                    concept,
                    previous,
                    initialLevels,
                ),
            findById: (conceptId) => byId.get(conceptId) ?? null,
            levelsFor: (concept, all) => levelOptions(lookup, concept, all),
            sortLevels: (codes, kind) => sortLevelCodes(lookup, codes, kind),
            levelOrdinal: (kind, code) => lookup.ordinals[`${kind}:${code}`],
            levelCount: (kind) => lookup.byKind[kind]?.length ?? 0,
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
