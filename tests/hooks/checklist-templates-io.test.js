import { describe, expect, it } from "vitest";

import { FakeRecord, fakeApp } from "./fake-app";
import { loadHook } from "./load-hook";

// Section numbers are those of specs/checklists/README.md. Validation is
// reached through importTemplates, as the route reaches it.
const { FORMAT, VERSION, importTemplates } = loadHook(
    "checklist-templates-io.js",
    { Record: FakeRecord },
);

/** A database with a small catalogue and one template already in it. */
const database = () =>
    fakeApp({
        procedureFacetValues: [
            ["site-rec-1", { facetValueId: "SIT-0001" }],
            ["site-rec-2", { facetValueId: "SIT-0002" }],
        ],
        procedureConcepts: [
            ["concept-rec-1", { conceptId: "NSX-00010", subspecialty: "spine" }],
            ["concept-rec-2", { conceptId: "NSX-00020", subspecialty: "cranial-trauma" }],
        ],
        checklistTemplates: [["existing", { name: "Global pre-op" }]],
    });

const file = (...templates) => ({
    format: FORMAT,
    version: VERSION,
    exportedAt: "2026-10-01T00:00:00.000Z",
    templates,
});

const anItem = (over = {}) => ({
    itemKey: "consent-signed",
    label: "Consent signed",
    group: "preop",
    ...over,
});

const aTemplate = (over = {}) => ({
    name: "Spine pre-op",
    scope: "all",
    items: [anItem()],
    ...over,
});

const dryRun = (...templates) =>
    importTemplates(database(), file(...templates), { dryRun: true });

/** The errors for one template that is otherwise valid. */
const errorsFor = (over) => dryRun(aTemplate(over)).errors;

describe("import: the file (§8.4)", () => {
    it("accepts a valid file and reports what it would create", () => {
        const result = dryRun(aTemplate());

        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([]);
        expect(result.templates).toEqual([
            {
                name: "Spine pre-op",
                scope: "all",
                active: true,
                items: 1,
                sexes: [],
                ageMinMonths: 0,
                ageMaxMonths: 0,
                priorities: [],
            },
        ]);
    });

    it("refuses something that is not an export", () => {
        const app = database();

        expect(importTemplates(app, null, { dryRun: true }).errors).toEqual([
            "The file is not a JSON object.",
        ]);
        expect(
            importTemplates(app, { ...file(), format: "something-else" }, { dryRun: true })
                .errors,
        ).toHaveLength(1);
        expect(
            importTemplates(app, { ...file(), version: 2 }, { dryRun: true })
                .errors,
        ).toEqual(["Unsupported version 2; this app reads version 1."]);
        expect(
            importTemplates(app, { format: FORMAT, version: VERSION }, { dryRun: true })
                .errors,
        ).toEqual(["The file has no templates list."]);
    });

    it("refuses a template with no name or an unknown scope", () => {
        expect(errorsFor({ name: "  " })).toEqual(["Template 1: has no name."]);
        expect(errorsFor({ scope: "ward" })).toEqual([
            '"Spine pre-op": has an unknown scope "ward".',
        ]);
    });

    it("skips a template whose name is taken, whatever its case", () => {
        const result = dryRun(aTemplate({ name: " global PRE-OP " }), aTemplate());

        expect(result.errors).toEqual([]);
        expect(result.skipped).toEqual([
            {
                name: "global PRE-OP",
                reason: "A template with this name already exists.",
            },
        ]);
        expect(result.templates.map((t) => t.name)).toEqual(["Spine pre-op"]);
    });

    it("refuses a name that appears twice in the file", () => {
        const result = dryRun(aTemplate(), aTemplate({ name: "SPINE pre-op" }));

        expect(result.errors).toEqual([
            '"SPINE pre-op": appears more than once in the file.',
        ]);
    });
});

