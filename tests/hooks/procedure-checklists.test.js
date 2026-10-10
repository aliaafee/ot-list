import { describe, expect, it } from "vitest";

import { BadRequestError, loadHook } from "./load-hook";

// Section numbers are those of specs/checklists/README.md.
const { ageInMonths, assembleChecklist, customItemKey, datePart } = loadHook(
    "procedure-checklists.js",
);

const template = (id, over = {}) => ({
    id,
    name: id,
    scope: "all",
    active: true,
    position: 0,
    subspecialties: [],
    sites: [],
    concepts: [],
    sexes: [],
    ageMinMonths: 0,
    ageMaxMonths: 0,
    priorities: [],
    items: [],
    ...over,
});

const item = (itemKey, over = {}) => ({
    itemKey,
    label: itemKey,
    hint: "",
    required: true,
    group: "preop",
    position: 0,
    ...over,
});

const SPINE = {
    id: "rec-spine",
    conceptId: "NSX-00010",
    subspecialty: "spine",
    site: "site-lumbar",
    priority: null,
};
const CRANIAL = {
    id: "rec-cranial",
    conceptId: "NSX-00020",
    subspecialty: "cranial-trauma",
    site: "site-subdural",
    priority: null,
};
const UNCODED = {
    id: "rec-uncoded",
    conceptId: "NSX-00000",
    subspecialty: "uncoded",
    site: "",
    priority: null,
};

/** A patient with nothing recorded. */
const UNKNOWN = { ageMonths: null, sex: null };

const keys = (result) => result.items.map((i) => i.itemKey);
const described = (result, id) => result.templates.find((t) => t.id === id);

describe("datePart", () => {
    it("takes the date part of a stored date without converting it", () => {
        expect(datePart("2026-03-01 00:00:00.000Z")).toBe("2026-03-01");
        expect(datePart("2026-03-01")).toBe("2026-03-01");
    });

    it("gives null for an empty or malformed value", () => {
        expect(datePart("")).toBeNull();
        expect(datePart(null)).toBeNull();
        expect(datePart("1 Mar 2026")).toBeNull();
    });
});

describe("ageInMonths (§3.1)", () => {
    it("counts a month as completed on the day of the month", () => {
        expect(ageInMonths("2010-03-02", "2026-03-02")).toBe(192);
        expect(ageInMonths("2010-03-02", "2026-03-01")).toBe(191);
        expect(ageInMonths("2010-03-02", "2026-03-03")).toBe(192);
    });

    it("is zero on the day of birth and through the first month", () => {
        expect(ageInMonths("2026-03-02", "2026-03-02")).toBe(0);
        expect(ageInMonths("2026-03-02", "2026-04-01")).toBe(0);
        expect(ageInMonths("2026-03-02", "2026-04-02")).toBe(1);
    });

    it("reaches a birthday on the 31st on the last day of a shorter month", () => {
        expect(ageInMonths("2026-01-31", "2026-02-27")).toBe(0);
        expect(ageInMonths("2026-01-31", "2026-02-28")).toBe(1);
        expect(ageInMonths("2026-01-31", "2026-04-30")).toBe(3);
    });

    it("reaches a leap-day birthday on 28 February in a common year", () => {
        expect(ageInMonths("2024-02-29", "2025-02-27")).toBe(11);
        expect(ageInMonths("2024-02-29", "2025-02-28")).toBe(12);
    });

    it("waits for 29 February in a leap year", () => {
        expect(ageInMonths("2024-02-29", "2028-02-28")).toBe(47);
        expect(ageInMonths("2024-02-29", "2028-02-29")).toBe(48);
    });

    it("reads stored dates as UTC calendar dates", () => {
        expect(
            ageInMonths("2010-03-02 00:00:00.000Z", "2026-03-02 00:00:00.000Z"),
        ).toBe(192);
    });

    it("is unknown without both dates", () => {
        expect(ageInMonths("", "2026-03-02")).toBeNull();
        expect(ageInMonths("2010-03-02", "")).toBeNull();
    });

    it("treats a date of birth after the procedure date as unknown", () => {
        expect(ageInMonths("2026-03-03", "2026-03-02")).toBeNull();
    });
});

