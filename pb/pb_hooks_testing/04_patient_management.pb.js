/// <reference path="../pb_data/types.d.ts" />

// Simple Levenshtein distance for fuzzy name matching
function levenshtein(a, b) {
    const m = a.length;
    const n = b.length;
    const dp = [];

    for (let i = 0; i <= m; i++) {
        dp[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
        dp[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (a[i - 1] === b[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    return dp[m][n];
}

function nameSimilarity(a, b) {
    if (!a || !b) return 0;
    const lower_a = a.toLowerCase().trim();
    const lower_b = b.toLowerCase().trim();
    if (lower_a === lower_b) return 1.0;
    const maxLen = Math.max(lower_a.length, lower_b.length);
    if (maxLen === 0) return 1.0;
    const dist = levenshtein(lower_a, lower_b);
    return 1.0 - dist / maxLen;
}

// GET /api/patients/search?q=query&limit=50&page=1
// Multi-field patient search
routerAdd('GET', '/api/patients/search', (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError('Authentication required');
    }

    const query = e.requestInfo().query['q'] || '';
    const limit = parseInt(e.requestInfo().query['limit'] || '50', 10);
    const page = parseInt(e.requestInfo().query['page'] || '1', 10);

    if (!query || query.trim() === '') {
        throw new BadRequestError('Missing required query parameter: q');
    }

    const offset = (page - 1) * limit;

    try {
        const sanitized = query.replace(/'/g, "''");

        const filter = `nid ~ '${sanitized}' || hospitalId ~ '${sanitized}' || name ~ '${sanitized}' || phone ~ '${sanitized}'`;

        const records = $app.findRecordsByFilter(
            'patients',
            filter,
            '-created',
            limit,
            offset
        );

        console.log(`[patients/search] Query="${query}" found ${records.length} records (page ${page})`);

        return e.json(200, {
            success: true,
            query: query,
            page: page,
            limit: limit,
            items: records,
            totalItems: records.length
        });

    } catch (error) {
        console.error('[patients/search] Error:', error);
        throw new BadRequestError(`Failed to search patients: ${error.message}`);
    }
}, $apis.requireAuth());


// POST /api/patients/check-duplicates
// Check for potential duplicate patients using fuzzy matching
routerAdd('POST', '/api/patients/check-duplicates', (e) => {
    const authRecord = e.auth;
    if (!authRecord) {
        throw new UnauthorizedError('Authentication required');
    }

    const data = e.requestInfo().body;

    if (!data.name && !data.nid && !data.hospitalId && !data.phone) {
        throw new BadRequestError('At least one field required: name, nid, hospitalId, or phone');
    }

    try {
        const matches = [];

        // Exact match checks for unique identifiers
        if (data.nid && data.nid.trim() !== '') {
            const byNid = $app.findRecordsByFilter(
                'patients',
                `nid = '${data.nid.replace(/'/g, "''")}'`,
                '-created',
                10,
                0
            );
            byNid.forEach(r => {
                matches.push({ id: r.id, record: r, matchField: 'nid', score: 1.0, reason: 'Exact NID match' });
            });
        }

        if (data.hospitalId && data.hospitalId.trim() !== '') {
            const byHospitalId = $app.findRecordsByFilter(
                'patients',
                `hospitalId = '${data.hospitalId.replace(/'/g, "''")}'`,
                '-created',
                10,
                0
            );
            byHospitalId.forEach(r => {
                if (!matches.some(m => m.id === r.id)) {
                    matches.push({ id: r.id, record: r, matchField: 'hospitalId', score: 1.0, reason: 'Exact Hospital ID match' });
                }
            });
        }

        if (data.phone && data.phone.trim() !== '') {
            const byPhone = $app.findRecordsByFilter(
                'patients',
                `phone = '${data.phone.replace(/'/g, "''")}'`,
                '-created',
                10,
                0
            );
            byPhone.forEach(r => {
                if (!matches.some(m => m.id === r.id)) {
                    matches.push({ id: r.id, record: r, matchField: 'phone', score: 1.0, reason: 'Exact phone match' });
                }
            });
        }

        // Fuzzy name matching
        if (data.name && data.name.trim() !== '') {
            const nameParts = data.name.trim().split(' ');
            const firstPart = nameParts[0];

            const candidates = $app.findRecordsByFilter(
                'patients',
                `name ~ '${firstPart.replace(/'/g, "''")}'`,
                '-created',
                50,
                0
            );

            candidates.forEach(r => {
                if (matches.some(m => m.id === r.id)) return;

                const similarity = nameSimilarity(data.name, r.get('name'));
                if (similarity >= 0.75) {
                    matches.push({
                        id: r.id,
                        record: r,
                        matchField: 'name',
                        score: similarity,
                        reason: `Name similarity: ${(similarity * 100).toFixed(0)}%`
                    });
                }
            });
        }

        // Sort by score descending
        matches.sort((a, b) => b.score - a.score);

        console.log(`[patients/check-duplicates] Found ${matches.length} potential duplicates`);

        return e.json(200, {
            success: true,
            hasDuplicates: matches.length > 0,
            matchCount: matches.length,
            matches: matches.slice(0, 10)
        });

    } catch (error) {
        console.error('[patients/check-duplicates] Error:', error);
        throw new BadRequestError(`Failed to check duplicates: ${error.message}`);
    }
}, $apis.requireAuth());
