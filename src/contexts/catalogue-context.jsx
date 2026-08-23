import { createContext, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/contexts/auth-context";
import {
    buildSearchIndex,
    fetchCatalogue,
    searchCatalogue,
} from "@/lib/procedure-catalogue";

const CatalogueContext = createContext(null);

export function CatalogueProvider({ children }) {
    const { isAuthed } = useAuth();
    const [data, setData] = useState({ concepts: [] });
    const [error, setError] = useState(null);

    useEffect(() => {
        // The catalogue collections require a signed-in user, so there is
        // nothing to try until there is one.
        if (!isAuthed) return;

        let cancelled = false;

        (async () => {
            try {
                const fresh = await fetchCatalogue();
                console.log(fresh);
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

        return {
            concepts: [],
            levels: [],
            release: "v2026.1",
            error,
            search: (query) => searchCatalogue(index, query),
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
