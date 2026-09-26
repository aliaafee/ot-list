/// <reference path="../pb_data/types.d.ts" />

// Procedure checklists - see specs/checklists/README.md.
//
// Three collections: the authored templates, their items, and the items
// materialised onto a procedure. Templates say which slice of the catalogue
// they apply to (everything / a subspecialty / a site / named concepts);
// assembly collects the matching ones, trims duplicates by itemKey and writes
// the result onto the procedure.
//
// The scope targets are multi-valued because the site vocabulary is flat - 42
// terms with no parent - so "all spine" is expressed as one template naming
// several sites rather than as a hierarchy. `scope` stays single-valued so
// dedupe specificity is never ambiguous.
//
// procedureChecklistItems carries snapshots of label/hint/required, following
// procedureCodes: editing a template must not rewrite what past procedures
// were asked to do. `group` and `position` are NOT snapshots - they are layout
// and are recomputed together on every reconciliation.

const SIGNED_IN = '@request.auth.id != ""';
const ADMIN = '@request.auth.role = "admin"';

const TEMPLATES_ID = "pbc_5001000001";
const TEMPLATE_ITEMS_ID = "pbc_5001000002";
const PROCEDURE_ITEMS_ID = "pbc_5001000003";

const PROCEDURES_ID = "pbc_1747635922";
const CONCEPTS_ID = "pbc_1509233874";
const FACET_VALUES_ID = "pbc_3001000001";
const USERS_ID = "_pb_users_auth_";

/** Phase groups, in render order. The order here is the order on screen. */
const GROUPS = ["preop", "dayof", "theatre", "postop"];

/** Where a template applies, most general to most specific. */
const SCOPES = ["all", "subspecialty", "site", "concept"];

const idField = {
  autogeneratePattern: "[a-z0-9]{15}",
  hidden: false,
  id: "text3208210256",
  max: 15,
  min: 15,
  name: "id",
  pattern: "^[a-z0-9]+$",
  presentable: false,
  primaryKey: true,
  required: true,
  system: true,
  type: "text",
};

const timestamps = [
  {
    hidden: false,
    id: "autodate2990389176",
    name: "created",
    onCreate: true,
    onUpdate: false,
    presentable: false,
    system: false,
    type: "autodate",
  },
  {
    hidden: false,
    id: "autodate3332085495",
    name: "updated",
    onCreate: true,
    onUpdate: true,
    presentable: false,
    system: false,
    type: "autodate",
  },
];

function text(id, name, { required = false, presentable = false } = {}) {
  return {
    autogeneratePattern: "",
    hidden: false,
    id: "text" + id,
    max: 0,
    min: 0,
    name,
    pattern: "",
    presentable,
    primaryKey: false,
    required,
    system: false,
    type: "text",
  };
}

function select(id, name, values, { required = false, maxSelect = 1 } = {}) {
  return {
    hidden: false,
    id: "select" + id,
    maxSelect,
    name,
    presentable: false,
    required,
    system: false,
    type: "select",
    values,
  };
}

function bool(id, name) {
  return {
    hidden: false,
    id: "bool" + id,
    name,
    presentable: false,
    required: false,
    system: false,
    type: "bool",
  };
}

function number(id, name) {
  return {
    hidden: false,
    id: "number" + id,
    max: null,
    min: null,
    name,
    onlyInt: true,
    presentable: false,
    required: false,
    system: false,
    type: "number",
  };
}

function date(id, name) {
  return {
    hidden: false,
    id: "date" + id,
    max: "",
    min: "",
    name,
    presentable: false,
    required: false,
    system: false,
    type: "date",
  };
}

function json(id, name) {
  return {
    hidden: false,
    id: "json" + id,
    maxSize: 0,
    name,
    presentable: false,
    required: false,
    system: false,
    type: "json",
  };
}

function relation(
  id,
  name,
  collectionId,
  { required = false, cascadeDelete = false, maxSelect = 1 } = {},
) {
  return {
    cascadeDelete,
    collectionId,
    hidden: false,
    id: "relation" + id,
    maxSelect,
    minSelect: 0,
    name,
    presentable: false,
    required,
    system: false,
    type: "relation",
  };
}