describe("assembleChecklist: applicability (§3)", () => {
    it("gives a procedure with no codes the scope=all templates only", () => {
        const result = assembleChecklist([], UNKNOWN, [
            template("global", { items: [item("consent-signed")] }),
            template("spine", {
                scope: "subspecialty",
                subspecialties: ["spine"],
                items: [item("imaging-available")],
            }),
        ]);

        expect(keys(result)).toEqual(["consent-signed"]);
        expect(result.templates.map((t) => t.id)).toEqual(["global"]);
    });

    it("matches a subspecialty template on the concept's subspecialty", () => {
        const templates = [
            template("spine", {
                scope: "subspecialty",
                subspecialties: ["spine", "peripheral-nerve"],
                items: [item("imaging-available")],
            }),
        ];

        expect(keys(assembleChecklist([SPINE], UNKNOWN, templates))).toEqual([
            "imaging-available",
        ]);
        expect(keys(assembleChecklist([CRANIAL], UNKNOWN, templates))).toEqual(
            [],
        );
    });

    it("matches a site template on the concept's site", () => {
        const templates = [
            template("lumbar", {
                scope: "site",
                sites: ["site-lumbar"],
                items: [item("level-marked")],
            }),
        ];

        expect(keys(assembleChecklist([SPINE], UNKNOWN, templates))).toEqual([
            "level-marked",
        ]);
        expect(keys(assembleChecklist([CRANIAL], UNKNOWN, templates))).toEqual(
            [],
        );
    });

    it("matches a concept template on the concept's record id", () => {
        const templates = [
            template("this-code", {
                scope: "concept",
                concepts: ["rec-spine"],
                items: [item("implants-ordered")],
            }),
        ];

        expect(keys(assembleChecklist([SPINE], UNKNOWN, templates))).toEqual([
            "implants-ordered",
        ]);
        expect(keys(assembleChecklist([CRANIAL], UNKNOWN, templates))).toEqual(
            [],
        );
    });

    it("gives the uncoded sentinel the global templates and no site template", () => {
        const result = assembleChecklist([UNCODED], UNKNOWN, [
            template("global", { items: [item("consent-signed")] }),
            template("no-sites", {
                scope: "site",
                sites: [""],
                items: [item("never")],
            }),
            template("uncoded", {
                scope: "subspecialty",
                subspecialties: ["uncoded"],
                items: [item("code-this-procedure")],
            }),
        ]);

        expect(keys(result)).toEqual(["consent-signed", "code-this-procedure"]);
    });

    it("collects a template once however many codes match it", () => {
        const second = { ...SPINE, id: "rec-spine-2", conceptId: "NSX-00011" };
        const result = assembleChecklist([SPINE, second], UNKNOWN, [
            template("spine", {
                scope: "subspecialty",
                subspecialties: ["spine"],
                items: [item("imaging-available")],
            }),
        ]);

        expect(keys(result)).toEqual(["imaging-available"]);
        expect(result.suppressed).toEqual([]);
        expect(described(result, "spine").matchedConcepts).toEqual([
            "NSX-00010",
            "NSX-00011",
        ]);
    });

    it("names no matched concepts for a plain global template", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("global", { items: [item("consent-signed")] }),
        ]);

        expect(described(result, "global").matchedConcepts).toEqual([]);
    });
});

