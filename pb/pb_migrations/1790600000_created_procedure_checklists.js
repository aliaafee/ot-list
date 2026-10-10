/// <reference path="../pb_data/types.d.ts" />

// Procedure checklists - see specs/checklists/README.md.
//
// Three collections: the authored templates, their items, and the items
// materialised onto a procedure. Templates say which slice of the catalogue
// they apply to (everything / a subspecialty / a site / named concepts) and,
// beside that, which patients (sex, and an age range); assembly collects the
// matching ones, trims duplicates by itemKey and writes the result onto the
// procedure.
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
//
// It also changes two existing collections:
//
//   procedures - three fields the checklist keeps up to date (below), and no
//                direct create or update. Both go through the routes in
//                pb_hooks/transactions.pb.js, which build or rebuild the
//                checklist in the same transaction; a direct write would skip
//                that, and could set the derived fields by hand.
//   patients   - no direct update, for the same reason: entering a missing
//                date of birth or sex must rebuild the patient's today and
//                future checklists (spec section 5). POST /api/update-patient
//                checks the same roles the rule did.

const SIGNED_IN = '@request.auth.id != ""';
const ADMIN = '@request.auth.role = "admin"';

// The rules this migration closes, restored on the way down.
const DOCTOR_OR_ADMIN =
  '@request.auth.id != "" && (\n  @request.auth.role = "doctor" ||\n  @request.auth.role = "admin"\n)';
const PROCEDURES_UPDATE_RULE =
  '@request.auth.id != "" && ((\n  @request.auth.role = "doctor" ||\n  @request.auth.role = "admin"\n) ||  (@request.body.pacStatus:isset = true))';

const TEMPLATES_ID = "pbc_5001000001";
const TEMPLATE_ITEMS_ID = "pbc_5001000002";
const PROCEDURE_ITEMS_ID = "pbc_5001000003";

const PROCEDURES_ID = "pbc_1747635922";
const PATIENTS_ID = "pbc_1820489269";
const CONCEPTS_ID = "pbc_1509233874";
const FACET_VALUES_ID = "pbc_3001000001";
const USERS_ID = "_pb_users_auth_";

/** Phase groups, in render order. The order here is the order on screen. */
const GROUPS = ["preop", "dayof", "theatre", "postop"];

/** Where a template applies, most general to most specific. */
const SCOPES = ["all", "subspecialty", "site", "concept"];

/** Same vocabulary as patients.sex. */
const SEXES = ["male", "female"];

/**
 * An itemKey is slug-shaped: lower-case words joined by hyphens. Hand-added
 * items are keyed `custom-...`, which template keys may not use; that part is
 * enforced in pb_hooks/checklist-validation.pb.js, since a field pattern
 * cannot say "does not start with".
 */
const ITEM_KEY_PATTERN = "^[a-z0-9]+(-[a-z0-9]+)*$";

// Fields this migration adds to procedures.
const OUTSTANDING_ID = "number5000000401";
const MISSING_FACTS_ID = "json5000000505";
const PATIENT_BASIS_ID = "json5000000506";

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