migrate(
  (app) => {
    // Templates. Admin-authored, so only an admin writes them; anyone signed
    // in reads, because assembly runs as the caller.
    app.save(
      new Collection({
        id: TEMPLATES_ID,
        name: "checklistTemplates",
        type: "base",
        system: false,
        fields: [
          idField,
          text("5000000101", "name", { required: true, presentable: true }),
          text("5000000102", "description"),
          select("5000000103", "scope", SCOPES, { required: true }),
          // Subspecialty is a plain indexed text field on procedureConcepts,
          // not a relation, so the target is a json array of those strings
          // rather than a relation.
          json("5000000104", "subspecialties"),
          relation("5000000105", "sites", FACET_VALUES_ID, { maxSelect: 42 }),
          relation("5000000106", "concepts", CONCEPTS_ID, { maxSelect: 999 }),
          number("5000000107", "position"),
          bool("5000000108", "active"),
          relation("5000000109", "creator", USERS_ID),
          relation("5000000110", "updater", USERS_ID),
          ...timestamps,
        ],
        indexes: [
          "CREATE INDEX `idx_checklistTemplates_scope` ON `checklistTemplates` (`scope`, `active`)",
        ],
        listRule: SIGNED_IN,
        viewRule: SIGNED_IN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
      }),
    );

    // The items of a template. itemKey is the dedupe key and the item's
    // identity: unique within a template, deliberately reused across templates
    // so a more specific one can override a general one.
    app.save(
      new Collection({
        id: TEMPLATE_ITEMS_ID,
        name: "checklistTemplateItems",
        type: "base",
        system: false,
        fields: [
          idField,
          relation("5000000201", "template", TEMPLATES_ID, {
            required: true,
            cascadeDelete: true,
          }),
          text("5000000202", "itemKey", { required: true }),
          text("5000000203", "label", { required: true, presentable: true }),
          text("5000000204", "hint"),
          bool("5000000205", "required"),
          select("5000000206", "group", GROUPS, { required: true }),
          number("5000000207", "position"),
          ...timestamps,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_checklistTemplateItems_key` ON `checklistTemplateItems` (`template`, `itemKey`)",
          "CREATE INDEX `idx_checklistTemplateItems_order` ON `checklistTemplateItems` (`template`, `group`, `position`)",
        ],
        listRule: SIGNED_IN,
        viewRule: SIGNED_IN,
        createRule: ADMIN,
        updateRule: ADMIN,
        deleteRule: ADMIN,
      }),
    );

    // The materialised checklist. No client-facing write rules at all: ticks
    // and comments go through POST /api/set-checklist-item so that each
    // attribution triple is written as a unit, and assembly is the only other
    // writer.
    app.save(
      new Collection({
        id: PROCEDURE_ITEMS_ID,
        name: "procedureChecklistItems",
        type: "base",
        system: false,
        fields: [
          idField,
          relation("5000000301", "procedure", PROCEDURES_ID, {
            required: true,
            cascadeDelete: true,
          }),
          text("5000000302", "itemKey", { required: true }),
          text("5000000303", "label", { required: true, presentable: true }),
          text("5000000304", "hint"),
          bool("5000000305", "required"),
          select("5000000306", "group", GROUPS),
          number("5000000307", "position"),
          relation("5000000308", "sourceTemplate", TEMPLATES_ID),
          select("5000000309", "sourceScope", SCOPES),
          bool("5000000310", "checked"),
          relation("5000000311", "checkedBy", USERS_ID),
          date("5000000312", "checkedAt"),
          text("5000000313", "comment"),
          relation("5000000314", "commentBy", USERS_ID),
          date("5000000315", "commentAt"),
          bool("5000000316", "applicable"),
          ...timestamps,
        ],
        indexes: [
          "CREATE UNIQUE INDEX `idx_procedureChecklistItems_key` ON `procedureChecklistItems` (`procedure`, `itemKey`)",
          "CREATE INDEX `idx_procedureChecklistItems_order` ON `procedureChecklistItems` (`procedure`, `position`)",
        ],
        listRule: SIGNED_IN,
        viewRule: SIGNED_IN,
        createRule: null,
        updateRule: null,
        deleteRule: null,
      }),
    );
  },
  (app) => {
    // Reverse dependency order: procedure items and template items both point
    // at templates.
    for (const id of [PROCEDURE_ITEMS_ID, TEMPLATE_ITEMS_ID, TEMPLATES_ID]) {
      try {
        app.delete(app.findCollectionByNameOrId(id));
      } catch (err) {
        // Already gone - nothing to undo.
      }
    }
  },
);
