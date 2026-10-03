/// <reference path="../pb_data/types.d.ts" />

// upcomingOtDays draws its line at today's date at the hospital.
//
// It compared against DATE('now'), which is the UTC date: for a hospital ahead
// of UTC yesterday's list stayed "upcoming" until the UTC date rolled over,
// and behind UTC today's list dropped out in the evening. It now shifts 'now'
// by appSettings.utcOffsetMinutes, the same setting the hooks' todayDate and
// the client's hospitalToday read, so all three agree on the day and a change
// to the setting takes effect on the next query.
//
// The COALESCE keeps the view answering, in UTC, if the settings record is
// ever missing: a NULL modifier would make DATE() NULL and the view empty.

const VIEW_ID = "pbc_3819357937";

const UTC_QUERY =
  "SELECT id,date,otList,disabled,remarks,created,updated FROM `otDays` WHERE DATE(date) >= DATE('now') ORDER BY DATE(date) ASC;";

const HOSPITAL_QUERY =
  "SELECT id,date,otList,disabled,remarks,created,updated FROM `otDays` " +
  "WHERE DATE(date) >= DATE('now', COALESCE(" +
  "(SELECT printf('%+d minutes', utcOffsetMinutes) FROM `appSettings` LIMIT 1), " +
  "'+0 minutes')) ORDER BY DATE(date) ASC;";

migrate(
  (app) => {
    const view = app.findCollectionByNameOrId(VIEW_ID);
    view.viewQuery = HOSPITAL_QUERY;
    app.save(view);
  },
  (app) => {
    const view = app.findCollectionByNameOrId(VIEW_ID);
    view.viewQuery = UTC_QUERY;
    app.save(view);
  },
);
