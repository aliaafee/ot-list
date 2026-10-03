import { PRIORITY_OPTIONS } from "@/lib/procedure-catalogue";

/**
 * Checklist vocabulary, shared by the procedure checklist and the template
 * authoring page.
 *
 * Mirrors the `group` and `scope` selects in the checklists migration. Kept in
 * one place so a phase added to the schema is added to the UI once.
 * See specs/checklists/README.md.
 */

/** Phase groups, in render order. The order here is the order on screen. */
export const GROUPS = [
    { value: "preop", label: "Pre-op" },
    { value: "dayof", label: "Day of surgery" },
    { value: "theatre", label: "In theatre" },
    { value: "postop", label: "Post-op" },
];

export const GROUP_LABEL = Object.fromEntries(
    GROUPS.map((group) => [group.value, group.label]),
);

/** Where a template applies, most general to most specific. */
export const SCOPES = [
    { value: "all", label: "All procedures" },
    { value: "subspecialty", label: "Subspecialty" },
    { value: "site", label: "Site" },
    { value: "concept", label: "Procedure code" },
];

export const SCOPE_LABEL = Object.fromEntries(
    SCOPES.map((scope) => [scope.value, scope.label]),
);

/** Which target field each scope reads, and what to call it. */
export const SCOPE_TARGET = {
    subspecialty: { field: "subspecialties", label: "Subspecialties" },
    site: { field: "sites", label: "Sites" },
    concept: { field: "concepts", label: "Procedure codes" },
};

/** The target fields, which a change of scope clears. */
export const TARGET_FIELDS = ["subspecialties", "sites", "concepts"];

/**
 * Patient sexes a template can be narrowed to. Mirrors `patients.sex` and the
 * `sexes` select on checklistTemplates - spec section 3.1.
 */
export const SEXES = [
    { value: "male", label: "Male" },
    { value: "female", label: "Female" },
];

export const SEX_LABEL = Object.fromEntries(
    SEXES.map((sex) => [sex.value, sex.label]),
);

/**
 * Priorities a template can be narrowed to - spec section 3.2. The list the
 * procedure code picker uses, not a copy: priority is a qualifier recorded on
 * each code, and a template may only ask for a value a code can carry.
 */
export const PRIORITIES = PRIORITY_OPTIONS;

export const PRIORITY_LABEL = Object.fromEntries(
    PRIORITIES.map((priority) => [priority.value, priority.label]),
);

/** Patient fields a checklist can be missing, as the notices name them. */
export const PATIENT_FACT_LABEL = { age: "date of birth", sex: "sex" };

/** The fields of `checklistMissingFacts` that are the patient's to fix. */
export const PATIENT_FACTS = ["age", "sex"];

/** An age in months, short: "16 y", "8 m", "1 y 6 m". */
export function formatAgeMonths(months) {
    const years = Math.floor(months / 12);
    const rest = months % 12;
    if (!years) return `${rest} m`;
    return rest ? `${years} y ${rest} m` : `${years} y`;
}

/**
 * A template's age range in words. The upper bound is exclusive, so it reads
 * "under", which is why this exists: `[192, 0)` shown as "16-" would be read
 * as inclusive.
 */
export function describeAgeRange(minMonths, maxMonths) {
    const parts = [];
    if (minMonths > 0) parts.push(`from ${formatAgeMonths(minMonths)}`);
    if (maxMonths > 0) parts.push(`under ${formatAgeMonths(maxMonths)}`);
    return parts.join(", ");
}

/**
 * Criteria in short form - "emergency · female · from 12 y, under 55 y" - or
 * "" when there are none. Takes a template or a `sourceCriteria` object; both
 * carry the same fields. Priority leads: it qualifies the procedure, as the
 * scope before it does, and the rest describe the patient.
 */
export function describeCriteria(criteria) {
    if (!criteria) return "";
    const parts = [];
    if (criteria.priorities?.length) {
        parts.push(
            // In urgency order, however they were ticked.
            PRIORITIES.filter((priority) =>
                criteria.priorities.includes(priority.value),
            )
                .map((priority) => priority.label.toLowerCase())
                .join(" or "),
        );
    }
    if (criteria.sexes?.length) {
        parts.push(
            criteria.sexes
                .map((sex) => (SEX_LABEL[sex] || sex).toLowerCase())
                .join(" or "),
        );
    }
    const age = describeAgeRange(
        criteria.ageMinMonths || 0,
        criteria.ageMaxMonths || 0,
    );
    if (age) parts.push(age);
    return parts.join(" · ");
}

/**
 * How many criteria a template carries: sex one, age one, priority one
 * (however many values it lists).
 */
