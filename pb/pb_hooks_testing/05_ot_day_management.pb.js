/// <reference path="../pb_data/types.d.ts" />

// POST /api/ot-days/bulk-create
// Create multiple OT days at once, skipping existing ones
routerAdd('POST', '/api/ot-days/bulk-create', (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError('Authentication required');
    }

    const role = authRecord.get('role');
    if (role !== 'doctor' && role !== 'admin') {
        throw new ForbiddenError('Only doctors and admins can create OT days');
    }

    const data = e.requestInfo().body;

    if (!data.otListId || !data.dates || !Array.isArray(data.dates)) {
        throw new BadRequestError('Missing required fields: otListId, dates (array)');
    }

    if (data.dates.length === 0) {
        throw new BadRequestError('dates array cannot be empty');
    }

    const created = [];
    const skipped = [];
    const errors = [];

    try {
        $app.runInTransaction((txApp) => {
            data.dates.forEach((dateStr) => {
                try {
                    const existing = txApp.findRecordsByFilter(
                        'otDays',
                        `date = '${dateStr}' && otList = '${data.otListId}'`,
                        '',
                        1,
                        0
                    );

                    if (existing.length > 0) {
                        skipped.push({
                            date: dateStr,
                            reason: 'Already exists',
                            existingId: existing[0].id
                        });
                        return;
                    }

                    const collection = txApp.findCollectionByNameOrId('otDays');
                    const record = new Record(collection);

                    record.set('date', dateStr);
                    record.set('otList', data.otListId);
                    record.set('disabled', data.disabled || false);
                    record.set('remarks', data.remarks || '');
                    record.set('creator', authRecord.id);
                    record.set('updater', authRecord.id);

                    txApp.save(record);

                    created.push({
                        id: record.id,
                        date: dateStr
                    });

                    console.log(`[bulk-create-ot-days] Created: ${record.id} for date: ${dateStr}`);

                } catch (error) {
                    errors.push({
                        date: dateStr,
                        error: error.message
                    });
                    console.error(`[bulk-create-ot-days] Error for date ${dateStr}:`, error);
                }
            });
        });

        return e.json(200, {
            success: true,
            createdCount: created.length,
            skippedCount: skipped.length,
            errorCount: errors.length,
            created: created,
            skipped: skipped,
            errors: errors
        });

    } catch (error) {
        console.error('[bulk-create-ot-days] Transaction error:', error);
        throw new BadRequestError(`Failed to bulk create OT days: ${error.message}`);
    }
}, $apis.requireAuth());


// PATCH /api/ot-days/:id/toggle-status
// Enable or disable an OT day (remarks required when disabling)
routerAdd('PATCH', '/api/ot-days/:id/toggle-status', (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError('Authentication required');
    }

    const role = authRecord.get('role');
    if (role !== 'doctor' && role !== 'admin') {
        throw new ForbiddenError('Only doctors and admins can toggle OT day status');
    }

    const otDayId = e.request.pathValue('id');
    const data = e.requestInfo().body;

    if (data.disabled === undefined) {
        throw new BadRequestError('Missing required field: disabled');
    }

    if (data.disabled === true && (!data.remarks || data.remarks.trim() === '')) {
        throw new BadRequestError('Remarks are required when disabling an OT day');
    }

    try {
        const record = $app.findRecordById('otDays', otDayId);

        record.set('disabled', data.disabled);
        record.set('remarks', data.remarks || '');
        record.set('updater', authRecord.id);

        $app.save(record);

        console.log(`[ot-days/toggle-status] ${data.disabled ? 'Disabled' : 'Enabled'} OT day: ${otDayId}`);

        return e.json(200, {
            success: true,
            otDay: record,
            action: data.disabled ? 'disabled' : 'enabled'
        });

    } catch (error) {
        console.error('[ot-days/toggle-status] Error:', error);
        throw new BadRequestError(`Failed to toggle OT day status: ${error.message}`);
    }
}, $apis.requireAuth());
