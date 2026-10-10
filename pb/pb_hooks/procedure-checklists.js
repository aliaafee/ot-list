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

/**
 * The prefix of a hand-added item's key. Template keys may not use it - see
 * customItemKey and the validation hook in checklist-validation.pb.js.
 */
const CUSTOM_KEY_PREFIX = "custom-";

/** Scope specificity. Higher wins a duplicate itemKey; lower sorts first. */
const SCOPE_RANK = { all: 0, subspecialty: 1, site: 2, concept: 3 };

/** The `patients.sex` vocabulary, which a template's `sexes` draws from. */
const SEXES = ["male", "female"];

/**
 * The `procedureCodes.priority` vocabulary, which a template's `priorities`
 * draws from. A post-coordination qualifier: it is recorded on each code row,
 * never in the catalogue - spec section 3.2.
 */
const PRIORITIES = ["elective", "urgent", "emergency"];

/**
 * Fields a template can be narrowed by, in reporting order. Age and sex are
 * the patient's; priority is a code's.
 */
const FACT_FIELDS = ["age", "sex", "priority"];

/**
 * The calendar date of a stored PocketBase date, as "YYYY-MM-DD", or null.
 *
 * Takes the date part of the stored string and never goes through a Date:
 * a birth date stored at UTC midnight read back in a negative offset would
 * otherwise become the day before.
 */