describe("import: targets (§8.4)", () => {
    it("refuses a site or procedure code this catalogue does not have", () => {
        expect(errorsFor({ scope: "site", sites: ["SIT-0001", "SIT-9999"] })).toEqual([
            '"Spine pre-op": site "SIT-9999" is not in this catalogue.',
        ]);
        expect(errorsFor({ scope: "concept", concepts: ["NSX-99999"] })).toEqual([
            '"Spine pre-op": procedure code "NSX-99999" is not in this catalogue.',
        ]);
    });

    it("warns, without blocking, about a target that will match nothing", () => {
        const empty = dryRun(aTemplate({ scope: "site", sites: [] }));
        const unknown = dryRun(
            aTemplate({ scope: "subspecialty", subspecialties: ["spine", "dental"] }),
        );

        expect(empty.errors).toEqual([]);
        expect(empty.warnings).toEqual([
            '"Spine pre-op": no sites chosen, so it will match nothing.',
        ]);
        expect(unknown.errors).toEqual([]);
        expect(unknown.warnings).toEqual([
            '"Spine pre-op": no procedure in the catalogue has subspecialty "dental".',
        ]);
    });

    it("drops, with a warning, target fields the scope does not read", () => {
        const result = dryRun(
            aTemplate({
                scope: "subspecialty",
                subspecialties: ["spine"],
                sites: ["SIT-0001"],
            }),
        );

        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual([
            '"Spine pre-op": ignored sites, which a "subspecialty" template does not use.',
        ]);
    });
});

describe("import: criteria (§8.2, §8.4)", () => {
    it("refuses every sex listed, and an unknown sex", () => {
        expect(errorsFor({ sexes: ["male", "female"] })).toEqual([
            '"Spine pre-op": lists every sex; leave sexes empty to mean any sex.',
        ]);
        expect(errorsFor({ sexes: ["other"] })).toEqual([
            '"Spine pre-op": unknown sex "other".',
        ]);
        expect(errorsFor({ sexes: "female" })).toEqual([
            '"Spine pre-op": sexes must be a list.',
        ]);
    });

    it("requires the lower age to be below the upper", () => {
        const message =
            '"Spine pre-op": ageMinMonths must be below ageMaxMonths (the upper age is exclusive).';

        expect(errorsFor({ ageMinMonths: 192, ageMaxMonths: 192 })).toEqual([message]);
        expect(errorsFor({ ageMinMonths: 193, ageMaxMonths: 192 })).toEqual([message]);
        expect(errorsFor({ ageMinMonths: 144, ageMaxMonths: 192 })).toEqual([]);
        expect(errorsFor({ ageMinMonths: 192, ageMaxMonths: 0 })).toEqual([]);
    });

    it("refuses ages that are not whole, non-negative months", () => {
        const message =
            '"Spine pre-op": ages must be whole, non-negative numbers of months.';

        expect(errorsFor({ ageMinMonths: 1.5 })).toEqual([message]);
        expect(errorsFor({ ageMaxMonths: -12 })).toEqual([message]);
        expect(errorsFor({ ageMaxMonths: "192" })).toEqual([message]);
    });

    it("refuses all three priorities, and an unknown priority", () => {
        expect(
            errorsFor({ priorities: ["elective", "urgent", "emergency"] }),
        ).toEqual([
            '"Spine pre-op": lists every priority; leave priorities empty to mean any priority.',
        ]);
        expect(errorsFor({ priorities: ["routine"] })).toEqual([
            '"Spine pre-op": unknown priority "routine".',
        ]);
    });

    it("imports a file with no priorities as any priority", () => {
        const result = dryRun(aTemplate());

        expect(result.errors).toEqual([]);
        expect(result.templates[0].priorities).toEqual([]);
    });

    it("keeps each listed priority once", () => {
        const result = dryRun(
            aTemplate({ priorities: ["emergency", "urgent", "emergency"] }),
        );

        expect(result.errors).toEqual([]);
        expect(result.templates[0].priorities).toEqual(["emergency", "urgent"]);
    });
});