export function criteriaCount(template) {
    return (
        (template.sexes?.length ? 1 : 0) +
        (template.ageMinMonths > 0 || template.ageMaxMonths > 0 ? 1 : 0) +
        (template.priorities?.length ? 1 : 0)
    );
}

/**
 * Could one code and one patient satisfy both templates' criteria at once?
 *
 * Used to warn about a key reused under overlapping criteria, where
 * `position` then decides which label wins - "under 16" and "under 18" both
 * defining `consent-signed`. Criteria that cannot overlap, like "under 16"
 * and "from 16", or "elective" and "emergency", are the intended pattern.
 *
 * Priorities are compared as sets on one code. A procedure whose codes carry
 * different priorities can still collect both an elective-only and an
 * emergency-only template; that is rare, and the preview shows it.
 */
export function criteriaOverlap(a, b) {
    const aPriorities = a.priorities || [];
    const bPriorities = b.priorities || [];
    if (
        aPriorities.length &&
        bPriorities.length &&
        !aPriorities.some((priority) => bPriorities.includes(priority))
    ) {
        return false;
    }
    const aSexes = a.sexes || [];
    const bSexes = b.sexes || [];
    if (
        aSexes.length &&
        bSexes.length &&
        !aSexes.some((sex) => bSexes.includes(sex))
    ) {
        return false;
    }
    // Half-open ranges [min, max), with 0 meaning no bound.
    const lo = Math.max(a.ageMinMonths || 0, b.ageMinMonths || 0);
    const his = [a.ageMaxMonths, b.ageMaxMonths].filter((max) => max > 0);
    return !his.length || lo < Math.min(...his);
}

/**
 * Keys a template shares with another at the same scope and criteria count,
 * where one patient could satisfy both: Order then decides the label, which
 * is rarely what was meant. Plain reuse with no criteria on either side is how
 * dedupe is meant to work and is not reported.
 *
 * `keys` are { itemKey, template } rows for every template's items, and
 * `templates` every template, as [{ itemKey, template: other }].
 */
export function findKeyOverlaps(template, templateId, templates, keys) {
    if (!criteriaCount(template)) return [];
    const byId = Object.fromEntries(
        templates.map((other) => [other.id, other]),
    );
    const mine = new Set(
        keys
            .filter((key) => key.template === templateId)
            .map((key) => key.itemKey),
    );
    return keys
        .filter((key) => key.template !== templateId && mine.has(key.itemKey))
        .map((key) => ({ itemKey: key.itemKey, template: byId[key.template] }))
        .filter(
            ({ template: other }) =>
                other &&
                other.scope === template.scope &&
                criteriaCount(other) === criteriaCount(template) &&
                criteriaOverlap(other, template),
        );
}

/**
 * The patient details a checklist was built from that no longer match the
 * patient, as [{ field, from, to }]. Empty when the checklist is current, or
 * when it predates the basis being recorded.
 *
 * Plain equality on the stored inputs, deliberately: no age arithmetic here,
 * so there is no second copy of the server's ageInMonths to drift. It can
 * report a change that moves no age band, and the rebuild then says so.
 */
export function patientChanges(basis, patient) {
    if (!basis || !patient) return [];
    const current = {
        dateOfBirth: patient.dateOfBirth
            ? String(patient.dateOfBirth).slice(0, 10)
            : null,
        sex: patient.sex || null,
    };
    const changes = [];
    if ((basis.dateOfBirth || null) !== current.dateOfBirth) {
        changes.push({
            field: "dateOfBirth",
            from: basis.dateOfBirth || null,
            to: current.dateOfBirth,
        });
    }
    if ((basis.sex || null) !== current.sex) {
        changes.push({
            field: "sex",
            from: basis.sex || null,
            to: current.sex,
        });
    }
    return changes;
}

/**
 * An itemKey is the identity of an item, not its wording: it is what dedupe
 * matches on and what ticks are recorded against. Slug-shaped so it stays
 * stable while labels are edited.
 */
export const ITEM_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * The prefix of a hand-added item's key, which a template key may not use:
 * rebuild matches items by key, so a template item keyed like a hand-added
 * one would take it over, tick and all. The server refuses it too.
 */
export const CUSTOM_KEY_PREFIX = "custom-";

/**
 * Walk a position-sorted item list into rows with group headings.
 *
 * Items arrive already ordered by `position`, which the server computed with
 * the group as its primary key, so headings come from noticing the group
 * change rather than from sorting - sorting by `group` here would order the
 * phases alphabetically.
 */
export function withGroupHeadings(items) {
    const rows = [];
    let lastGroup = null;
    items.forEach((item) => {
        if (item.group !== lastGroup) {
            rows.push({ heading: item.group, key: `heading-${item.group}` });
            lastGroup = item.group;
        }
        rows.push({ item, key: item.id || item.itemKey });
    });
    return rows;
}