describe("assembleChecklist: duplicate keys (§4 step 4)", () => {
    const shared = (id, over) =>
        template(id, {
            ...over,
            items: [item("consent-signed", { label: `${id} wording` })],
        });

    const ALL = shared("t-all");
    const SUBSPECIALTY = shared("t-subspecialty", {
        scope: "subspecialty",
        subspecialties: ["spine"],
    });
    const SITE = shared("t-site", { scope: "site", sites: ["site-lumbar"] });
    const CONCEPT = shared("t-concept", {
        scope: "concept",
        concepts: ["rec-spine"],
    });

    it("lets the most specific scope win: concept > site > subspecialty > all", () => {
        const winner = (templates) =>
            assembleChecklist([SPINE], UNKNOWN, templates).items[0]
                .sourceTemplate;

        expect(winner([ALL, SUBSPECIALTY, SITE, CONCEPT])).toBe("t-concept");
        expect(winner([ALL, SUBSPECIALTY, SITE])).toBe("t-site");
        expect(winner([ALL, SUBSPECIALTY])).toBe("t-subspecialty");
        expect(winner([ALL])).toBe("t-all");
    });

    it("takes the label, group and source from the winner", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("global", {
                items: [item("consent-signed", { label: "Consent signed" })],
            }),
            template("spine", {
                scope: "subspecialty",
                subspecialties: ["spine"],
                items: [
                    item("consent-signed", {
                        label: "Spine consent signed",
                        group: "dayof",
                        required: false,
                        hint: "Includes the level",
                    }),
                ],
            }),
        ]);

        expect(result.items).toEqual([
            {
                itemKey: "consent-signed",
                label: "Spine consent signed",
                hint: "Includes the level",
                required: false,
                group: "dayof",
                position: 0,
                sourceTemplate: "spine",
                sourceScope: "subspecialty",
                sourceCriteria: {},
            },
        ]);
    });

    it("reports each loser with the template that beat it", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("global", {
                items: [item("consent-signed", { label: "Consent signed" })],
            }),
            template("spine", {
                scope: "subspecialty",
                subspecialties: ["spine"],
                items: [item("consent-signed", { group: "dayof" })],
            }),
        ]);

        expect(result.suppressed).toEqual([
            {
                itemKey: "consent-signed",
                label: "Consent signed",
                group: "preop",
                templateId: "global",
                templateName: "global",
                scope: "all",
                beatenByTemplateId: "spine",
                beatenByTemplateName: "spine",
                beatenByScope: "subspecialty",
                groupChanged: true,
            },
        ]);
        expect(described(result, "global").contributed).toBe(0);
        expect(described(result, "spine").contributed).toBe(1);
    });

    it("dedupes on itemKey, never on label", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("a", {
                items: [item("consent-signed", { label: "Consent signed" })],
            }),
            template("b", {
                position: 1,
                items: [item("consent-form", { label: "Consent signed" })],
            }),
        ]);

        expect(keys(result)).toEqual(["consent-signed", "consent-form"]);
    });

    it("breaks a tie within a scope on more criteria", () => {
        const result = assembleChecklist(
            [SPINE],
            { ageMonths: 120, sex: "female" },
            [
                shared("global", { position: 0 }),
                shared("paediatric", { position: 5, ageMaxMonths: 192 }),
            ],
        );

        expect(result.items[0].sourceTemplate).toBe("paediatric");
    });

    it("then on template position, then on template id", () => {
        const byPosition = assembleChecklist([SPINE], UNKNOWN, [
            shared("late", { position: 2 }),
            shared("early", { position: 1 }),
        ]);
        const byId = assembleChecklist([SPINE], UNKNOWN, [
            shared("b", { position: 1 }),
            shared("a", { position: 1 }),
        ]);

        expect(byPosition.items[0].sourceTemplate).toBe("early");
        expect(byId.items[0].sourceTemplate).toBe("a");
    });

    it("keeps scope ahead of criteria", () => {
        const result = assembleChecklist(
            [SPINE],
            { ageMonths: 120, sex: "female" },
            [
                shared("global-narrow", {
                    sexes: ["female"],
                    ageMaxMonths: 192,
                }),
                shared("this-code", {
                    scope: "concept",
                    concepts: ["rec-spine"],
                }),
            ],
        );

        expect(result.items[0].sourceTemplate).toBe("this-code");
    });
});

describe("assembleChecklist: order (§4 step 5)", () => {
    it("orders by group in the fixed phase order, across templates", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("global", {
                items: [
                    item("discharge-plan", { group: "postop", position: 0 }),
                    item("consent-signed", { group: "preop", position: 1 }),
                ],
            }),
            template("this-code", {
                scope: "concept",
                concepts: ["rec-spine"],
                items: [
                    item("implants-ordered", { group: "preop" }),
                    item("level-marked", { group: "theatre" }),
                    item("fasting", { group: "dayof" }),
                ],
            }),
        ]);

        expect(result.items.map((i) => [i.itemKey, i.group])).toEqual([
            ["consent-signed", "preop"],
            ["implants-ordered", "preop"],
            ["fasting", "dayof"],
            ["level-marked", "theatre"],
            ["discharge-plan", "postop"],
        ]);
    });

    it("writes the final index into position", () => {
        const result = assembleChecklist([], UNKNOWN, [
            template("global", {
                items: [
                    item("b", { position: 7 }),
                    item("a", { position: 3 }),
                    item("c", { position: 9 }),
                ],
            }),
        ]);

        expect(result.items.map((i) => [i.itemKey, i.position])).toEqual([
            ["a", 0],
            ["b", 1],
            ["c", 2],
        ]);
    });

    it("within a group puts generic before specific, then fewer criteria, then template position", () => {
        const result = assembleChecklist(
            [SPINE],
            { ageMonths: 120, sex: "female" },
            [
                template("this-code", {
                    scope: "concept",
                    concepts: ["rec-spine"],
                    items: [item("from-concept")],
                }),
                template("global-late", {
                    position: 2,
                    items: [item("from-global-late")],
                }),
                template("global-children", {
                    position: 0,
                    ageMaxMonths: 192,
                    items: [item("from-global-children")],
                }),
                template("global-early", {
                    position: 1,
                    items: [item("from-global-early")],
                }),
                template("spine", {
                    scope: "subspecialty",
                    subspecialties: ["spine"],
                    items: [item("from-subspecialty")],
                }),
            ],
        );

        expect(keys(result)).toEqual([
            "from-global-early",
            "from-global-late",
            "from-global-children",
            "from-subspecialty",
            "from-concept",
        ]);
    });

    it("sorts an unknown group last", () => {
        const result = assembleChecklist([], UNKNOWN, [
            template("global", {
                items: [
                    item("odd", { group: "recovery" }),
                    item("last-known", { group: "postop" }),
                ],
            }),
        ]);

        expect(keys(result)).toEqual(["last-known", "odd"]);
    });
});

