const { getDb, withTransaction } = require('./database');

const RESERVED_NICKNAMES = new Set(['HOST', 'ADMIN', 'SYSTEM']);

function normalizeNickname(raw) {
    return String(raw || '').trim();
}

function isValidNickname(nickname) {
    if (!nickname || nickname.length < 2 || nickname.length > 20) return false;
    if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) return false;
    if (RESERVED_NICKNAMES.has(nickname.toUpperCase())) return false;
    return true;
}

function nicknameKey(nickname) {
    return normalizeNickname(nickname).toUpperCase();
}

function getApprovedGroup(trackerId) {
    return getDb().prepare('SELECT * FROM approved_groups WHERE tracker_id = ?').get(trackerId);
}

function approveGroup(trackerId, notes = '') {
    getDb().prepare(`
        INSERT INTO approved_groups (tracker_id, notes)
        VALUES (?, ?)
        ON CONFLICT(tracker_id) DO NOTHING
    `).run(trackerId, notes || '');
}

function revokeGroup(trackerId) {
    return getDb().prepare('DELETE FROM approved_groups WHERE tracker_id = ?').run(trackerId).changes > 0;
}

function isAllowlisted(trackerId) {
    return Boolean(getApprovedGroup(trackerId));
}

function getTimersForGroup(trackerId) {
    const rows = getDb()
        .prepare('SELECT * FROM timers WHERE tracker_id = ? ORDER BY end_time ASC')
        .all(trackerId);

    return rows.map(rowToTimer);
}

function rowToTimer(row) {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        endTime: row.end_time,
        totalDuration: row.total_duration,
        addedBy: row.added_by
    };
}

function getMembersForGroup(trackerId) {
    return getDb()
        .prepare('SELECT nickname, is_host, socket_id FROM members WHERE tracker_id = ? ORDER BY joined_at ASC')
        .all(trackerId)
        .map((row) => ({
            nickname: row.nickname,
            isHost: row.is_host === 1,
            socketId: row.socket_id
        }));
}

function getMembersForGroupWithPermissions(trackerId) {
    return getMembersForGroup(trackerId).map((member) => ({
        nickname: member.nickname,
        isHost: member.isHost,
        permissions: member.isHost ? null : getPermissionsForMember(trackerId, member.nickname)
    }));
}

function getGuestMember(trackerId, nickname) {
    return getDb()
        .prepare('SELECT nickname, is_host, socket_id FROM members WHERE tracker_id = ? AND nickname = ? AND is_host = 0')
        .get(trackerId, nicknameKey(nickname));
}

function removeGuestMember(trackerId, nickname) {
    const key = nicknameKey(nickname);
    getDb().prepare('DELETE FROM members WHERE tracker_id = ? AND nickname = ? AND is_host = 0').run(trackerId, key);
    getDb().prepare('DELETE FROM member_permissions WHERE tracker_id = ? AND nickname = ?').run(trackerId, key);
}

function getPermissionsForMember(trackerId, nickname) {
    const group = getApprovedGroup(trackerId);
    if (!group) return null;

    const row = getDb()
        .prepare('SELECT * FROM member_permissions WHERE tracker_id = ? AND nickname = ?')
        .get(trackerId, nicknameKey(nickname));

    if (row) {
        return {
            canCreate: row.can_create === 1,
            canUpdate: row.can_update === 1,
            canDelete: row.can_delete === 1
        };
    }

    return {
        canCreate: group.default_can_create === 1,
        canUpdate: group.default_can_update === 1,
        canDelete: group.default_can_delete === 1
    };
}

