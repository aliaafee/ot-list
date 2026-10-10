/// <reference path="../pb_data/types.d.ts" />

// App settings - one record, read by everyone signed in, edited by admins from
// the settings dashboard.
//
// `utcOffsetMinutes` is the hospital's time zone as an offset from UTC. It
// decides which day is "today" wherever that is a rule rather than a display:
// the cut-off after which a procedure's checklist is no longer rebuilt
// (specs/checklists/README.md, sections 5 and 8.1). The server's own zone is
// wherever it happens to be hosted, and the browser reads this same value, so
// the two cannot disagree around midnight.
//
// An offset rather than a zone name because the hooks runtime has no time
// zone database to resolve a name with. A hospital that observes daylight
// saving changes the setting when the clocks change.
//
// The record has a fixed id so both sides can read it without a query. It is
// seeded with the server's current offset, which is what the cut-off used
// before this setting existed, so nothing changes until an admin changes it.

const SETTINGS_COLLECTION_ID = "pbc_5001000004";
const SETTINGS_ID = "appsettings0001";

const SIGNED_IN = '@request.auth.id != ""';
const ADMIN = '@request.auth.role = "admin"';

migrate(
  (app) => {
    const collection = new Collection({
      id: SETTINGS_COLLECTION_ID,
      name: "appSettings",
      type: "base",
      system: false,
      fields: [
        {
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
        },
        {
          hidden: false,
          id: "number5000000601",
          // UTC-12:00 to UTC+14:00, the range in use.
          max: 840,
          min: -720,
          name: "utcOffsetMinutes",
          onlyInt: true,
          presentable: false,
          required: false,
          system: false,
          type: "number",
        },
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
      ],
      indexes: [],
      listRule: SIGNED_IN,
      viewRule: SIGNED_IN,
      // One record, made here: nothing creates or deletes it afterwards.
      createRule: null,
      updateRule: ADMIN,
      deleteRule: null,
    });
    app.save(collection);

    const record = new Record(collection);
    record.set("id", SETTINGS_ID);
    // getTimezoneOffset is minutes behind UTC; the setting is minutes ahead.
    record.set("utcOffsetMinutes", -new Date().getTimezoneOffset());
    app.save(record);
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId(SETTINGS_COLLECTION_ID));
    } catch (err) {
      // Already gone - nothing to undo.
    }
  },
);