describe("assembleChecklist: inactive templates", () => {
    it("lists a matching inactive template but takes no items from it", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("off", { active: false, items: [item("consent-signed")] }),
        ]);

        expect(result.items).toEqual([]);
        expect(described(result, "off")).toMatchObject({
            active: false,
            contributed: 0,
        });
    });

    it("does not let an inactive template suppress an active one's item", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("global", { items: [item("consent-signed")] }),
            template("off", {
                active: false,
                scope: "concept",
                concepts: ["rec-spine"],
                items: [item("consent-signed")],
            }),
        ]);

        expect(result.items[0].sourceTemplate).toBe("global");
        expect(result.suppressed).toEqual([]);
    });
});

describe("assembleChecklist: patient criteria (§3.1)", () => {
    const UNDER_16 = template("under-16", {
        ageMaxMonths: 192,
        items: [item("parental-consent")],
    });
    const FROM_16 = template("from-16", {
        ageMinMonths: 192,
        items: [item("patient-consent")],
    });
    const WOMEN = template("women", {
        sexes: ["female"],
        items: [item("pregnancy-test")],
    });

    it("treats the age range as half-open, so adjacent bands never both match", () => {
        const at = (ageMonths) =>
            keys(
                assembleChecklist([], { ageMonths, sex: null }, [
                    UNDER_16,
                    FROM_16,
                ]),
            );

        expect(at(191)).toEqual(["parental-consent"]);
        expect(at(192)).toEqual(["patient-consent"]);
        expect(at(0)).toEqual(["parental-consent"]);
    });

    it("requires every set criterion to pass", () => {
        const band = template("women-12-to-55", {
            sexes: ["female"],
            ageMinMonths: 144,
            ageMaxMonths: 660,
            items: [item("pregnancy-test")],
        });
        const result = (patient) =>
            keys(assembleChecklist([], patient, [band]));

        expect(result({ ageMonths: 300, sex: "female" })).toEqual([
            "pregnancy-test",
        ]);
        expect(result({ ageMonths: 300, sex: "male" })).toEqual([]);
        expect(result({ ageMonths: 143, sex: "female" })).toEqual([]);
        expect(result({ ageMonths: 660, sex: "female" })).toEqual([]);
    });

    it("says why a template was excluded when the value is out of range", () => {
        const result = assembleChecklist([], { ageMonths: 204, sex: "male" }, [
            UNDER_16,
            WOMEN,
        ]);

        expect(described(result, "under-16").excludedBy).toEqual([
            { field: "age", reason: "outOfRange" },
        ]);
        expect(described(result, "women").excludedBy).toEqual([
            { field: "sex", reason: "outOfRange" },
        ]);
        expect(result.missingFacts).toEqual([]);
    });

    it("fails every age criterion on an unknown age, and records it", () => {
        const result = assembleChecklist([], { ageMonths: null, sex: "male" }, [
            UNDER_16,
            FROM_16,
        ]);

        expect(result.items).toEqual([]);
        expect(described(result, "under-16").excludedBy).toEqual([
            { field: "age", reason: "unknown" },
        ]);
        expect(result.missingFacts).toEqual(["age"]);
    });

    it("fails every sex criterion on an unknown sex, and records it", () => {
        const result = assembleChecklist([], { ageMonths: 300, sex: null }, [
            WOMEN,
        ]);

        expect(result.items).toEqual([]);
        expect(result.missingFacts).toEqual(["sex"]);
    });

    it("leaves a template without a criterion on the missing field alone", () => {
        const result = assembleChecklist([], { ageMonths: 100, sex: null }, [
            UNDER_16,
        ]);

        expect(keys(result)).toEqual(["parental-consent"]);
        expect(result.missingFacts).toEqual([]);
    });

    it("records nothing missing when no template asked for the field", () => {
        const result = assembleChecklist([], UNKNOWN, [
            template("global", { items: [item("consent-signed")] }),
        ]);

        expect(result.missingFacts).toEqual([]);
    });

    it("records a missing field only when it cost an active template its place", () => {
        const result = assembleChecklist([], UNKNOWN, [
            { ...UNDER_16, active: false },
        ]);

        expect(result.missingFacts).toEqual([]);
    });

    it("ignores a template whose scope does not match, whatever its criteria", () => {
        const result = assembleChecklist([CRANIAL], UNKNOWN, [
            template("spine-children", {
                scope: "subspecialty",
                subspecialties: ["spine"],
                ageMaxMonths: 192,
                items: [item("parental-consent")],
            }),
        ]);

        expect(result.templates).toEqual([]);
        expect(result.missingFacts).toEqual([]);
    });

    it("treats a missing patient as one with nothing recorded", () => {
        const result = assembleChecklist([], null, [UNDER_16, WOMEN]);

        expect(result.items).toEqual([]);
        expect(result.missingFacts).toEqual(["age", "sex"]);
    });

    it("carries only the set criteria as sourceCriteria", () => {
        const result = assembleChecklist([], { ageMonths: 100, sex: "female" }, [
            UNDER_16,
            WOMEN,
            template("global", { items: [item("consent-signed")] }),
        ]);
        const criteria = Object.fromEntries(
            result.items.map((i) => [i.itemKey, i.sourceCriteria]),
        );

        expect(criteria).toEqual({
            "consent-signed": {},
            "parental-consent": { ageMaxMonths: 192 },
            "pregnancy-test": { sexes: ["female"] },
        });
    });
});

