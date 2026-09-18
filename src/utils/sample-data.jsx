import dayjs from "dayjs";

import { UNCODED_CONCEPT_ID } from "@/lib/procedure-codes";

/** One random element of a list. */
function pick(items) {
    return items[Math.floor(Math.random() * items.length)];
}

/**
 * A run of consecutive levels for a concept that takes them.
 *
 * The levels are taken as a slice of the ones the concept offers, which are
 * already cranio-caudal, so a sample reads like a real construct (T10 T11 T12)
 * rather than a scatter of unrelated levels.
 */
function sampleSpinalLevels(catalogue, concept) {
    if (!concept.levelApplicable) return [];

    const options = catalogue?.levelsFor?.(concept, false) ?? [];
    if (options.length === 0) return [];

    const span = Math.min(1 + Math.floor(Math.random() * 3), options.length);
    const start = Math.floor(Math.random() * (options.length - span + 1));
    return options.slice(start, start + span).map((level) => level.code);
}

/**
 * Operations the catalogue has no code for, for the uncoded rows.
 *
 * Each one is checked to return nothing from the picker's search, so a sample
 * is uncoded for the reason a real one is: nothing in the catalogue matched.
 */
const UNCODED_SAMPLE_TEXTS = [
    "Scalp laceration exploration and repair",
    "Removal of infected bone flap",
    "Split skin graft to scalp defect",
    "Sural nerve graft repair of brachial plexus injury",
    "Halo vest application",
    "Removal of deep brain stimulation electrode",
];

/**
 * A random procedure code list, in the shape the picker emits:
 * `{ concept, freeText, postCoordination }` per entry.
 *
 * Only the qualifier slots a concept actually declares are filled, the way the
 * picker fills them, so a generated sample saves the same payload a surgeon's
 * pick would. `catalogue` is the value from `useCatalogue()`; the list comes
 * back empty while the catalogue is still loading, leaving the field blank.
 *
 * One sample in six carries an uncoded row - the sentinel concept plus the
 * text that matched nothing, exactly what the picker builds for a procedure
 * the catalogue does not cover - half of those as the only row on the form.
 */
export function GenerateProcedureCodes(catalogue) {
    const concepts = (catalogue?.concepts ?? []).filter(
        (concept) =>
            concept.active && concept.conceptId !== UNCODED_CONCEPT_ID,
    );
    if (concepts.length === 0) return [];

    // Most operations are coded with one procedure, some with two.
    const wanted = Math.min(Math.random() > 0.75 ? 2 : 1, concepts.length);
    const chosen = [];
    while (chosen.length < wanted) {
        const concept = pick(concepts);
        const already = chosen.some(
            (picked) => picked.conceptId === concept.conceptId,
        );
        if (!already) chosen.push(concept);
    }

    const coded = chosen.map((concept) => {
        const postCoordination = {};

        if (concept.lateralityApplicable) {
            postCoordination.laterality = pick(["left", "right", "bilateral"]);
        }
        if (concept.revisionApplicable) {
            postCoordination.revisionStatus = pick([
                "primary",
                "primary",
                "primary",
                "revision",
            ]);
        }
        postCoordination.priority = pick([
            "elective",
            "elective",
            "elective",
            "urgent",
            "emergency",
        ]);

        const spinalLevels = sampleSpinalLevels(catalogue, concept);
        if (spinalLevels.length) {
            postCoordination.spinalLevels = spinalLevels;
        }

        return { concept, freeText: "", postCoordination };
    });

    // The sentinel comes from the catalogue rather than a literal, so an
    // uncoded sample carries the same concept a picked one would.
    const sentinel = catalogue?.conceptById?.(UNCODED_CONCEPT_ID);
    if (!sentinel || Math.random() >= 1 / 6) return coded;

    const uncoded = {
        concept: sentinel,
        freeText: pick(UNCODED_SAMPLE_TEXTS),
        // The sentinel declares no qualifier slots, so the picker leaves this
        // undefined for a free-text row.
        postCoordination: undefined,
    };

    // Sometimes the whole operation is off-catalogue, sometimes it is one
    // extra step alongside a coded procedure.
    return Math.random() < 0.5 ? [uncoded] : [...coded, uncoded];
}

