/// <reference path="../pb_data/types.d.ts" />

/**
 * Exporting checklist templates to JSON, and importing them back.
 *
 * See specs/checklists/README.md, section 8.4. A file moves templates between
 * databases - dev to production, one hospital to another - so it never carries
 * record ids. Sites are written as their `facetValueId` ("SIT-0003") and
 * concepts as their `conceptId` ("NSX-00012"), the catalogue's stable ids, and
 * resolved back to whatever records carry them on import.
 *
 * Import is all or nothing: every template is validated before anything is
 * written, and one bad template refuses the file. A template whose name is
 * already taken is skipped, not overwritten - editing a live template changes
 * what new procedures get, and that should be a deliberate edit on the page,
 * not a side effect of a file.
 */

const FORMAT = "ot-list.checklist-templates";
const VERSION = 1;

const SCOPES = ["all", "subspecialty", "site", "concept"];
const GROUPS = ["preop", "dayof", "theatre", "postop"];
const SEXES = ["male", "female"];
const ITEM_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Which target field each scope reads; the others must be empty. */
const SCOPE_TARGET = {
    subspecialty: "subspecialties",
    site: "sites",
    concept: "concepts",
};
const TARGET_FIELDS = ["subspecialties", "sites", "concepts"];

function byId(records, field) {
    const map = {};
    records.forEach((record) => {
        map[record.id] = record.getString(field);
    });
    return map;
}

/** Every template with its items, in the file format. */
function exportTemplates(app) {
    const siteIds = byId(
        app.findRecordsByFilter("procedureFacetValues", "facet = 'site'", "", 0, 0),
        "facetValueId",
    );
    const conceptIds = byId(
        app.findRecordsByFilter("procedureConcepts", "id != ''", "", 0, 0),
        "conceptId",
    );

    const templates = app
        .findRecordsByFilter("checklistTemplates", "id != ''", "position,name", 0, 0)
        .map((template) => {
            const items = app
                .findRecordsByFilter(
                    "checklistTemplateItems",
                    "template = {:template}",
                    "position",
                    0,
                    0,
                    { template: template.id },
                )
                .sort(
                    (a, b) =>
                        GROUPS.indexOf(a.getString("group")) -
                            GROUPS.indexOf(b.getString("group")) ||
                        a.getInt("position") - b.getInt("position"),
                );

            return {
                name: template.getString("name"),
                description: template.getString("description"),
                scope: template.getString("scope"),
                position: template.getInt("position"),
                active: template.getBool("active"),
                subspecialties: template.getStringSlice("subspecialties"),
                sites: template
                    .getStringSlice("sites")
                    .map((id) => siteIds[id])
                    .filter(Boolean),
                concepts: template
                    .getStringSlice("concepts")
                    .map((id) => conceptIds[id])
                    .filter(Boolean),
                sexes: template.getStringSlice("sexes"),
                ageMinMonths: template.getInt("ageMinMonths"),
                ageMaxMonths: template.getInt("ageMaxMonths"),
                items: items.map((item) => ({
                    itemKey: item.getString("itemKey"),
                    label: item.getString("label"),
                    hint: item.getString("hint"),
                    required: item.getBool("required"),
                    group: item.getString("group"),
                    position: item.getInt("position"),
                })),
            };
        });

    return {
        format: FORMAT,
        version: VERSION,
        exportedAt: new Date().toISOString(),
        templates,
    };
}

const isArray = (value) => Array.isArray(value);
const isWholeMonths = (value) =>
    value === undefined || value === null || (Number.isInteger(value) && value >= 0);

/**
 * Validate a file and work out what importing it would do. Reads only.
 *
 * Returns { create, skipped, warnings, errors }. `create` holds each template
 * ready to write, with sites and concepts already resolved to record ids.
 * Nothing should be written when `errors` is non-empty.
 */
