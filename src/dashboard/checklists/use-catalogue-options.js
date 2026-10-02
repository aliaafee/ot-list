import { useEffect, useState } from "react";

import { pb } from "@/lib/pb";

/**
 * Options for a template's target fields, as { subspecialties, sites,
 * concepts } lists of { value, label }, and an error if they failed to load.
 *
 * Read from PocketBase rather than from the bundled catalogue, because these
 * are relation fields and store record ids, which the bundled concepts do not
 * carry.
 *
 * Every read passes an explicit `requestKey`. PocketBase derives one from
 * method + path by default and cancels any in-flight request that shares it,
 * so two components reading the same collection at the same time abort each
 * other - this concepts read would otherwise collide with the catalogue
 * context's.
 */
export default function useCatalogueOptions() {
    const [sites, setSites] = useState([]);
    const [concepts, setConcepts] = useState([]);
    const [subspecialties, setSubspecialties] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        let ignore = false;
        (async () => {
            try {
                const siteRecords = await pb
                    .collection("procedureFacetValues")
                    .getFullList({
                        filter: 'facet = "site"',
                        sort: "+term",
                        requestKey: "checklist-admin-sites",
                    });
                if (ignore) return;
                setSites(
                    siteRecords.map((site) => ({
                        value: site.id,
                        label: site.term,
                    })),
                );

                const conceptRecords = await pb
                    .collection("procedureConcepts")
                    .getFullList({
                        sort: "+conceptId",
                        requestKey: "checklist-admin-concepts",
                    });
                if (ignore) return;
                setConcepts(
                    conceptRecords.map((concept) => ({
                        value: concept.id,
                        label: `${concept.conceptId} — ${concept.preferredTerm}`,
                    })),
                );
                setSubspecialties(
                    [
                        ...new Set(
                            conceptRecords
                                .map((concept) => concept.subspecialty)
                                .filter(Boolean),
                        ),
                    ]
                        .sort()
                        .map((value) => ({ value, label: value })),
                );
            } catch (err) {
                console.error("Error loading catalogue options:", err);
                if (!ignore) setError("Failed to load the catalogue options.");
            }
        })();

        return () => {
            ignore = true;
        };
    }, []);

    return { options: { subspecialties, sites, concepts }, error };
}