describe("assembleChecklist: priority (§3.2)", () => {
    const at = (code, priority) => ({ ...code, priority });

    const ELECTIVE = template("elective", {
        priorities: ["elective"],
        items: [item("pre-admission-clinic")],
    });
    const EMERGENCY = template("emergency", {
        priorities: ["emergency"],
        items: [item("theatre-informed")],
    });
    const EMERGENCY_SPINE = template("emergency-spine", {
        scope: "subspecialty",
        subspecialties: ["spine"],
        priorities: ["emergency"],
        items: [item("steroids-considered")],
    });

    it("matches a code recorded at a listed priority", () => {
        const result = (priority) =>
            keys(
                assembleChecklist([at(SPINE, priority)], UNKNOWN, [
                    ELECTIVE,
                    EMERGENCY,
                ]),
            );

        expect(result("elective")).toEqual(["pre-admission-clinic"]);
        expect(result("emergency")).toEqual(["theatre-informed"]);
        expect(result("urgent")).toEqual([]);
    });

    it("matches any value of a multi-value set", () => {
        const acute = template("acute", {
            priorities: ["urgent", "emergency"],
            items: [item("bed-booked")],
        });
        const result = (priority) =>
            keys(assembleChecklist([at(SPINE, priority)], UNKNOWN, [acute]));

        expect(result("urgent")).toEqual(["bed-booked"]);
        expect(result("emergency")).toEqual(["bed-booked"]);
        expect(result("elective")).toEqual([]);
    });

    it("tests scope and priority on the same code", () => {
        const result = assembleChecklist(
            [at(SPINE, "elective"), at(CRANIAL, "emergency")],
            UNKNOWN,
            [EMERGENCY_SPINE],
        );

        expect(result.items).toEqual([]);
        expect(described(result, "emergency-spine").excludedBy).toEqual([
            { field: "priority", reason: "outOfRange" },
        ]);
        expect(result.missingFacts).toEqual([]);
    });

    it("matches when one code is both in scope and at the priority", () => {
        const result = assembleChecklist(
            [at(SPINE, "emergency"), at(CRANIAL, "elective")],
            UNKNOWN,
            [EMERGENCY_SPINE],
        );

        expect(keys(result)).toEqual(["steroids-considered"]);
        expect(described(result, "emergency-spine").matchedConcepts).toEqual([
            "NSX-00010",
        ]);
    });

    it("collects both an elective and an emergency template on mixed priorities, and position decides a shared key", () => {
        const sharing = (id, priority, position) =>
            template(id, {
                position,
                priorities: [priority],
                items: [item("bloods", { label: `${id} bloods` })],
            });
        const result = assembleChecklist(
            [at(SPINE, "elective"), at(CRANIAL, "emergency")],
            UNKNOWN,
            [sharing("for-emergency", "emergency", 2), sharing("for-elective", "elective", 1)],
        );

        expect(result.items.map((i) => i.label)).toEqual([
            "for-elective bloods",
        ]);
        expect(result.suppressed.map((s) => s.templateId)).toEqual([
            "for-emergency",
        ]);
    });

    it("fails every priority criterion on a code with none recorded, and records it", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [EMERGENCY]);

        expect(result.items).toEqual([]);
        expect(described(result, "emergency").excludedBy).toEqual([
            { field: "priority", reason: "unknown" },
        ]);
        expect(result.missingFacts).toEqual(["priority"]);
    });

    it("counts a procedure with no codes as priority not recorded", () => {
        const result = assembleChecklist([], UNKNOWN, [EMERGENCY]);

        expect(described(result, "emergency").excludedBy).toEqual([
            { field: "priority", reason: "unknown" },
        ]);
        expect(result.missingFacts).toEqual(["priority"]);
    });

    it("is satisfied by another code when one has no priority recorded", () => {
        const result = assembleChecklist(
            [SPINE, at(CRANIAL, "emergency")],
            UNKNOWN,
            [EMERGENCY],
        );

        expect(keys(result)).toEqual(["theatre-informed"]);
        expect(result.missingFacts).toEqual([]);
    });

    it("leaves a template with no priorities unaffected", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            template("global", { items: [item("consent-signed")] }),
        ]);

        expect(keys(result)).toEqual(["consent-signed"]);
        expect(result.missingFacts).toEqual([]);
    });

    it("counts priority as one criterion in the tie-break, however many values", () => {
        const result = assembleChecklist([at(SPINE, "urgent")], UNKNOWN, [
            template("global", {
                position: 0,
                items: [item("bloods", { label: "Bloods" })],
            }),
            template("acute", {
                position: 9,
                priorities: ["urgent", "emergency"],
                items: [item("bloods", { label: "Urgent bloods" })],
            }),
        ]);

        expect(result.items[0]).toMatchObject({
            label: "Urgent bloods",
            sourceCriteria: { priorities: ["urgent", "emergency"] },
        });
    });

    it("reports missing fields in the order age, sex, priority", () => {
        const result = assembleChecklist([SPINE], UNKNOWN, [
            EMERGENCY,
            template("women", { sexes: ["female"], items: [item("a")] }),
            template("children", { ageMaxMonths: 192, items: [item("b")] }),
        ]);

        expect(result.missingFacts).toEqual(["age", "sex", "priority"]);
    });
});

