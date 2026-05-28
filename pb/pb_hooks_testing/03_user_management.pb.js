/// <reference path="../pb_data/types.d.ts" />

const VALID_ROLES = ['doctor', 'receptionist', 'admin'];

// POST /api/users/create-with-role-validation
// Create a new user with server-side role validation (admin only)
routerAdd('POST', '/api/users/create-with-role-validation', (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError('Authentication required');
    }

    const callerRole = authRecord.get('role');
    if (callerRole !== 'admin') {
        throw new ForbiddenError('Only admins can create users');
    }

    const data = e.requestInfo().body;

    if (!data.email || !data.password || !data.passwordConfirm) {
        throw new BadRequestError('Missing required fields: email, password, passwordConfirm');
    }

    if (!data.role || !VALID_ROLES.includes(data.role)) {
        throw new BadRequestError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    if (data.password !== data.passwordConfirm) {
        throw new BadRequestError('password and passwordConfirm do not match');
    }

    try {
        const collection = $app.findCollectionByNameOrId('users');
        const record = new Record(collection);

        record.set('email', data.email);
        record.set('password', data.password);
        record.set('passwordConfirm', data.passwordConfirm);
        record.set('role', data.role);

        if (data.name) record.set('name', data.name);
        if (data.username) record.set('username', data.username);

        $app.save(record);

        console.log(`[create-user] Created user: ${record.id} with role: ${data.role}`);

        return e.json(200, {
            success: true,
            user: {
                id: record.id,
                email: record.get('email'),
                role: record.get('role'),
                name: record.get('name'),
                username: record.get('username')
            }
        });

    } catch (error) {
        console.error('[create-user] Error:', error);
        throw new BadRequestError(`Failed to create user: ${error.message}`);
    }
}, $apis.requireAuth());


// PATCH /api/users/:id/update-role
// Update a user's role (admin only)
routerAdd('PATCH', '/api/users/:id/update-role', (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError('Authentication required');
    }

    const callerRole = authRecord.get('role');
    if (callerRole !== 'admin') {
        throw new ForbiddenError('Only admins can change user roles');
    }

    const userId = e.request.pathValue('id');
    const data = e.requestInfo().body;

    if (!data.role || !VALID_ROLES.includes(data.role)) {
        throw new BadRequestError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
    }

    try {
        const record = $app.findRecordById('users', userId);
        const previousRole = record.get('role');

        record.set('role', data.role);
        $app.save(record);

        console.log(`[update-role] Updated user ${userId} role: ${previousRole} → ${data.role}`);

        return e.json(200, {
            success: true,
            user: {
                id: record.id,
                email: record.get('email'),
                role: record.get('role'),
                name: record.get('name')
            },
            previousRole: previousRole
        });

    } catch (error) {
        console.error('[update-role] Error:', error);
        throw new BadRequestError(`Failed to update user role: ${error.message}`);
    }
}, $apis.requireAuth());
