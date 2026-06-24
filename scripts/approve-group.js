#!/usr/bin/env node
const path = require('path');
const { getDb, DB_PATH } = require('../db/database');
const groups = require('../db/groups');

const trackerId = String(process.argv[2] || '').trim().toUpperCase();
const notes = process.argv[3] || 'manual approve';
const adminUrl = (process.env.ROX_ADMIN_URL || process.env.RAILWAY_PUBLIC_DOMAIN || '').replace(/\/$/, '');
const adminSecret = process.env.ADMIN_SECRET;

if (!trackerId) {
    console.error('Usage: npm run approve -- TRK-XXXXXXXX "optional note"');
    console.error('');
    console.error('Production (hits live server):');
    console.error('  set ROX_ADMIN_URL=https://your-app.up.railway.app');
    console.error('  set ADMIN_SECRET=your-secret');
    console.error('  npm run approve -- TRK-XXXXXXXX');
    process.exit(1);
}

if (adminUrl && adminSecret) {
    approveRemote(adminUrl, adminSecret, trackerId, notes);
} else {
    warnIfLocalRailwayCli();
    getDb();
    groups.approveGroup(trackerId, notes);
    console.log(`Approved: ${trackerId}`);
    console.log(`Database: ${DB_PATH}`);
}

async function approveRemote(baseUrl, secret, id, note) {
    const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
    const res = await fetch(`${url}/api/admin/approve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${secret}`
        },
        body: JSON.stringify({ trackerId: id, notes: note })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        console.error('Remote approve failed:', data.error || res.statusText);
        process.exit(1);
    }
    console.log(`Approved on ${url}: ${data.trackerId}`);
}

function warnIfLocalRailwayCli() {
    if (!process.env.RAILWAY_PROJECT_ID) return;
    const onServer = DB_PATH.startsWith('/app/') || DB_PATH.includes(`${path.sep}app${path.sep}data`);
    if (!onServer) {
        console.warn('');
        console.warn('⚠️  This updated your LOCAL database only (not production).');
        console.warn('   Option A — auto-approve on Railway: AUTO_APPROVE_GROUPS=true');
        console.warn('   Option B — remote approve:');
        console.warn('     set ROX_ADMIN_URL=https://YOUR-APP.up.railway.app');
        console.warn('     set ADMIN_SECRET=your-secret');
        console.warn('     npm run approve -- TRK-XXXXXX');
        console.warn('   Option C — SSH into container: railway ssh');
        console.warn('');
    }
}
