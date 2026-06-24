#!/usr/bin/env node
const path = require('path');
const { getDb, DB_PATH } = require('../db/database');

const adminUrl = (process.env.ROX_ADMIN_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '').replace(/\/$/, '');
const adminSecret = process.env.ADMIN_SECRET;

if (adminUrl && adminSecret) {
    listRemote(adminUrl, adminSecret);
} else {
    warnIfLocalRailwayCli();
    getDb();
    printLocalGroups();
}

async function listRemote(baseUrl, secret) {
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const res = await fetch(`${url}/api/admin/groups`, {
        headers: { Authorization: `Bearer ${secret}` }
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error('Remote list failed:', data.error || res.statusText);
        process.exit(1);
    }
    const rows = data.groups || [];
    if (!rows.length) {
        console.log(`No approved groups on ${url}`);
        return;
    }
    console.log(`Approved groups on ${url} (${rows.length}):\n`);
    for (const row of rows) {
        const live = row.sharing_active ? 'LIVE' : 'idle';
        console.log(`${row.tracker_id}  [${live}]  ${row.title || '—'}`);
        console.log(`  approved: ${row.approved_at}  host: ${row.host_nickname || '—'}`);
        if (row.notes) console.log(`  notes: ${row.notes}`);
        console.log('');
    }
}

function printLocalGroups() {
    const rows = getDb()
        .prepare(`
            SELECT tracker_id, approved_at, sharing_active, title, host_nickname, notes
            FROM approved_groups
            ORDER BY approved_at DESC
        `)
        .all();

    if (!rows.length) {
        console.log('No approved groups yet.');
        return;
    }

    console.log(`Approved groups (${rows.length}) — ${DB_PATH}:\n`);
    for (const row of rows) {
        const live = row.sharing_active ? 'LIVE' : 'idle';
        console.log(`${row.tracker_id}  [${live}]  ${row.title || '—'}`);
        console.log(`  approved: ${row.approved_at}  host: ${row.host_nickname || '—'}`);
        if (row.notes) console.log(`  notes: ${row.notes}`);
        console.log('');
    }
}

function warnIfLocalRailwayCli() {
    if (!process.env.RAILWAY_PROJECT_ID) return;
    const onServer = DB_PATH.startsWith('/app/') || DB_PATH.includes(`${path.sep}app${path.sep}data`);
    if (!onServer) {
        console.warn('');
        console.warn('⚠️  Listing LOCAL database only. For production, set ROX_ADMIN_URL + ADMIN_SECRET.');
        console.warn('');
    }
}
