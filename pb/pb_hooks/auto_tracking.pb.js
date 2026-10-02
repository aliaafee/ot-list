/// <reference path="../pb_data/types.d.ts" />

console.log("Loading hooks/auto_tracking.js");

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

onRecordCreateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("creator", authRecord.id);
    e.record.set("updater", authRecord.id);

    console.log(`[otDays] Auto-set creator and updater to: ${authRecord.id}`);

    e.next();
}, "otDays");

onRecordUpdateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("updater", authRecord.id);

    console.log(`[otDays] Auto-set updater to: ${authRecord.id}`);

    e.next();
}, "otDays");

onRecordCreateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("creator", authRecord.id);

    console.log(`[procedureComments] Auto-set creator to: ${authRecord.id}`);

    e.next();
}, "procedureComments");

onRecordCreateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("creator", authRecord.id);

    console.log(`[procedurePacStatuses] Auto-set creator to: ${authRecord.id}`);

    e.next();
}, "procedurePacStatuses");

// Checklist templates are written straight from the settings dashboard, so
// the collection API is where their authorship is stamped. Import sets the
// same two fields itself, since it saves inside a route.
onRecordCreateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("creator", authRecord.id);
    e.record.set("updater", authRecord.id);

    e.next();
}, "checklistTemplates");

onRecordUpdateRequest((e) => {
    const authRecord = e.auth;

    if (!authRecord) {
        throw new BadRequestError("Authentication required");
    }

    e.record.set("updater", authRecord.id);

    e.next();
}, "checklistTemplates");
