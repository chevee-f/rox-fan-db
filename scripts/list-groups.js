#!/usr/bin/env node
const { getDb } = require('../db/database');

getDb();

const rows = getDb()
    .prepare(`
        SELECT tracker_id, approved_at, sharing_active, title, host_nickname, notes
        FROM approved_groups
        ORDER BY approved_at DESC
    `)
    .all();

if (!rows.length) {
    console.log('No approved groups yet.');
    process.exit(0);
}

console.log(`Approved groups (${rows.length}):\n`);
for (const row of rows) {
    const live = row.sharing_active ? 'LIVE' : 'idle';
    const title = row.title || '—';
    const host = row.host_nickname || '—';
    const notes = row.notes || '';
    console.log(`${row.tracker_id}  [${live}]  ${title}`);
    console.log(`  approved: ${row.approved_at}  host: ${host}`);
    if (notes) console.log(`  notes: ${notes}`);
    console.log('');
}
