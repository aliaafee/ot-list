/// <reference path="../pb_data/types.d.ts" />

const TRACKED_COLLECTIONS = [
    'procedures',
    'patients',
    'otDays',
    'procedureComments',
    'procedurePacStatuses'
];

// Auto-set creator and updater on create
TRACKED_COLLECTIONS.forEach(collectionName => {
    onRecordCreateRequest((e) => {
        const authRecord = e.auth;

        if (!authRecord) {
            throw new BadRequestError('Authentication required');
        }

        e.record.set('creator', authRecord.id);
        e.record.set('updater', authRecord.id);

        console.log(`[${collectionName}] Auto-set creator and updater to: ${authRecord.id}`);
    }, collectionName);
});

// Auto-update updater on update
TRACKED_COLLECTIONS.forEach(collectionName => {
    onRecordUpdateRequest((e) => {
        const authRecord = e.auth;

        if (!authRecord) {
            throw new BadRequestError('Authentication required');
        }

        const originalCreator = e.record.original().get('creator');
        const newCreator = e.record.get('creator');

        if (originalCreator !== newCreator && originalCreator !== '') {
            throw new BadRequestError('Cannot modify creator field');
        }

        e.record.set('updater', authRecord.id);

        console.log(`[${collectionName}] Auto-updated updater to: ${authRecord.id}`);
    }, collectionName);
});