function datePart(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
    return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

function daysInMonth(year, month) {
    // Day 0 of the next month is the last day of this one. UTC so the
    // server's offset cannot move it.
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Whole completed months from a date of birth to a date, or null.
 *
 * Both are calendar dates ("YYYY-MM-DD", or anything datePart accepts). A
 * month is completed when its day-of-month is reached; a birthday on the
 * 29th-31st counts as reached on the last day of a shorter month. A birth
 * date after `onDate` is bad data and gives null, the same as unknown.
 * Spec section 3.1.
 */
function ageInMonths(dateOfBirth, onDate) {
    const birth = datePart(dateOfBirth);
    const on = datePart(onDate);
    if (!birth || !on) return null;

    const [by, bm, bd] = birth.split("-").map(Number);
    const [oy, om, od] = on.split("-").map(Number);

    let months = (oy - by) * 12 + (om - bm);
    const birthdayThisMonth = Math.min(bd, daysInMonth(oy, om));
    if (od < birthdayThisMonth) months -= 1;

    return months < 0 ? null : months;
}

function hasAgeCriterion(template) {
    return template.ageMinMonths > 0 || template.ageMaxMonths > 0;
}

function hasSexCriterion(template) {
    return template.sexes.length > 0;
}

function hasPriorityCriterion(template) {
    return (template.priorities || []).length > 0;
}

/**
 * How many criteria a template carries: sex one, age one, priority one
 * (however many values it lists).
 */
function criteriaCount(template) {
    return (
        (hasAgeCriterion(template) ? 1 : 0) +
        (hasSexCriterion(template) ? 1 : 0) +
        (hasPriorityCriterion(template) ? 1 : 0)
    );
}

/** A template's criteria, with only the set ones present. */
function criteriaOf(template) {
    const criteria = {};
    if (hasSexCriterion(template)) criteria.sexes = template.sexes.slice();
    if (template.ageMinMonths > 0) criteria.ageMinMonths = template.ageMinMonths;
    if (template.ageMaxMonths > 0) criteria.ageMaxMonths = template.ageMaxMonths;
    if (hasPriorityCriterion(template)) {
        criteria.priorities = template.priorities.slice();
    }
    return criteria;
}

/**
 * Which of a template's patient criteria fail for this patient.
 *
 * An unknown value fails every criterion on it - the template is omitted, not
 * included on a guess. Spec section 3.1. Returns [] when all pass.
 *
 * @param {Object} patient - { ageMonths, sex }, each null when unknown
 */
function failedCriteria(template, patient) {
    const failed = [];

    if (hasAgeCriterion(template)) {
        const age = patient.ageMonths;
        if (age === null || age === undefined) {
            failed.push({ field: "age", reason: "unknown" });
        } else if (
            (template.ageMinMonths > 0 && age < template.ageMinMonths) ||
            (template.ageMaxMonths > 0 && age >= template.ageMaxMonths)
        ) {
            failed.push({ field: "age", reason: "outOfRange" });
        }
    }

    if (hasSexCriterion(template)) {
        if (!patient.sex) {
            failed.push({ field: "sex", reason: "unknown" });
        } else if (template.sexes.indexOf(patient.sex) === -1) {
            failed.push({ field: "sex", reason: "outOfRange" });
        }
    }

    return failed;
}

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
 * The codes a template applies through, and why not when there are none.
 *
 * Scope and priority are tested on the same code: both are facts about a code
 * row, so "emergency spine" needs one row that is both, and an elective spine
 * code beside an emergency cranial one does not match. Spec section 3.2.
 *
 * Returns null when the scope matches nothing - the template is not in play
 * at all. Otherwise { via, failed }: `via` is the codes it matched through
 * (all in-scope codes when it failed, for reporting), and `failed` the
 * priority failure, if any. A code with no priority fails every priority
 * criterion; the reason is "unknown" when recording one might have matched -
 * an in-scope code has none, or there are no codes - and "outOfRange" when
 * every in-scope code has one and none is listed.
 */
function matchCodes(template, codes) {
    const scoped =
        template.scope === "all"
            ? codes
            : codes.filter((code) => matchesConcept(template, code));
    if (template.scope !== "all" && !scoped.length) return null;

    if (!hasPriorityCriterion(template)) return { via: scoped, failed: [] };

    const via = scoped.filter(
        (code) =>
            !!code.priority && template.priorities.indexOf(code.priority) !== -1,
    );
    if (via.length) return { via, failed: [] };

    const unknown = !scoped.length || scoped.some((code) => !code.priority);
    return {
        via: scoped,
        failed: [
            { field: "priority", reason: unknown ? "unknown" : "outOfRange" },
        ],
    };
}

/**
 * Which of two candidates for the same itemKey wins.
 *
 * Most specific scope, then more criteria (a paediatric override of a
 * global item wins without juggling positions), then the earlier template by
 * position, then by id so the result never depends on load order. Priority
 * adds no tie-break of its own: on a procedure whose codes carry different
 * priorities an elective-only and an emergency-only template can both be
 * candidates, and position decides - spec section 11.5.
 */
function compareCandidates(a, b) {
    const rank = scopeRank(b.template.scope) - scopeRank(a.template.scope);
    if (rank !== 0) return rank;
    const criteria = criteriaCount(b.template) - criteriaCount(a.template);
    if (criteria !== 0) return criteria;
    const position = a.template.position - b.template.position;
    if (position !== 0) return position;
    return a.template.id < b.template.id
        ? -1
        : a.template.id > b.template.id
          ? 1
          : 0;
}

/**
 * Assemble a checklist from a procedure's codes, the patient, and the whole
 * template set.
 *
 * Returns four things, and the write path wants the first and last:
 *   items        - the surviving items, ordered, with `position` written in
 *   suppressed   - items trimmed as duplicates, each naming what beat it
 *   templates    - every template whose scope matched, including inactive
 *                  ones and ones a criterion excluded (`excludedBy`)
 *   missingFacts - fields that are unknown and cost at least one active
 *                  template its place, e.g. ["age"] or ["priority"]
 *
 * The losers are returned rather than dropped so the preview does not have to
 * recompute them, which would be a second implementation of these rules.
 *
 * @param {Array} codes - [{ id, conceptId, subspecialty, site, priority }],
 *   one per distinct (concept, priority) on the procedure; `id` is the
 *   concept's record id and `priority` is null when none is recorded
 * @param {Object} patient - { ageMonths, sex }, each null when unknown. Age is
 *   already computed; assembly does no date arithmetic.
 * @param {Array} templates - [{ id, name, scope, active, position,
 *                               subspecialties, sites, concepts,
 *                               sexes, ageMinMonths, ageMaxMonths,
 *                               priorities, items }]
 */
function assembleChecklist(codes, patient, templates) {
    const facts = patient || { ageMonths: null, sex: null };

    // 1-2. Templates matching any code - scope and priority together - and
    // passing the patient criteria. A template matched by several codes is
    // collected once - the first place duplicates are trimmed. A procedure
    // with no codes still gets the global templates. Patient criteria are
    // checked once per template, not per code: a procedure has one patient
    // however many codes it carries.
    const matched = [];
    const excluded = [];
    templates.forEach((template) => {
        const match = matchCodes(template, codes || []);
        if (!match) return;
        // A plain global template applies to everything, so naming the codes
        // it "matched" would say nothing.
        const via =
            template.scope === "all" && !hasPriorityCriterion(template)
                ? []
                : match.via;
        const failed = match.failed.concat(failedCriteria(template, facts));
        if (failed.length) excluded.push({ template, via, failed });
        else matched.push({ template, via });
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
        const criteria =
            criteriaCount(a.template) - criteriaCount(b.template);
        if (criteria !== 0) return criteria;
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
        sourceCriteria: criteriaOf(template),
    }));

    const contributed = {};
    winners.forEach(({ template }) => {
        contributed[template.id] = (contributed[template.id] || 0) + 1;
    });

    // A missing field only counts when it cost an active template its place;
    // a missing date of birth with no age-restricted templates in play is not
    // worth telling anyone about.
    const missing = {};
    excluded.forEach(({ template, failed }) => {
        if (!template.active) return;
        failed.forEach((failure) => {
            if (failure.reason === "unknown") missing[failure.field] = true;
        });
    });

    const describe = ({ template, via }) => ({
        id: template.id,
        name: template.name,
        scope: template.scope,
        active: template.active,
        criteria: criteriaOf(template),
        // Distinct: one concept recorded at two priorities is two codes.
        matchedConcepts: via
            .map((code) => code.conceptId)
            .filter((id, index, all) => all.indexOf(id) === index),
        contributed: contributed[template.id] || 0,
    });

    return {
        items,
        suppressed,
        templates: matched
            .map(describe)
            .concat(
                excluded.map((entry) => ({
                    ...describe(entry),
                    excludedBy: entry.failed,
                })),
            ),
        missingFacts: FACT_FIELDS.filter((field) => missing[field]),
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
            sexes: template.getStringSlice("sexes"),
            ageMinMonths: template.getInt("ageMinMonths"),
            ageMaxMonths: template.getInt("ageMaxMonths"),
            priorities: template.getStringSlice("priorities"),
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

/**
 * A procedure's codes in plain form: one entry per distinct (concept,
 * priority). The same concept at two priorities is two entries, because a
 * template may match one and not the other - spec section 4, step 1.
 */
function codesOfProcedure(app, procedureRecord) {
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
        if (!conceptRecordId) return;
        // The qualifier on this code row, never a property of the concept.
        const value = code.getString("priority");
        const priority = PRIORITIES.indexOf(value) === -1 ? null : value;
        const pair = conceptRecordId + "|" + (priority || "");
        if (seen[pair]) return;
        seen[pair] = true;

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
            priority,
        });
    });

    return concepts;
}

