#!/usr/bin/env node
const { getDb } = require('../db/database');
const groups = require('../db/groups');

const trackerId = process.argv[2];
if (!trackerId) {
    console.error('Usage: npm run approve -- TRK-XXXXXXXX');
    process.exit(1);
}

getDb();
groups.approveGroup(trackerId, process.argv[3] || 'manual approve');
console.log(`Approved: ${trackerId}`);