function text(
  id,
  name,
  { required = false, presentable = false, pattern = "" } = {},
) {
  return {
    autogeneratePattern: "",
    hidden: false,
    id: "text" + id,
    max: 0,
    min: 0,
    name,
    pattern,
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

function number(id, name, { min = null } = {}) {
  return {
    hidden: false,
    id: "number" + id,
    max: null,
    min,
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

/** "YYYY-MM-DD" from a stored date, without going through a Date. */
function datePart(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

migrate(
  (app) => {
    // Templates. Admin-authored, so only an admin writes them; anyone signed
    // in reads, because assembly runs as the caller.
    //
    // Patient criteria sit beside `scope` rather than inside it - spec section
    // 3.1: `sexes` (empty = any sex) and an age range in whole months,
    // `[ageMinMonths, ageMaxMonths)`, where 0 means no bound. Months rather
    // than years because the paediatric thresholds that matter sit below one
    // year.
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
          // Well above the vocabulary, so a catalogue release adding sites
          // cannot make a template naming all of them invalid. Matches
          // `concepts`.
          relation("5000000105", "sites", FACET_VALUES_ID, { maxSelect: 999 }),
          relation("5000000106", "concepts", CONCEPTS_ID, { maxSelect: 999 }),
          number("5000000107", "position"),
          bool("5000000108", "active"),
          // Stamped by pb_hooks/auto_tracking.pb.js, and by import.
          relation("5000000109", "creator", USERS_ID),
          relation("5000000110", "updater", USERS_ID),
          select("5000000501", "sexes", SEXES, { maxSelect: SEXES.length }),
          number("5000000502", "ageMinMonths", { min: 0 }),
          number("5000000503", "ageMaxMonths", { min: 0 }),
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
          text("5000000202", "itemKey", {
            required: true,
            pattern: ITEM_KEY_PATTERN,
          }),
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
    //
    // `custom` marks a one-off item added to this procedure by hand rather
    // than coming from a template. The flag is what keeps it alive:
    // reconciliation deletes any item that no longer matches a template (spec
    // section 7), and a custom item never matches one. Assembly ignores custom
    // rows; they are ordered after the template items inside their group.
    //
    // `sourceCriteria` is the winning template's patient criteria, kept like
    // `sourceScope` so the UI can explain why an item is there.
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
          text("5000000302", "itemKey", {
            required: true,
            pattern: ITEM_KEY_PATTERN,
          }),
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
          bool("5000000317", "custom"),
          json("5000000504", "sourceCriteria"),
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

    // On procedures, three fields written by the checklist code, never by the
    // client:
    //   checklistOutstanding  - required, applicable, unticked items. The list
    //                           rows must not join (spec section 6), so this
    //                           is a copy on the procedure, the same trade as
    //                           `pacStatus`. Written only when it changes, so
    //                           a tick that leaves it alone does not bump the
    //                           procedure's `updated`.
    //   checklistMissingFacts - patient fields that are unknown and cost the
    //                           checklist at least one template, e.g. ["age"]
    //   checklistPatientBasis - the { dateOfBirth, sex } the checklist was
    //                           built from, so a later correction is noticed
    const procedures = app.findCollectionByNameOrId(PROCEDURES_ID);
    // Index past the end appends.
    procedures.fields.addAt(
      99,
      new Field(
        number("5000000401", "checklistOutstanding", { min: 0 }),
      ),
    );
    procedures.fields.addAt(
      99,
      new Field(json("5000000505", "checklistMissingFacts")),
    );
    procedures.fields.addAt(
      99,
      new Field(json("5000000506", "checklistPatientBasis")),
    );
    procedures.createRule = null;
    procedures.updateRule = null;
    app.save(procedures);

    const patients = app.findCollectionByNameOrId(PATIENTS_ID);
    patients.updateRule = null;
    app.save(patients);

    // Existing procedures have no checklist yet, and nothing to be missing,
    // but they do have a basis: an empty one would read as "details changed"
    // on every procedure. Raw SQL rather than app.save, so the backfill does
    // not move every procedure's `updated` - nothing about them has changed.
    const rows = arrayOf(
      new DynamicModel({ id: "", dateOfBirth: "", sex: "" }),
    );
    app
      .db()
      .newQuery(
        "SELECT procedures.id AS id, " +
          "COALESCE(patients.dateOfBirth, '') AS dateOfBirth, " +
          "COALESCE(patients.sex, '') AS sex " +
          "FROM procedures LEFT JOIN patients ON patients.id = procedures.patient",
      )
      .all(rows);

    rows.forEach((row) => {
      const sex = SEXES.indexOf(row.sex) !== -1 ? row.sex : null;
      const basis = { dateOfBirth: datePart(row.dateOfBirth), sex };
      app
        .db()
        .newQuery(
          "UPDATE procedures SET checklistPatientBasis = {:basis}, " +
            "checklistMissingFacts = '[]', checklistOutstanding = 0 " +
            "WHERE id = {:id}",
        )
        .bind({ basis: JSON.stringify(basis), id: row.id })
        .execute();
    });
  },
  (app) => {
    const patients = app.findCollectionByNameOrId(PATIENTS_ID);
    patients.updateRule = DOCTOR_OR_ADMIN;
    app.save(patients);

    const procedures = app.findCollectionByNameOrId(PROCEDURES_ID);
    procedures.fields.removeById(OUTSTANDING_ID);
    procedures.fields.removeById(MISSING_FACTS_ID);
    procedures.fields.removeById(PATIENT_BASIS_ID);
    procedures.createRule = DOCTOR_OR_ADMIN;
    procedures.updateRule = PROCEDURES_UPDATE_RULE;
    app.save(procedures);

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
