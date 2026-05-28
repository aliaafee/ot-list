/// <reference path="../pb_data/types.d.ts" />

// const TRACKED_COLLECTIONS = [
//     "procedures",
//     "patients",
//     "otDays",
//     "procedureComments",
//     "procedurePacStatuses",
// ];

onRecordCreateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("creator", authRecord.id);
    e.record.set("updater", authRecord.id);

    console.log(
        `[procedures] Auto-set creator and updater to: ${authRecord.id}`,
    );

    e.next();
}, "procedures");

onRecordUpdateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("updater", authRecord.id);

    console.log(`[procedures] Auto-set updater to: ${authRecord.id}`);

    e.next();
}, "procedures");

onRecordCreateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("creator", authRecord.id);
    e.record.set("updater", authRecord.id);

    console.log(
        `[procedures] Auto-set creator and updater to: ${authRecord.id}`,
    );

    e.next();
}, "patients");

onRecordUpdateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("updater", authRecord.id);

    console.log(`[patients] Auto-set updater to: ${authRecord.id}`);

    e.next();
}, "patients");