export function GenerateProdecureFormData(surgeons, catalogue) {
    return {
        nid: `A${Math.floor(100000 + Math.random() * 900000)}`, // Random 6-digit number with 'A' prepended
        hospitalId: `IGMH${Math.floor(100000 + Math.random() * 900000)
            .toString()
            .padStart(10, "0")}`,
        phone: Math.floor(1000000 + Math.random() * 9000000).toString(),
        name: `${
            [
                "John",
                "Jane",
                "Michael",
                "Emily",
                "Chris",
                "Sarah",
                "David",
                "Laura",
                "James",
                "Anna",
            ][Math.floor(Math.random() * 10)]
        } ${
            [
                "Smith",
                "Johnson",
                "Brown",
                "Williams",
                "Jones",
                "Garcia",
                "Miller",
                "Davis",
                "Martinez",
                "Hernandez",
            ][Math.floor(Math.random() * 10)]
        }`, // Random patient name
        dateOfBirth: dayjs()
            .subtract(Math.floor(18 + Math.random() * 60), "year")
            .format("YYYY-MM-DD"), // Random DOB between 18 and 78 years ago
        sex: Math.random() > 0.5 ? "male" : "female", // Random sex
        address: `${
            [
                "HULHUDHALEEGE",
                "MAAFANNU VILLA",
                "SOSUN MAGU",
                "ORCHID MAGU",
                "HENVEIRU",
                "RAHDHEBAI MAGU",
                "KINOLHAS",
                "NEELOFARU HINGUN",
                "AMEENEE MAGU",
                "JANAVAREE MAGU",
            ][Math.floor(Math.random() * 10)]
        }, ${
            [
                "Malé",
                "Hulhumalé",
                "Villingili",
                "Maafushi",
                "Thulusdhoo",
                "Dhiffushi",
                "Guraidhoo",
                "Gulhi",
                "Himmafushi",
                "Huraa",
            ][Math.floor(Math.random() * 10)]
        }, ${
            [
                "Kaafu",
                "Alifu Alifu",
                "Alifu Dhaalu",
                "Vaavu",
                "Meemu",
                "Faafu",
                "Dhaalu",
                "Thaa",
                "Laamu",
                "Gaafu Alifu",
            ][Math.floor(Math.random() * 10)]
        }, MALDIVES`, // Random address
        diagnosis: `${
            [
                "Acute Appendicitis",
                "Chronic Cholecystitis",
                "Inguinal Hernia",
                "Femoral Fracture",
                "Symptomatic Gallstones",
                "Senile Cataract",
                "Recurrent Tonsillitis",
                "Spontaneous Pneumothorax",
                "Obstructive Kidney Stones",
                "Carpal Tunnel Syndrome",
            ][Math.floor(Math.random() * 10)]
        }`, // Random realistic surgical diagnosis
        comorbids: ["", "Hypertension", "DM, DLP", "DM"][
            Math.floor(Math.random() * 3)
        ],
        procedureCodes: GenerateProcedureCodes(catalogue), // Random codes from the catalogue, with the qualifiers each one takes
        addedDate: dayjs().format("YYYY-MM-DD"), // Current date
        addedBy:
            surgeons[Math.floor(Math.random() * surgeons.length)]?.id || "", // Random surgeon name
        remarks: `Remarks ${Math.floor(1 + Math.random() * 10)}`, // Random remarks
        duration: Math.floor(30 + Math.random() * 120).toString(), // Random duration between 30 and 150 minutes
        anesthesia: ["GA", "LA"][Math.floor(Math.random() * 2)],
        bed: `Bed-${Math.floor(1 + Math.random() * 50)}`, // Random bed number
        requirements: `Requirement ${Math.floor(1 + Math.random() * 10)}`, // Random requirements
    };
}
