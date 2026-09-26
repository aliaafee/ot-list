/// <reference path="../pb_data/types.d.ts" />

// Starter checklist templates - see specs/checklists/README.md section 12.
//
// Scaffolding, not the intended way to manage templates: once the settings
// dashboard authoring page exists, templates are created and edited there
// rather than by further seed migrations. These exist so there is something
// to render before that page is built, and so dedupe across scopes is
// exercised by real data rather than only by unit tests.
//
// The spine template deliberately reuses the global template's `site-marked`
// key with a stricter label. Assembly should keep the spine wording and
// suppress the general one, because `site` is more specific than `all`.

const GLOBAL_TEMPLATE = "General pre-operative";
const SPINE_TEMPLATE = "Spine";

/**
 * Sites that count as spinal. The site vocabulary is flat - 42 terms with no
 * parent - so breadth is expressed by naming the terms rather than by a
 * hierarchy. This is exactly what the multi-valued `sites` field is for.
 */
const SPINE_SITES = [
  "Cervical vertebral column",
  "Cervicothoracic vertebral column",
  "Thoracic vertebral column",
  "Thoracolumbar vertebral column",
  "Lumbar vertebral column",
  "Intervertebral disc",
  "Vertebral body",
  "Spinal cord",
];

const GLOBAL_ITEMS = [
  ["consent-signed", "Consent signed", "preop", true],
  ["fasting-confirmed", "Fasting confirmed", "preop", true],
  ["allergies-checked", "Allergies checked", "preop", true],
  ["investigations-available", "Investigations available", "preop", true],
  ["identity-confirmed", "Identity band checked", "dayof", true],
  ["site-marked", "Surgical site marked", "dayof", true],
  ["count-correct", "Swab and instrument count correct", "theatre", true],
  ["recovery-handover", "Handover to recovery completed", "postop", true],
];

const SPINE_ITEMS = [
  ["imaging-in-theatre", "Recent imaging available in theatre", "preop", true],
  ["crossmatched", "Blood grouped and cross-matched", "preop", true],
  // Same key as the global item, stricter wording. The more specific template
  // wins and the general one is suppressed.
  [
    "site-marked",
    "Surgical level marked and confirmed against imaging",
    "dayof",
    true,
  ],
  [
    "implants-available",
    "Implants and instrumentation confirmed available",
    "theatre",
    true,
  ],
  [
    "neuro-observations",
    "Post-operative neurological observations started",
    "postop",
    true,
  ],
];

function addItems(app, templateId, rows) {
  const collection = app.findCollectionByNameOrId("checklistTemplateItems");
  rows.forEach(([itemKey, label, group, required], index) => {
    const record = new Record(collection);
    record.set("template", templateId);
    record.set("itemKey", itemKey);
    record.set("label", label);
    record.set("hint", "");
    record.set("required", required);
    record.set("group", group);
    record.set("position", index);
    app.save(record);
  });
}

migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId("checklistTemplates");

    const globalTemplate = new Record(collection);
    globalTemplate.set("name", GLOBAL_TEMPLATE);
    globalTemplate.set(
      "description",
      "Applies to every procedure, whatever it is coded as.",
    );
    globalTemplate.set("scope", "all");
    globalTemplate.set("position", 0);
    globalTemplate.set("active", true);
    app.save(globalTemplate);
    addItems(app, globalTemplate.id, GLOBAL_ITEMS);

    // Resolve the site terms to facet value records. A term the catalogue
    // does not have is skipped rather than fatal: the seed should not block
    // the migration if the site vocabulary is reworded in a later release.
    const siteIds = [];
    SPINE_SITES.forEach((term) => {
      try {
        const site = app.findFirstRecordByFilter(
          "procedureFacetValues",
          "facet = 'site' && term = {:term}",
          { term },
        );
        siteIds.push(site.id);
      } catch (err) {
        console.log(`[seed checklists] no site facet value for "${term}"`);
      }
    });

    const spineTemplate = new Record(collection);
    spineTemplate.set("name", SPINE_TEMPLATE);
    spineTemplate.set(
      "description",
      "Procedures on the vertebral column, discs or spinal cord.",
    );
    spineTemplate.set("scope", "site");
    spineTemplate.set("sites", siteIds);
    spineTemplate.set("position", 1);
    spineTemplate.set("active", true);
    app.save(spineTemplate);
    addItems(app, spineTemplate.id, SPINE_ITEMS);

    console.log(
      `[seed checklists] seeded 2 templates (${siteIds.length} spine sites)`,
    );
  },
  (app) => {
    // Items cascade-delete with their template.
    for (const name of [GLOBAL_TEMPLATE, SPINE_TEMPLATE]) {
      try {
        const record = app.findFirstRecordByFilter(
          "checklistTemplates",
          "name = {:name}",
          { name },
        );
        app.delete(record);
      } catch (err) {
        // Already gone - nothing to undo.
      }
    }
  },
);
