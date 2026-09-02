/// <reference path="../pb_data/types.d.ts" />

// Seeds catalogueRevisions with the initial `add` revision for every catalogue
// record already in the database - the v2026.1 release, seeded by
// 1787895907_seeded_procedureCodes_v2026_1.js before this history table
// existed. Each revision is left open (effectiveTo = "") until a later release
// supersedes it.
//
// Idempotent: a record that already has a v2026.1 revision is skipped, so a
// re-run after a partial failure is safe.

const RELEASE = "v2026.1";
const RELEASE_DATE = "2026-08-29"; // src/data/catalogue-release.json publishedAt

/** A stored date field down to the day, or a fallback when it is unset. */
function day(value, fallback) {
  const text = value ? String(value).slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

/** A json field as a JS array, whichever representation the runtime hands back. */
function jsonArray(record, key) {
  const raw = record.get(key);
  if (raw === null || raw === undefined || raw === "") {
    return [];
  }
  if (Array.isArray(raw)) {
    return raw;
  }
  try {
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    return [];
  }
}

function hasRevision(app, entity, businessId) {
  try {
    const rows = app.findRecordsByFilter(
      "catalogueRevisions",
      "entity = {:entity} && businessId = {:businessId} && release = {:release}",
      "",
      1,
      0,
      { entity: entity, businessId: businessId, release: RELEASE },
    );
    return rows.length > 0;
  } catch (err) {
    return false;
  }
}

function writeRevision(
  app,
  collection,
  entity,
  businessId,
  effectiveFrom,
  active,
  snapshot,
) {
  const row = new Record(collection);
  row.set("entity", entity);
  row.set("businessId", businessId);
  row.set("release", RELEASE);
  row.set("effectiveFrom", effectiveFrom);
  row.set("effectiveTo", "");
  row.set("active", active);
  row.set("changeType", "add");
  row.set("snapshot", snapshot);
  app.save(row);
}

function facetTerm(record, field) {
  const rel = record.expandedOne(field);
  return rel ? rel.getString("term") : null;
}

migrate(
  (app) => {
    const revisions = app.findCollectionByNameOrId("catalogueRevisions");
    const counts = { concept: 0, facetValue: 0, spinalLevel: 0 };

    for (const rec of app.findRecordsByFilter(
      "procedureFacetValues",
      "id != ''",
      "",
      0,
      0,
      {},
    )) {
      const businessId = rec.getString("facetValueId");
      if (!businessId || hasRevision(app, "facetValue", businessId)) {
        continue;
      }
      const from = day(rec.getString("effectiveFrom"), RELEASE_DATE);
      writeRevision(
        app,
        revisions,
        "facetValue",
        businessId,
        from,
        rec.getBool("active"),
        {
          facetValueId: businessId,
          facet: rec.getString("facet"),
          term: rec.getString("term"),
          snomedAttribute: rec.getString("snomedAttribute"),
          active: rec.getBool("active"),
          effectiveFrom: from,
        },
      );
      counts.facetValue++;
    }

    for (const rec of app.findRecordsByFilter(
      "spinalLevels",
      "id != ''",
      "",
      0,
      0,
      {},
    )) {
      const businessId = rec.getString("spinalLevelId");
      if (!businessId || hasRevision(app, "spinalLevel", businessId)) {
        continue;
      }
      const from = day(rec.getString("effectiveFrom"), RELEASE_DATE);
      writeRevision(
        app,
        revisions,
        "spinalLevel",
        businessId,
        from,
        rec.getBool("active"),
        {
          spinalLevelId: businessId,
          kind: rec.getString("kind"),
          code: rec.getString("code"),
          longName: rec.getString("longName"),
          region: rec.getString("region"),
          ordinal: rec.getInt("ordinal"),
          active: rec.getBool("active"),
          effectiveFrom: from,
        },
      );
      counts.spinalLevel++;
    }

    const FACETS = [
      "method",
      "procedureSite",
      "surgicalApproach",
      "device",
      "morphology",
      "defaultIntent",
    ];
    for (const rec of app.findRecordsByFilter(
      "procedureConcepts",
      "id != ''",
      "",
      0,
      0,
      {},
    )) {
      const businessId = rec.getString("conceptId");
      if (!businessId || hasRevision(app, "concept", businessId)) {
        continue;
      }

      app.expandRecord(
        rec,
        FACETS.concat(["procedureConceptSynonyms_via_concept"]),
        null,
      );
      const synonyms = (
        rec.expandedAll("procedureConceptSynonyms_via_concept") || []
      ).map((s) => ({
        term: s.getString("term"),
        language: s.getString("language"),
        isAbbreviation: s.getBool("isAbbreviation"),
        active: s.getBool("active"),
      }));

      const from = day(rec.getString("effectiveFrom"), RELEASE_DATE);
      writeRevision(
        app,
        revisions,
        "concept",
        businessId,
        from,
        rec.getBool("active"),
        {
          conceptId: businessId,
          fsn: rec.getString("fsn"),
          preferredTerm: rec.getString("preferredTerm"),
          subspecialty: rec.getString("subspecialty"),
          facets: {
            method: facetTerm(rec, "method"),
            procedureSite: facetTerm(rec, "procedureSite"),
            surgicalApproach: facetTerm(rec, "surgicalApproach"),
            device: facetTerm(rec, "device"),
            morphology: facetTerm(rec, "morphology"),
            intent: facetTerm(rec, "defaultIntent"),
          },
          lateralityApplicable: rec.getBool("lateralityApplicable"),
          revisionApplicable: rec.getBool("revisionApplicable"),
          levelApplicable: rec.getBool("levelApplicable"),
          levelKind: rec.getString("levelKind") || null,
          levelRegions: jsonArray(rec, "levelRegions"),
          active: rec.getBool("active"),
          inactivationReason: rec.getString("inactivationReason") || null,
          replacedBy: rec.getString("replacedBy") || null,
          effectiveFrom: from,
          catalogueRelease: rec.getString("catalogueRelease") || RELEASE,
          synonyms: synonyms,
        },
      );
      counts.concept++;
    }

    console.log(
      "seeded catalogueRevisions for " +
        RELEASE +
        ": " +
        counts.concept +
        " concept(s), " +
        counts.facetValue +
        " facet value(s), " +
        counts.spinalLevel +
        " spinal level(s)",
    );
  },
  (app) => {
    const rows = app.findRecordsByFilter(
      "catalogueRevisions",
      "release = {:release}",
      "",
      0,
      0,
      { release: RELEASE },
    );
    for (const row of rows) {
      app.delete(row);
    }
    console.log(
      "removed " + rows.length + " catalogueRevisions row(s) for " + RELEASE,
    );
  },
);