function planImport(app, data) {
    const errors = [];
    const warnings = [];
    const create = [];
    const skipped = [];

    if (!data || typeof data !== "object") {
        return { create, skipped, warnings, errors: ["The file is not a JSON object."] };
    }
    if (data.format !== FORMAT) {
        errors.push(`Not a checklist template export (expected format "${FORMAT}").`);
    }
    if (data.version !== VERSION) {
        errors.push(`Unsupported version ${data.version}; this app reads version ${VERSION}.`);
    }
    if (!isArray(data.templates)) {
        errors.push("The file has no templates list.");
    }
    if (errors.length) return { create, skipped, warnings, errors };

    // Catalogue lookups, by the stable ids the file carries.
    const siteByCode = {};
    app.findRecordsByFilter("procedureFacetValues", "facet = 'site'", "", 0, 0).forEach(
        (site) => {
            siteByCode[site.getString("facetValueId")] = site.id;
        },
    );
    const conceptByCode = {};
    const subspecialties = {};
    app.findRecordsByFilter("procedureConcepts", "id != ''", "", 0, 0).forEach(
        (concept) => {
            conceptByCode[concept.getString("conceptId")] = concept.id;
            const subspecialty = concept.getString("subspecialty");
            if (subspecialty) subspecialties[subspecialty] = true;
        },
    );
    const existingNames = {};
    app.findRecordsByFilter("checklistTemplates", "id != ''", "", 0, 0).forEach(
        (template) => {
            existingNames[template.getString("name").trim().toLowerCase()] = true;
        },
    );

    const seenNames = {};

    data.templates.forEach((source, index) => {
        const name =
            source && typeof source.name === "string" ? source.name.trim() : "";
        const where = name ? `"${name}"` : `Template ${index + 1}`;
        const fail = (message) => errors.push(`${where}: ${message}`);

        if (!source || typeof source !== "object") {
            fail("is not an object.");
            return;
        }
        if (!name) {
            fail("has no name.");
            return;
        }

        // Checked before anything else: a taken name is skipped whatever the
        // rest of it says, and names are not unique in the database, so an
        // export can legitimately carry the same taken name twice.
        const nameKey = name.toLowerCase();
        if (existingNames[nameKey]) {
            skipped.push({ name, reason: "A template with this name already exists." });
            return;
        }
        if (seenNames[nameKey]) {
            fail("appears more than once in the file.");
            return;
        }
        seenNames[nameKey] = true;

        const scope = source.scope;
        if (SCOPES.indexOf(scope) === -1) {
            fail(`has an unknown scope "${scope}".`);
            return;
        }

        const template = {
            name,
            description: typeof source.description === "string" ? source.description : "",
            scope,
            position: Number.isInteger(source.position) ? source.position : 0,
            active: source.active !== false,
            subspecialties: [],
            sites: [],
            concepts: [],
            sexes: [],
            ageMinMonths: 0,
            ageMaxMonths: 0,
            items: [],
        };

        // Only the field the scope reads is kept, as the page does when the
        // scope changes; anything in the others would never match.
        const targetField = SCOPE_TARGET[scope];
        TARGET_FIELDS.forEach((field) => {
            if (field === targetField) return;
            if (isArray(source[field]) && source[field].length) {
                warnings.push(`${where}: ignored ${field}, which a "${scope}" template does not use.`);
            }
        });

        if (targetField) {
            const values = source[targetField];
            if (!isArray(values) || !values.length) {
                warnings.push(`${where}: no ${targetField} chosen, so it will match nothing.`);
            } else if (targetField === "subspecialties") {
                template.subspecialties = values.map(String);
                template.subspecialties.forEach((value) => {
                    if (!subspecialties[value]) {
                        warnings.push(`${where}: no procedure in the catalogue has subspecialty "${value}".`);
                    }
                });
            } else {
                const lookup = targetField === "sites" ? siteByCode : conceptByCode;
                values.forEach((code) => {
                    const id = lookup[code];
                    if (id) template[targetField].push(id);
                    else fail(`${targetField === "sites" ? "site" : "procedure code"} "${code}" is not in this catalogue.`);
                });
            }
        }

        // Patient criteria, held to the same rules as the authoring page.
        if (source.sexes !== undefined && !isArray(source.sexes)) {
            fail("sexes must be a list.");
        } else if (isArray(source.sexes)) {
            const unknown = source.sexes.filter((sex) => SEXES.indexOf(sex) === -1);
            if (unknown.length) {
                fail(`unknown sex ${unknown.map((s) => `"${s}"`).join(", ")}.`);
            } else if (source.sexes.length >= SEXES.length) {
                fail("lists every sex; leave sexes empty to mean any sex.");
            } else {
                template.sexes = source.sexes.slice();
            }
        }
        if (!isWholeMonths(source.ageMinMonths) || !isWholeMonths(source.ageMaxMonths)) {
            fail("ages must be whole, non-negative numbers of months.");
        } else {
            template.ageMinMonths = source.ageMinMonths || 0;
            template.ageMaxMonths = source.ageMaxMonths || 0;
            if (
                template.ageMinMonths > 0 &&
                template.ageMaxMonths > 0 &&
                template.ageMinMonths >= template.ageMaxMonths
            ) {
                fail("ageMinMonths must be below ageMaxMonths (the upper age is exclusive).");
            }
        }

        // Items.
        if (source.items !== undefined && !isArray(source.items)) {
            fail("items must be a list.");
        } else {
            const keys = {};
            (source.items || []).forEach((item, itemIndex) => {
                const at = `item ${itemIndex + 1}`;
                if (!item || typeof item !== "object") {
                    fail(`${at} is not an object.`);
                    return;
                }
                const itemKey = typeof item.itemKey === "string" ? item.itemKey.trim() : "";
                const label = typeof item.label === "string" ? item.label.trim() : "";
                if (!ITEM_KEY_PATTERN.test(itemKey)) {
                    fail(`${at} has an invalid key "${item.itemKey}" (lower-case words joined by hyphens).`);
                    return;
                }
                if (keys[itemKey]) {
                    fail(`key "${itemKey}" appears more than once.`);
                    return;
                }
                keys[itemKey] = true;
                if (!label) {
                    fail(`item "${itemKey}" has no label.`);
                    return;
                }
                if (GROUPS.indexOf(item.group) === -1) {
                    fail(`item "${itemKey}" has an unknown group "${item.group}".`);
                    return;
                }
                template.items.push({
                    itemKey,
                    label,
                    hint: typeof item.hint === "string" ? item.hint : "",
                    required: item.required !== false,
                    group: item.group,
                    position: Number.isInteger(item.position) ? item.position : itemIndex,
                });
            });
            if (!template.items.length) {
                warnings.push(`${where}: has no items.`);
            }
        }

        create.push(template);
    });

    return { create, skipped, warnings, errors };
}

