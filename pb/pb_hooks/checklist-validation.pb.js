/// <reference path="../pb_data/types.d.ts" />

console.log("Loading hooks/checklist-validation.js");

// Template item keys may not use the prefix reserved for hand-added items.
//
// Rebuild matches a procedure's items to the assembled ones by key, so a
// template item keyed like an item added by hand would take that item over,
// tick and comment included. The dashboard and import both refuse such a key
// already; this covers every other way in, since a validate hook runs on any
// save, from the API or from a route.
//
// Only checked when the key is new or changing, so an item that predates the
// rule can still be reordered.
onRecordValidate((e) => {
    const { CUSTOM_KEY_PREFIX } = require(`${__hooks}/procedure-checklists.js`);
    const itemKey = e.record.getString("itemKey");
    const changed =
        e.record.isNew() ||
        e.record.original().getString("itemKey") !== itemKey;

    if (changed && itemKey.indexOf(CUSTOM_KEY_PREFIX) === 0) {
        throw new BadRequestError(
            `Keys starting "${CUSTOM_KEY_PREFIX}" are reserved for items added to a single procedure.`,
        );
    }

    e.next();
}, "checklistTemplateItems");