function replaceTimers(trackerId, timers, addedBy, database = getDb()) {
    database.prepare('DELETE FROM timers WHERE tracker_id = ?').run(trackerId);
    const insert = database.prepare(`
        INSERT INTO timers (id, tracker_id, name, type, end_time, total_duration, added_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const timer of timers) {
        insert.run(
            timer.id,
            trackerId,
            timer.name,
            timer.type || 'NONE',
            timer.endTime,
            timer.totalDuration,
            timer.addedBy || addedBy
        );
    }
}

function upsertMember(trackerId, nickname, socketId, isHost) {
    const key = nicknameKey(nickname);
    getDb().prepare(`
        INSERT INTO members (tracker_id, nickname, socket_id, is_host)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(tracker_id, nickname) DO UPDATE SET
            socket_id = excluded.socket_id,
            is_host = excluded.is_host
    `).run(trackerId, key, socketId, isHost ? 1 : 0);
}

function clearMemberSocket(socketId) {
    getDb().prepare('UPDATE members SET socket_id = NULL WHERE socket_id = ?').run(socketId);
}

function upsertMemberPermissions(trackerId, nickname, permissions) {
    getDb().prepare(`
        INSERT INTO member_permissions (tracker_id, nickname, can_create, can_update, can_delete, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT(tracker_id, nickname) DO UPDATE SET
            can_create = excluded.can_create,
            can_update = excluded.can_update,
            can_delete = excluded.can_delete,
            updated_at = datetime('now')
    `).run(
        trackerId,
        nicknameKey(nickname),
        permissions.canCreate ? 1 : 0,
        permissions.canUpdate ? 1 : 0,
        permissions.canDelete ? 1 : 0
    );
}

function startSharing({
    trackerId,
    hostNickname,
    title,
    timers,
    memberPermissions,
    defaultPermissions
}) {
    const group = getApprovedGroup(trackerId);
    if (!group) {
        return { ok: false, code: 'NOT_ALLOWLISTED', message: 'Contact admin to activate this tracker ID.' };
    }

    if (group.sharing_active === 1) {
        const sameHost = group.host_nickname && nicknameKey(group.host_nickname) === nicknameKey(hostNickname);
        if (!sameHost) {
            return { ok: false, code: 'ALREADY_SHARING', message: 'Another host is already sharing this ID.' };
        }
    }

    const hostKey = nicknameKey(hostNickname);

    withTransaction((database) => {
        database.prepare(`
            UPDATE approved_groups
            SET sharing_active = 1,
                started_at = COALESCE(started_at, datetime('now')),
                stopped_at = NULL,
                title = ?,
                host_nickname = ?,
                default_can_create = ?,
                default_can_update = ?,
                default_can_delete = ?
            WHERE tracker_id = ?
        `).run(
            title,
            hostKey,
            defaultPermissions?.canCreate ? 1 : 0,
            defaultPermissions?.canUpdate ? 1 : 0,
            defaultPermissions?.canDelete ? 1 : 0,
            trackerId
        );

        replaceTimers(trackerId, timers, hostKey, database);

        if (Array.isArray(memberPermissions)) {
            for (const entry of memberPermissions) {
                if (!entry?.nickname) continue;
                const perms = {
                    canCreate: entry.canCreate !== false,
                    canUpdate: Boolean(entry.canUpdate),
                    canDelete: Boolean(entry.canDelete)
                };
                database.prepare(`
                    INSERT INTO member_permissions (tracker_id, nickname, can_create, can_update, can_delete, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                    ON CONFLICT(tracker_id, nickname) DO UPDATE SET
                        can_create = excluded.can_create,
                        can_update = excluded.can_update,
                        can_delete = excluded.can_delete,
                        updated_at = datetime('now')
                `).run(
                    trackerId,
                    nicknameKey(entry.nickname),
                    perms.canCreate ? 1 : 0,
                    perms.canUpdate ? 1 : 0,
                    perms.canDelete ? 1 : 0
                );
            }
        }
    });

    return { ok: true };
}

function stopSharing(trackerId) {
    getDb().prepare(`
        UPDATE approved_groups
        SET sharing_active = 0, stopped_at = datetime('now')
        WHERE tracker_id = ?
    `).run(trackerId);

    getDb().prepare('UPDATE members SET socket_id = NULL WHERE tracker_id = ?').run(trackerId);
}

function updateGroupTitle(trackerId, title) {
    getDb().prepare('UPDATE approved_groups SET title = ? WHERE tracker_id = ?').run(title, trackerId);
}

function setDefaultPermissions(trackerId, permissions) {
    getDb().prepare(`
        UPDATE approved_groups
        SET default_can_create = ?,
            default_can_update = ?,
            default_can_delete = ?
        WHERE tracker_id = ?
    `).run(
        permissions.canCreate ? 1 : 0,
        permissions.canUpdate ? 1 : 0,
        permissions.canDelete ? 1 : 0,
        trackerId
    );
}

function insertTimer(trackerId, timer, addedBy) {
    getDb().prepare(`
        INSERT INTO timers (id, tracker_id, name, type, end_time, total_duration, added_by)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
        timer.id,
        trackerId,
        timer.name,
        timer.type || 'NONE',
        timer.endTime,
        timer.totalDuration,
        addedBy
    );
}

function updateTimer(trackerId, timer, updatedBy) {
    const result = getDb().prepare(`
        UPDATE timers
        SET name = ?, type = ?, end_time = ?, total_duration = ?, added_by = ?, updated_at = datetime('now')
        WHERE tracker_id = ? AND id = ?
    `).run(
        timer.name,
        timer.type || 'NONE',
        timer.endTime,
        timer.totalDuration,
        updatedBy,
        trackerId,
        timer.id
    );

    return result.changes > 0;
}

function deleteTimer(trackerId, timerId) {
    const result = getDb()
        .prepare('DELETE FROM timers WHERE tracker_id = ? AND id = ?')
        .run(trackerId, timerId);
    return result.changes > 0;
}

function memberExists(trackerId, nickname) {
    return Boolean(
        getDb()
            .prepare('SELECT 1 FROM members WHERE tracker_id = ? AND nickname = ?')
            .get(trackerId, nicknameKey(nickname))
    );
}

function isNicknameTakenByOtherSocket(trackerId, nickname, socketId) {
    const row = getDb()
        .prepare('SELECT socket_id FROM members WHERE tracker_id = ? AND nickname = ?')
        .get(trackerId, nicknameKey(nickname));

    return Boolean(row?.socket_id && row.socket_id !== socketId);
}

module.exports = {
    normalizeNickname,
    isValidNickname,
    nicknameKey,
    getApprovedGroup,
    approveGroup,
    revokeGroup,
    isAllowlisted,
    getTimersForGroup,
    getMembersForGroup,
    getMembersForGroupWithPermissions,
    getGuestMember,
    removeGuestMember,
    getPermissionsForMember,
    startSharing,
    stopSharing,
    updateGroupTitle,
    setDefaultPermissions,
    upsertMemberPermissions,
    upsertMember,
    clearMemberSocket,
    insertTimer,
    updateTimer,
    deleteTimer,
    memberExists,
    isNicknameTakenByOtherSocket,
    rowToTimer
};