/**
 * Import a file: validate everything, then write in the caller's transaction.
 *
 * With `dryRun` nothing is written and the plan is returned, so the page can
 * show what would happen first. With `inactive`, every created template is
 * switched off whatever the file says, so nothing changes what new procedures
 * get until someone turns it on.
 *
 * Returns { created, skipped, warnings, errors, templates } where `templates`
 * summarises what was (or would be) created.
 */
function importTemplates(
    txApp,
    data,
    { dryRun = false, inactive = false, actorId = "" } = {},
) {
    const plan = planImport(txApp, data);
    const summary = plan.create.map((template) => ({
        name: template.name,
        scope: template.scope,
        active: inactive ? false : template.active,
        items: template.items.length,
        sexes: template.sexes,
        ageMinMonths: template.ageMinMonths,
        ageMaxMonths: template.ageMaxMonths,
    }));
    const result = {
        created: 0,
        skipped: plan.skipped,
        warnings: plan.warnings,
        errors: plan.errors,
        templates: summary,
    };

    if (dryRun || plan.errors.length) return result;

    const templates = txApp.findCollectionByNameOrId("checklistTemplates");
    const items = txApp.findCollectionByNameOrId("checklistTemplateItems");

    plan.create.forEach((source) => {
        const record = new Record(templates);
        record.set("name", source.name);
        record.set("description", source.description);
        record.set("scope", source.scope);
        record.set("position", source.position);
        record.set("active", inactive ? false : source.active);
        record.set("subspecialties", source.subspecialties);
        record.set("sites", source.sites);
        record.set("concepts", source.concepts);
        record.set("sexes", source.sexes);
        record.set("ageMinMonths", source.ageMinMonths);
        record.set("ageMaxMonths", source.ageMaxMonths);
        record.set("creator", actorId);
        record.set("updater", actorId);
        txApp.save(record);

        source.items.forEach((item) => {
            const itemRecord = new Record(items);
            itemRecord.set("template", record.id);
            itemRecord.set("itemKey", item.itemKey);
            itemRecord.set("label", item.label);
            itemRecord.set("hint", item.hint);
            itemRecord.set("required", item.required);
            itemRecord.set("group", item.group);
            itemRecord.set("position", item.position);
            txApp.save(itemRecord);
        });

        result.created += 1;
    });

    return result;
}

module.exports = { FORMAT, VERSION, exportTemplates, importTemplates };