describe("customItemKey (§2)", () => {
    /** A transaction in which these keys are already taken on the procedure. */
    const taking = (...taken) => ({
        findFirstRecordByFilter: (_collection, _filter, { itemKey }) => {
            if (!taken.includes(itemKey)) throw new Error("not found");
            return {};
        },
    });

    it("namespaces a slug of the label", () => {
        expect(customItemKey(taking(), "p1", "Cross-match 2 units!")).toBe(
            "custom-cross-match-2-units",
        );
    });

    it("adds a numeric suffix on collision", () => {
        expect(customItemKey(taking("custom-mri"), "p1", "MRI")).toBe(
            "custom-mri-2",
        );
        expect(
            customItemKey(taking("custom-mri", "custom-mri-2"), "p1", "MRI"),
        ).toBe("custom-mri-3");
    });

    it("falls back to a fixed slug when the label has nothing usable", () => {
        expect(customItemKey(taking(), "p1", "???")).toBe("custom-item");
        expect(customItemKey(taking(), "p1", "")).toBe("custom-item");
    });

    it("cuts a long label without leaving a trailing hyphen", () => {
        const key = customItemKey(taking(), "p1", `${"a".repeat(39)} bcd`);

        expect(key).toBe(`custom-${"a".repeat(39)}`);
        expect(key).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    });

    it("gives up rather than loop when every candidate is taken", () => {
        const everything = { findFirstRecordByFilter: () => ({}) };

        expect(() => customItemKey(everything, "p1", "MRI")).toThrow(
            BadRequestError,
        );
    });
});
