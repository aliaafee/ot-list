/**
 * Stand-ins for the PocketBase app and its records, for hook code that reads
 * a few records around the logic under test.
 *
 * Deliberately thin: no filters, no rules, no schema. `findRecordsByFilter`
 * returns every record given for that collection, so a test supplies exactly
 * the rows the code should see. Anything that depends on a real query, a
 * collection rule or a transaction belongs in the integration layer instead.
 */

/** A record as hook code reads one. */
export class FakeRecord {
    constructor(collection, id = "", fields = {}) {
        this.collection = collection;
        this.id = id;
        this.fields = { ...fields };
    }

    set(field, value) {
        this.fields[field] = value;
    }

    get(field) {
        return this.fields[field];
    }

    getString(field) {
        return String(this.fields[field] ?? "");
    }

    getInt(field) {
        return Number(this.fields[field] ?? 0);
    }

    getBool(field) {
        return !!this.fields[field];
    }

    getStringSlice(field) {
        return [...(this.fields[field] ?? [])];
    }
}

/**
 * An app over some existing rows, given as { collection: [[id, fields]] }.
 * Every record handed to `save` is kept, in order, on `app.saved`.
 */
export function fakeApp(rows = {}) {
    const records = Object.fromEntries(
        Object.entries(rows).map(([collection, entries]) => [
            collection,
            entries.map(
                ([id, fields]) => new FakeRecord(collection, id, fields),
            ),
        ]),
    );
    const saved = [];

    return {
        saved,
        findRecordsByFilter: (collection) => records[collection] ?? [],
        // Hook code only ever passes the result on to `new Record(...)`.
        findCollectionByNameOrId: (name) => name,
        save: (record) => {
            if (!record.id) record.id = `new-${saved.length + 1}`;
            saved.push(record);
        },
    };
}