describe("import: items (§8.2, §8.4)", () => {
    const itemErrors = (...items) => errorsFor({ items });

    it("refuses a key that is not lower-case words joined by hyphens", () => {
        for (const itemKey of ["Consent Signed", "consent_signed", "-consent", "consent-", ""]) {
            expect(itemErrors(anItem({ itemKey }))).toHaveLength(1);
        }
    });

    it("refuses a key in the namespace reserved for hand-added items", () => {
        expect(itemErrors(anItem({ itemKey: "custom-mri" }))).toEqual([
            '"Spine pre-op": item 1 has the key "custom-mri", but keys starting "custom-" are reserved for items added to a single procedure.',
        ]);
        expect(itemErrors(anItem({ itemKey: "customs-form" }))).toEqual([]);
    });

    it("refuses a key used twice in one template", () => {
        expect(itemErrors(anItem(), anItem({ label: "Again" }))).toEqual([
            '"Spine pre-op": key "consent-signed" appears more than once.',
        ]);
    });

    it("refuses an item with no label or an unknown group", () => {
        expect(itemErrors(anItem({ label: " " }))).toEqual([
            '"Spine pre-op": item "consent-signed" has no label.',
        ]);
        expect(itemErrors(anItem({ group: "recovery" }))).toEqual([
            '"Spine pre-op": item "consent-signed" has an unknown group "recovery".',
        ]);
    });

    it("warns, without blocking, about a template with no items", () => {
        const result = dryRun(aTemplate({ items: [] }));

        expect(result.errors).toEqual([]);
        expect(result.warnings).toEqual(['"Spine pre-op": has no items.']);
    });

    it("lists every problem in the file, not only the first", () => {
        const result = dryRun(
            aTemplate({ sexes: ["male", "female"], items: [anItem({ group: "x" })] }),
            aTemplate({ name: "Second", scope: "ward" }),
        );

        expect(result.errors).toHaveLength(3);
    });
});

describe("import: writing (§8.4)", () => {
    it("writes nothing on a dry run", () => {
        const app = database();
        const result = importTemplates(app, file(aTemplate()), { dryRun: true });

        expect(result.created).toBe(0);
        expect(app.saved).toEqual([]);
    });

    it("writes nothing at all when any template has an error", () => {
        const app = database();
        const result = importTemplates(
            app,
            file(aTemplate(), aTemplate({ name: "Bad", scope: "ward" })),
        );

        expect(result.errors).toHaveLength(1);
        expect(result.created).toBe(0);
        expect(app.saved).toEqual([]);
    });

    it("writes each template and then its items, with catalogue ids resolved to record ids", () => {
        const app = database();
        const result = importTemplates(
            app,
            file(
                aTemplate({
                    scope: "concept",
                    concepts: ["NSX-00020", "NSX-00010"],
                    position: 4,
                    sexes: ["female"],
                    ageMinMonths: 144,
                    priorities: ["emergency"],
                    items: [
                        anItem(),
                        anItem({ itemKey: "bloods", label: "Bloods", group: "dayof", required: false }),
                    ],
                }),
            ),
            { actorId: "user-1" },
        );

        expect(result.created).toBe(1);

        const [template, first, second] = app.saved;
        expect(template.collection).toBe("checklistTemplates");
        expect(template.fields).toEqual({
            name: "Spine pre-op",
            description: "",
            scope: "concept",
            position: 4,
            active: true,
            subspecialties: [],
            sites: [],
            concepts: ["concept-rec-2", "concept-rec-1"],
            sexes: ["female"],
            ageMinMonths: 144,
            ageMaxMonths: 0,
            priorities: ["emergency"],
            creator: "user-1",
            updater: "user-1",
        });
        expect(first.collection).toBe("checklistTemplateItems");
        expect(first.fields).toEqual({
            template: template.id,
            itemKey: "consent-signed",
            label: "Consent signed",
            hint: "",
            required: true,
            group: "preop",
            position: 0,
            });
        expect(second.fields).toMatchObject({
            template: template.id,
            itemKey: "bloods",
            required: false,
            group: "dayof",
            position: 1,
        });
    });

    it("keeps the file's active flag, unless importing as inactive", () => {
        const asFiled = database();
        const switchedOff = database();
        const templates = [
            aTemplate({ name: "On" }),
            aTemplate({ name: "Off", active: false }),
        ];

        importTemplates(asFiled, file(...templates));
        importTemplates(switchedOff, file(...templates), { inactive: true });

        const active = (app) =>
            app.saved
                .filter((record) => record.collection === "checklistTemplates")
                .map((record) => record.fields.active);
        expect(active(asFiled)).toEqual([true, false]);
        expect(active(switchedOff)).toEqual([false, false]);
    });

    it("does not write a template whose name is taken", () => {
        const app = database();
        const result = importTemplates(app, file(aTemplate({ name: "Global pre-op" })));

        expect(result.created).toBe(0);
        expect(result.skipped).toHaveLength(1);
        expect(app.saved).toEqual([]);
    });
});
