/// <reference path="../pb_data/types.d.ts" />

/**
 * Building a procedure's checklist from templates.
 *
 * See specs/checklists/README.md. Lives in its own module because a hook
 * handler runs in its own scope and cannot see functions defined alongside it
 * in the .pb.js file - shared code has to be require()d from inside the
 * handler.
 *
 * `assembleChecklist` is deliberately pure: plain objects in, plain objects
 * out, no app and no records. The two write paths and the preview route all
 * call it, which is the whole reason the preview can be trusted.
 */

/** Phase groups, in render order. Index into this is the primary sort key. */
const GROUPS = ["preop", "dayof", "theatre", "postop"];

/** Scope specificity. Higher wins a duplicate itemKey; lower sorts first. */
const SCOPE_RANK = { all: 0, subspecialty: 1, site: 2, concept: 3 };

function groupIndex(group) {
    const i = GROUPS.indexOf(group);
    // An unknown group sorts last rather than first, so a bad value is
    // visible at the bottom of the list instead of silently heading it.
    return i === -1 ? GROUPS.length : i;
}

function scopeRank(scope) {
    return SCOPE_RANK[scope] ?? -1;
}

/** Does this template apply to this concept? Spec section 3. */
function matchesConcept(template, concept) {
    switch (template.scope) {
        case "all":
            return true;
        case "subspecialty":
            return template.subspecialties.indexOf(concept.subspecialty) !== -1;
        case "site":
            return (
                !!concept.site && template.sites.indexOf(concept.site) !== -1
            );
        case "concept":
            return template.concepts.indexOf(concept.id) !== -1;
        default:
            return false;
    }
}

/**
 * Which of two candidates for the same itemKey wins.
 *
 * Most specific scope, then the earlier template by position, then by id so
 * the result never depends on load order.
 */
function compareCandidates(a, b) {
    const rank = scopeRank(b.template.scope) - scopeRank(a.template.scope);
    if (rank !== 0) return rank;
    const position = a.template.position - b.template.position;
    if (position !== 0) return position;
    return a.template.id < b.template.id
        ? -1
        : a.template.id > b.template.id
          ? 1
          : 0;
}

/**
 * Assemble a checklist from a set of concepts and the whole template set.
 *
 * Returns three things, and the write path only wants the first:
 *   items      - the surviving items, ordered, with `position` written in
 *   suppressed - items trimmed as duplicates, each naming what beat it
 *   templates  - every template that matched, including inactive ones
 *
 * The losers are returned rather than dropped so the preview does not have to
 * recompute them, which would be a second implementation of these rules.
 *
 * @param {Array} concepts - [{ id, conceptId, subspecialty, site }]
 * @param {Array} templates - [{ id, name, scope, active, position,
 *                               subspecialties, sites, concepts, items }]
 */
function assembleChecklist(concepts, templates) {
    // 1-2. Templates matching any concept. A template matched by several
    // concepts is collected once - the first place duplicates are trimmed.
    // `all` is handled outside the concept loop so that a procedure with no
    // codes still gets the global templates.
    const matched = [];
    templates.forEach((template) => {
        if (template.scope === "all") {
            matched.push({ template, via: [] });
            return;
        }
        const via = concepts.filter((concept) =>
            matchesConcept(template, concept),
        );
        if (via.length) matched.push({ template, via });
    });

    // 3. Expand the active ones to candidate items, grouped by key.
    const byKey = {};
    matched.forEach(({ template }) => {
        if (!template.active) return;
        template.items.forEach((item) => {
            if (!byKey[item.itemKey]) byKey[item.itemKey] = [];
            byKey[item.itemKey].push({ item, template });
        });
    });

    // 4. Trim duplicates: most specific wins, the rest are suppressed.
    const winners = [];
    const suppressed = [];
    Object.keys(byKey).forEach((key) => {
        const candidates = byKey[key].slice().sort(compareCandidates);
        const winner = candidates[0];
        winners.push(winner);
        candidates.slice(1).forEach((loser) => {
            suppressed.push({
                itemKey: key,
                label: loser.item.label,
                group: loser.item.group,
                templateId: loser.template.id,
                templateName: loser.template.name,
                scope: loser.template.scope,
                beatenByTemplateId: winner.template.id,
                beatenByTemplateName: winner.template.name,
                beatenByScope: winner.template.scope,
                // Worth surfacing: an item that merely moved heading is more
                // confusing than one that vanished.
                groupChanged: loser.item.group !== winner.item.group,
            });
        });
    });

    // 5. Order. Group first, so a preop item from the global template sits
    // with a preop item from a spine one rather than in separate blocks.
    winners.sort((a, b) => {
        const group = groupIndex(a.item.group) - groupIndex(b.item.group);
        if (group !== 0) return group;
        const rank = scopeRank(a.template.scope) - scopeRank(b.template.scope);
        if (rank !== 0) return rank;
        const position = a.template.position - b.template.position;
        if (position !== 0) return position;
        return a.item.position - b.item.position;
    });

    const items = winners.map(({ item, template }, index) => ({
        itemKey: item.itemKey,
        label: item.label,
        hint: item.hint,
        required: item.required,
        group: item.group,
        position: index,
        sourceTemplate: template.id,
        sourceScope: template.scope,
    }));

    const contributed = {};
    winners.forEach(({ template }) => {
        contributed[template.id] = (contributed[template.id] || 0) + 1;
    });

    return {
        items,
        suppressed,
        templates: matched.map(({ template, via }) => ({
            id: template.id,
            name: template.name,
            scope: template.scope,
            active: template.active,
            matchedConcepts: via.map((concept) => concept.conceptId),
            contributed: contributed[template.id] || 0,
        })),
    };
}