/** The date of a procedure's OT day, as "YYYY-MM-DD", or null. */
function procedureDate(app, procedureRecord) {
    const dayId = procedureRecord.getString("procedureDay");
    if (!dayId) return null;
    try {
        return datePart(app.findRecordById("otDays", dayId).getString("date"));
    } catch (err) {
        return null;
    }
}

/**
 * Is this procedure's day before today? The cut-off for the patient-edit
 * resync, the rebuild route and the patient notices - spec sections 5 and 8.1.
 */
function isPastProcedure(app, procedureRecord) {
    // Today at the hospital, from the app setting - not the server's clock.
    const { todayDate } = require(`${__hooks}/app-settings.js`);
    const date = procedureDate(app, procedureRecord);
    return !!date && date < todayDate(app);
}

/**
 * The patient as assembly needs it, and as the procedure records it.
 *
 * `facts` is what matching reads: age in months as of the procedure's day
 * (never today - spec section 3.1) and sex, each null when unknown. `basis` is
 * the raw inputs those came from, stored on the procedure so the checklist can
 * tell when the patient has since been corrected.
 */
function patientOfProcedure(app, procedureRecord) {
    let dateOfBirth = null;
    let sex = null;

    const patientId = procedureRecord.getString("patient");
    if (patientId) {
        try {
            const patient = app.findRecordById("patients", patientId);
            dateOfBirth = datePart(patient.getString("dateOfBirth"));
            const value = patient.getString("sex");
            sex = SEXES.indexOf(value) === -1 ? null : value;
        } catch (err) {
            // A missing patient reads as one with nothing recorded.
        }
    }

    return {
        facts: {
            ageMonths: ageInMonths(dateOfBirth, procedureDate(app, procedureRecord)),
            sex,
        },
        basis: { dateOfBirth, sex },
    };
}

