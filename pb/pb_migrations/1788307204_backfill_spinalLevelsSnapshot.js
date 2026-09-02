/// <reference path="../pb_data/types.d.ts" />

// Backfills `spinalLevelsSnapshot` on procedureCodes rows that predate the
// column, from their structured `spinalLevels` relation, ordered
// cranio-caudally by each level's `ordinal`. Rows with no levels, or a
// snapshot already set, are left alone.

migrate(
  (app) => {
    const codes = app.findRecordsByFilter(
      "procedureCodes",
      "spinalLevelsSnapshot = ''",
      "",
      0,
      0,
      {},
    );

    let filled = 0;
    for (const code of codes) {
      app.expandRecord(code, ["spinalLevels"], null);
      const levels = code.expandedAll("spinalLevels") || [];
      if (levels.length === 0) {
        continue;
      }

      const snapshot = levels
        .slice()
        .sort((a, b) => a.getInt("ordinal") - b.getInt("ordinal"))
        .map((level) => level.getString("code"))
        .join(", ");

      code.set("spinalLevelsSnapshot", snapshot);
      app.save(code);
      filled++;
    }

    console.log(
      "backfilled spinalLevelsSnapshot on " + filled + " procedure code(s)",
    );
  },
  (app) => {
    // Down: the values are left in place. The column itself is dropped by the
    // down migration of 1788307203 when the whole feature is rolled back.
  },
);
