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

/**
 * An itemKey is the identity of an item, not its wording: it is what dedupe
 * matches on and what ticks are recorded against. Slug-shaped so it stays
 * stable while labels are edited.
 */
export const ITEM_KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