/** Parse a json field's stored value, or null. */
function readJson(record, field) {
    try {
        const raw = record.getString(field);
        return raw ? JSON.parse(raw) : null;
    } catch (err) {
        return null;
    }
}

/**
 * Copy the patient side of an assembly onto the procedure.
 *
 * `checklistMissingFacts` drives the "not recorded" notice and
 * `checklistPatientBasis` the "details changed" one (spec section 6). Same
 * rules as the outstanding count: written only when a value changes, and
 * `updater` left alone because a rebuild is not an edit of the procedure.
 */
function syncPatientFields(txApp, procedureId, missingFacts, basis) {
    const procedure = txApp.findRecordById("procedures", procedureId);

    const missing = missingFacts.slice().sort();
    const storedMissing = (readJson(procedure, "checklistMissingFacts") || [])
        .slice()
        .sort();
    const storedBasis = readJson(procedure, "checklistPatientBasis") || {};

    const missingChanged =
        JSON.stringify(missing) !== JSON.stringify(storedMissing);
    const basisChanged =
        (storedBasis.dateOfBirth || null) !== basis.dateOfBirth ||
        (storedBasis.sex || null) !== basis.sex;

    if (!missingChanged && !basisChanged) return;

    procedure.set("checklistMissingFacts", missingFacts);
    procedure.set("checklistPatientBasis", basis);
    txApp.save(procedure);
}

/**
 * A free itemKey for a custom item on this procedure.
 *
 * Namespaced under CUSTOM_KEY_PREFIX, which template keys are refused, so a
 * hand-added item can never collide with a template's key: colliding would
 * make a later template item look like the same item and inherit its tick.
 * Derived from the label so the key still reads as something.
 */