/** Every template with its items, as the plain shape assembly expects. */
function loadTemplates(app) {
    const templates = app.findRecordsByFilter(
        "checklistTemplates",
        "id != ''",
        "position",
        0,
        0,
    );

    return templates.map((template) => {
        const items = app.findRecordsByFilter(
            "checklistTemplateItems",
            "template = {:template}",
            "position",
            0,
            0,
            { template: template.id },
        );

        return {
            id: template.id,
            name: template.getString("name"),
            scope: template.getString("scope"),
            active: template.getBool("active"),
            position: template.getInt("position"),
            subspecialties: template.getStringSlice("subspecialties"),
            sites: template.getStringSlice("sites"),
            concepts: template.getStringSlice("concepts"),
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
}

/** The distinct concepts behind a procedure's codes, in plain form. */
function conceptsOfProcedure(app, procedureRecord) {
    const codes = app.findRecordsByFilter(
        "procedureCodes",
        "procedure = {:procedure}",
        "position",
        0,
        0,
        { procedure: procedureRecord.id },
    );

    const seen = {};
    const concepts = [];
    codes.forEach((code) => {
        const conceptRecordId = code.getString("concept");
        if (!conceptRecordId || seen[conceptRecordId]) return;
        seen[conceptRecordId] = true;

        let concept;
        try {
            concept = app.findRecordById("procedureConcepts", conceptRecordId);
        } catch (err) {
            // A code pointing at a concept that no longer exists should not
            // stop the rest of the checklist being built.
            return;
        }

        concepts.push({
            id: concept.id,
            conceptId: concept.getString("conceptId"),
            subspecialty: concept.getString("subspecialty"),
            site: concept.getString("procedureSite"),
        });
    });

    return concepts;
}

/**
 * A free itemKey for a custom item on this procedure.
 *
 * Namespaced under `custom-` so a hand-added item can never collide with a
 * template's key: colliding would either be rejected by the unique index or,
 * worse, make a later template item look like the same item and inherit its
 * tick. Derived from the label so the key still reads as something.
 */
function customItemKey(txApp, procedureId, label) {
    const slug = String(label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
    const base = "custom-" + (slug || "item");

    for (let attempt = 0; attempt < 100; attempt++) {
        const key = attempt === 0 ? base : `${base}-${attempt + 1}`;
        try {
            txApp.findFirstRecordByFilter(
                "procedureChecklistItems",
                "procedure = {:procedure} && itemKey = {:itemKey}",
                { procedure: procedureId, itemKey: key },
            );
        } catch (err) {
            // Not found, so it is free.
            return key;
        }
    }

    throw new BadRequestError("Could not find a free key for that item");
}

/**
 * Recount a procedure's outstanding items and copy the number onto it.
 *
 * The collapsed list rows need "is anything still to do" without loading the
 * items, the same way they read `pacStatus` rather than joining the status
 * history. Outstanding means required, still applicable, and not ticked - a
 * comment does not make an item done.
 *
 * Writes only when the number changes: ticking an advisory item, or editing a
 * comment, should not bump the procedure's `updated`. `updater` is left alone
 * deliberately, because a checklist tick is not an edit of the procedure.
 */
function syncOutstandingCount(txApp, procedureId) {
    const outstanding = txApp.findRecordsByFilter(
        "procedureChecklistItems",
        "procedure = {:procedure} && required = true && applicable = true && checked = false",
        "",
        0,
        0,
        { procedure: procedureId },
    );

    const procedure = txApp.findRecordById("procedures", procedureId);
    if (procedure.getInt("checklistOutstanding") === outstanding.length) {
        return outstanding.length;
    }

    procedure.set("checklistOutstanding", outstanding.length);
    txApp.save(procedure);

    return outstanding.length;
}

/** Has a person put anything into this row? Spec section 7. */
function isTouched(record) {
    return record.getBool("checked") || !!record.getString("comment");
}

/**
 * Rebuild a procedure's checklist, preserving what staff have entered.
 *
 * Reconciles rather than replacing - unlike syncProcedureCodes, which deletes
 * and recreates wholesale. Codes change on procedures that are already
 * part-ticked, and a tick or a comment is a clinical record.
 *
 * `group` and `position` are rewritten every time; `label`, `hint` and
 * `required` are snapshots and are only ever stamped at creation.
 */
function syncProcedureChecklist(txApp, procedureRecord) {
    const concepts = conceptsOfProcedure(txApp, procedureRecord);
    const templates = loadTemplates(txApp);
    const { items } = assembleChecklist(concepts, templates);

    const existing = txApp.findRecordsByFilter(
        "procedureChecklistItems",
        "procedure = {:procedure}",
        "position",
        0,
        0,
        { procedure: procedureRecord.id },
    );

    const existingByKey = {};
    existing.forEach((record) => {
        existingByKey[record.getString("itemKey")] = record;
    });

    // Items added to this procedure by hand. They come from no template, so
    // assembly never produces them and the orphan pass below must not treat
    // them as stale. They keep their group and sort after the template items
    // inside it.
    const customs = existing
        .filter((record) => record.getBool("custom"))
        .sort((a, b) => a.getInt("position") - b.getInt("position"));

    // Positions are assigned across the merged list, not across the assembled
    // one, so a custom item does not share a position with a template item.
    const merged = [];
    GROUPS.forEach((group) => {
        items
            .filter((item) => item.group === group)
            .forEach((item) => merged.push({ item }));
        customs
            .filter((record) => record.getString("group") === group)
            .forEach((record) => merged.push({ record }));
    });
    // An unknown group would otherwise drop out of the merge entirely.
    items
        .filter((item) => GROUPS.indexOf(item.group) === -1)
        .forEach((item) => merged.push({ item }));
    customs
        .filter((record) => GROUPS.indexOf(record.getString("group")) === -1)
        .forEach((record) => merged.push({ record }));

    const collection = txApp.findCollectionByNameOrId(
        "procedureChecklistItems",
    );
    const desiredKeys = {};

    merged.forEach((entry, position) => {
        if (entry.record) {
            // Custom item: only its place in the list is ours to move.
            entry.record.set("position", position);
            txApp.save(entry.record);
            return;
        }

        const item = entry.item;
        desiredKeys[item.itemKey] = true;
        const found = existingByKey[item.itemKey];

        if (found) {
            // Layout is recomputed; the snapshots and anything staff entered
            // are left alone. An item that stopped matching and has now come
            // back becomes applicable again, tick and comment intact.
            found.set("group", item.group);
            found.set("position", position);
            found.set("sourceTemplate", item.sourceTemplate);
            found.set("sourceScope", item.sourceScope);
            found.set("applicable", true);
            txApp.save(found);
            return;
        }

        const record = new Record(collection);
        record.set("procedure", procedureRecord.id);
        record.set("itemKey", item.itemKey);
        record.set("label", item.label);
        record.set("hint", item.hint || "");
        record.set("required", item.required);
        record.set("group", item.group);
        record.set("position", position);
        record.set("sourceTemplate", item.sourceTemplate);
        record.set("sourceScope", item.sourceScope);
        record.set("checked", false);
        record.set("applicable", true);
        record.set("custom", false);
        txApp.save(record);
    });

    existing.forEach((record) => {
        // A custom item is never stale: no template was ever going to produce
        // it, so its absence from the assembled list says nothing.
        if (record.getBool("custom")) return;
        if (desiredKeys[record.getString("itemKey")]) return;

        if (isTouched(record)) {
            // Someone asserted this was done, or recorded why it was not.
            // Keep it as a record, out of the outstanding count.
            record.set("applicable", false);
            txApp.save(record);
        } else {
            txApp.delete(record);
        }
    });

    syncOutstandingCount(txApp, procedureRecord.id);
}

/**
 * Assemble against an arbitrary set of concept ids, for the authoring preview.
 *
 * Read-only: it takes catalogue ids rather than a procedure, so there is no
 * record in scope to mutate by accident.
 */
function previewChecklist(app, conceptIds) {
    const concepts = [];
    (conceptIds || []).forEach((conceptId) => {
        let concept;
        try {
            concept = app.findFirstRecordByData(
                "procedureConcepts",
                "conceptId",
                conceptId,
            );
        } catch (err) {
            throw new BadRequestError(
                `Unknown procedure concept: ${conceptId}`,
            );
        }
        if (concepts.some((c) => c.id === concept.id)) return;
        concepts.push({
            id: concept.id,
            conceptId: concept.getString("conceptId"),
            subspecialty: concept.getString("subspecialty"),
            site: concept.getString("procedureSite"),
        });
    });

    return assembleChecklist(concepts, loadTemplates(app));
}

module.exports = {
    GROUPS,
    assembleChecklist,
    conceptsOfProcedure,
    customItemKey,
    loadTemplates,
    previewChecklist,
    syncOutstandingCount,
    syncProcedureChecklist,
};
