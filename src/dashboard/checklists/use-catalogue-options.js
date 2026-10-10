import { useMemo } from "react";

import { useCatalogue } from "@/contexts/catalogue-context";

/**
 * Options for a template's target fields, as { subspecialties, sites,
 * concepts } lists of { value, label }, and an error if they failed to load.
 *
 * Sites and concepts are relation fields and store record ids, which only
 * concepts read from the database carry. When the catalogue context is serving
 * its bundled copy instead there is nothing to offer, and that is the error.
 */
export default function useCatalogueOptions() {
    const { concepts: catalogue, loaded } = useCatalogue();

    return useMemo(() => {
        const stored = catalogue.filter((concept) => concept.id);

        const concepts = stored.map((concept) => ({
            value: concept.id,
            label: `${concept.conceptId} — ${concept.preferredTerm}`,
            // What the procedure code selector also searches, so "ACDF" finds
            // its concept here as it does there.
            keywords: [
                concept.fsn,
                ...concept.synonyms
                    .filter((synonym) => synonym.active)
                    .map((synonym) => synonym.term),
            ],
        }));

        // The sites some concept sits at. One that no concept uses could not
        // match a procedure anyway.
        const siteTerms = new Map(
            stored
                .filter((concept) => concept.procedureSiteId)
                .map((concept) => [
                    concept.procedureSiteId,
                    concept.facets.procedureSite,
                ]),
        );
        const sites = [...siteTerms]
            .map(([value, label]) => ({ value, label }))
            .sort((a, b) => a.label.localeCompare(b.label));

        const subspecialties = [
            ...new Set(
                stored.map((concept) => concept.subspecialty).filter(Boolean),
            ),
        ]
            .sort()
            .map((value) => ({ value, label: value }));

        return {
            options: { subspecialties, sites, concepts },
            error:
                loaded && stored.length === 0
                    ? "Failed to load the catalogue options."
                    : "",
        };
    }, [catalogue, loaded]);
}