function customItemKey(txApp, procedureId, label) {
    const slug = String(label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40)
        // The cut can land on a hyphen, which the key pattern refuses.
        .replace(/-+$/, "");
    const base = CUSTOM_KEY_PREFIX + (slug || "item");

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
 *
 * `templates` may be passed in when one request rebuilds several procedures,
 * so the template set is read once rather than per procedure. It is the same
 * input either way.
 *
 * Returns what changed, for the rebuild route to report:
 * { added, removed, madeInapplicable, restored }.
 */
function syncProcedureChecklist(txApp, procedureRecord, templates) {
    const codes = codesOfProcedure(txApp, procedureRecord);
    const patient = patientOfProcedure(txApp, procedureRecord);
    const { items, missingFacts } = assembleChecklist(
        codes,
        patient.facts,
        templates || loadTemplates(txApp),
    );
    const counts = { added: 0, removed: 0, madeInapplicable: 0, restored: 0 };

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

    const desiredKeys = {};
    items.forEach((item) => {
        desiredKeys[item.itemKey] = true;
    });

    // Template items that no longer match but that someone ticked or
    // commented on. They are kept as a record (below), so they need a place
    // in the list like everything else: left at their old position they
    // would sort into the middle of another group and split its heading.
    const kept = existing
        .filter(
            (record) =>
                !record.getBool("custom") &&
                !desiredKeys[record.getString("itemKey")] &&
                isTouched(record),
        )
        .sort((a, b) => a.getInt("position") - b.getInt("position"));

    // Positions are assigned across the merged list, not across the assembled
    // one, so a custom or kept item does not share a position with a template
    // item. Inside a group: template items, then custom, then kept.
    const merged = [];
    const mergeGroup = (inGroup) => {
        items
            .filter((item) => inGroup(item.group))
            .forEach((item) => merged.push({ item }));
        customs
            .filter((record) => inGroup(record.getString("group")))
            .forEach((record) => merged.push({ record }));
        kept
            .filter((record) => inGroup(record.getString("group")))
            .forEach((record) => merged.push({ record, kept: true }));
    };
    GROUPS.forEach((group) => mergeGroup((value) => value === group));
    // An unknown group would otherwise drop out of the merge entirely.
    mergeGroup((value) => GROUPS.indexOf(value) === -1);

    const collection = txApp.findCollectionByNameOrId(
        "procedureChecklistItems",
    );

    merged.forEach((entry, position) => {
        if (entry.record) {
            // Custom or kept item: only its place in the list is ours to
            // move.
            entry.record.set("position", position);
            if (entry.kept && entry.record.getBool("applicable")) {
                // Someone asserted this was done, or recorded why it was
                // not. Keep it as a record, out of the outstanding count.
                entry.record.set("applicable", false);
                counts.madeInapplicable += 1;
            }
            txApp.save(entry.record);
            return;
        }

        const item = entry.item;
        const found = existingByKey[item.itemKey];

        if (found) {
            // Layout is recomputed; the snapshots and anything staff entered
            // are left alone. An item that stopped matching and has now come
            // back becomes applicable again, tick and comment intact.
            if (!found.getBool("applicable")) counts.restored += 1;
            found.set("group", item.group);
            found.set("position", position);
            found.set("sourceTemplate", item.sourceTemplate);
            found.set("sourceScope", item.sourceScope);
            found.set("sourceCriteria", item.sourceCriteria);
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
        record.set("sourceCriteria", item.sourceCriteria);
        record.set("checked", false);
        record.set("applicable", true);
        record.set("custom", false);
        txApp.save(record);
        counts.added += 1;
    });

    existing.forEach((record) => {
        // A custom item is never stale: no template was ever going to produce
        // it, so its absence from the assembled list says nothing.
        if (record.getBool("custom")) return;
        if (desiredKeys[record.getString("itemKey")]) return;
        // Touched ones were kept and placed in the merge above.
        if (isTouched(record)) return;

        txApp.delete(record);
        counts.removed += 1;
    });

    syncOutstandingCount(txApp, procedureRecord.id);
    // Every rebuild refreshes the basis, whatever triggered it, or the
    // "details changed" notice would stay on a checklist that is current.
    syncPatientFields(
        txApp,
        procedureRecord.id,
        missingFacts,
        patient.basis,
    );

    return counts;
}

/**
 * Assemble against an arbitrary set of codes and patient, for the authoring
 * preview.
 *
 * Each code is a catalogue concept id and the priority it would be recorded
 * at; a missing or null priority is none recorded - the same path a real
 * code entered without one takes.
 *
 * Read-only: it takes catalogue ids rather than a procedure, so there is no
 * record in scope to mutate by accident. The patient is given as an age, not
 * a date of birth - the author asks "what does a 14-year-old get" - so there
 * is no date arithmetic here to drift from ageInMonths.
 *
 * @param {Array} codes - [{ conceptId, priority? }]
 * @param {Object} [patient] - { ageMonths, sex }; missing or null = unknown
 */
function previewChecklist(app, codes, patient) {
    const concepts = [];
    (codes || []).forEach((code) => {
        const conceptId = code && code.conceptId;
        const priority = (code && code.priority) || null;
        if (priority && PRIORITIES.indexOf(priority) === -1) {
            throw new BadRequestError(
                `Invalid priority. Must be one of: ${PRIORITIES.join(", ")}`,
            );
        }
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
        if (
            concepts.some(
                (c) => c.id === concept.id && c.priority === priority,
            )
        ) {
            return;
        }
        concepts.push({
            id: concept.id,
            conceptId: concept.getString("conceptId"),
            subspecialty: concept.getString("subspecialty"),
            site: concept.getString("procedureSite"),
            priority,
        });
    });

    const facts = { ageMonths: null, sex: null };
    if (patient) {
        const age = patient.ageMonths;
        if (age !== null && age !== undefined && age !== "") {
            if (!Number.isInteger(age) || age < 0) {
                throw new BadRequestError(
                    "patient.ageMonths must be a non-negative whole number",
                );
            }
            facts.ageMonths = age;
        }
        if (patient.sex) {
            if (SEXES.indexOf(patient.sex) === -1) {
                throw new BadRequestError(
                    `Invalid patient.sex. Must be one of: ${SEXES.join(", ")}`,
                );
            }
            facts.sex = patient.sex;
        }
    }

    return assembleChecklist(concepts, facts, loadTemplates(app));
}

module.exports = {
    CUSTOM_KEY_PREFIX,
    GROUPS,
    PRIORITIES,
    SEXES,
    ageInMonths,
    assembleChecklist,
    codesOfProcedure,
    customItemKey,
    datePart,
    isPastProcedure,
    loadTemplates,
    previewChecklist,
    syncOutstandingCount,
    syncProcedureChecklist,
};
