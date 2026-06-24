const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { getDb } = require('./db/database');
const groups = require('./db/groups');

getDb();

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname)));

app.use(express.json());

function requireAdmin(req, res, next) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) {
        return res.status(503).json({ ok: false, error: 'ADMIN_SECRET not configured on server' });
    }
    const auth = req.get('Authorization') || '';
    if (auth !== `Bearer ${secret}`) {
        return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    next();
}

app.get('/api/admin/groups', requireAdmin, (_req, res) => {
    const rows = getDb()
        .prepare(`
            SELECT tracker_id, approved_at, sharing_active, title, host_nickname, notes
            FROM approved_groups
            ORDER BY approved_at DESC
        `)
        .all();
    res.json({ ok: true, groups: rows });
});

app.post('/api/admin/approve', requireAdmin, (req, res) => {
    const trackerId = String(req.body?.trackerId || '').trim().toUpperCase();
    if (!/^TRK-[A-Z0-9]+$/i.test(trackerId)) {
        return res.status(400).json({ ok: false, error: 'Invalid tracker ID' });
    }
    groups.approveGroup(trackerId, req.body?.notes || 'admin console');
    res.json({ ok: true, trackerId });
});

app.delete('/api/admin/groups/:trackerId', requireAdmin, (req, res) => {
    const trackerId = String(req.params.trackerId || '').trim().toUpperCase();
    if (!/^TRK-[A-Z0-9]+$/i.test(trackerId)) {
        return res.status(400).json({ ok: false, error: 'Invalid tracker ID' });
    }
    const removed = groups.revokeGroup(trackerId);
    if (!removed) {
        return res.status(404).json({ ok: false, error: 'Tracker ID not found' });
    }
    res.json({ ok: true, trackerId });
});

app.get('/api/admin/status', (_req, res) => {
    res.json({
        ok: true,
        configured: Boolean(process.env.ADMIN_SECRET),
        autoApprove: AUTO_APPROVE_GROUPS
    });
});

app.get('/api/public-config', (_req, res) => {
    const plausibleDomain = process.env.PLAUSIBLE_DOMAIN?.trim();
    const umamiWebsiteId = process.env.UMAMI_WEBSITE_ID?.trim();

    let analytics = null;
    if (plausibleDomain) {
        analytics = {
            provider: 'plausible',
            domain: plausibleDomain,
            scriptUrl: process.env.PLAUSIBLE_SCRIPT_URL?.trim() || 'https://plausible.io/js/script.js'
        };
    } else if (umamiWebsiteId) {
        analytics = {
            provider: 'umami',
            websiteId: umamiWebsiteId,
            scriptUrl: process.env.UMAMI_SCRIPT_URL?.trim() || 'https://cloud.umami.is/script.js'
        };
    }

    res.json({ analytics });
});

app.get('/health', (_req, res) => {
    res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
const AUTO_APPROVE_GROUPS = process.env.AUTO_APPROVE_GROUPS === 'true';

/** @type {Map<string, Map<string, string>>} trackerId -> nickname -> socketId */
const pendingJoins = new Map();

function emitError(socket, code, message) {
    socket.emit('error', { code, message });
}

function getSocketIdentity(socket) {
    return socket.data.session || null;
}

function requireSession(socket) {
    const session = getSocketIdentity(socket);
    if (!session?.trackerId || !session?.nickname) {
        return null;
    }
    return session;
}

function broadcastTimers(trackerId) {
    io.to(trackerId).emit('timers_updated', {
        trackerId,
        timers: groups.getTimersForGroup(trackerId)
    });
}

function broadcastMembers(trackerId) {
    io.to(trackerId).emit('members_updated', {
        trackerId,
        members: getLiveMembers(trackerId)
    });
}

/** Sync connected socket sessions into members table, then return roster. */
function reconcileGroupMembers(trackerId) {
    for (const [, peer] of io.sockets.sockets) {
        const session = peer.data.session;
        if (!session || session.trackerId !== trackerId || !session.nickname) continue;
        try {
            groups.upsertMember(trackerId, session.nickname, peer.id, Boolean(session.isHost));
        } catch (err) {
            console.warn('reconcileGroupMembers:', err.message);
        }
    }
}

function getLiveMembers(trackerId) {
    reconcileGroupMembers(trackerId);
    return groups.getMembersForGroup(trackerId).map((member) => ({
        nickname: member.nickname,
        isHost: member.isHost,
        connected: Boolean(member.socketId && io.sockets.sockets.has(member.socketId)),
        permissions: member.isHost ? null : groups.getPermissionsForMember(trackerId, member.nickname)
    }));
}

function getPendingNicknames(trackerId) {
    const map = pendingJoins.get(trackerId);
    return map ? Array.from(map.keys()) : [];
}

function setPendingJoin(trackerId, nickname, socketId) {
    const key = groups.nicknameKey(nickname);
    if (!pendingJoins.has(trackerId)) pendingJoins.set(trackerId, new Map());
    pendingJoins.get(trackerId).set(key, socketId);
}

function clearPendingJoin(trackerId, nickname) {
    const key = groups.nicknameKey(nickname);
    pendingJoins.get(trackerId)?.delete(key);
}

function clearAllPendingForTracker(trackerId) {
    pendingJoins.delete(trackerId);
}

function emitToHost(trackerId, event, payload) {
    for (const [, peer] of io.sockets.sockets) {
        const session = peer.data.session;
        if (session?.trackerId === trackerId && session.isHost) {
            peer.emit(event, payload);
        }
    }
}

function broadcastPendingToHost(trackerId) {
    emitToHost(trackerId, 'join_requests_updated', {
        trackerId,
        pending: getPendingNicknames(trackerId)
    });
}

function completeGuestJoin(socket, trackerId, nickname) {
    const key = groups.nicknameKey(nickname);
    const group = groups.getApprovedGroup(trackerId);

    socket.data.pendingJoin = null;
    socket.data.session = {
        trackerId,
        nickname: key,
        isHost: false
    };

    socket.join(trackerId);
    groups.upsertMember(trackerId, nickname, socket.id, false);
    clearPendingJoin(trackerId, nickname);

    const joinPayload = {
        trackerId,
        title: group.title || 'UNNAMED GROUP',
        timers: groups.getTimersForGroup(trackerId),
        permissions: groups.getPermissionsForMember(trackerId, nickname),
        members: getLiveMembers(trackerId)
    };

    socket.emit('join_ok', joinPayload);
    broadcastMembers(trackerId);
    return joinPayload;
}

function findSocketById(socketId) {
    return io.sockets.sockets.get(socketId) || null;
}

function attachHostSession(socket, trackerId, hostNickname) {
    socket.data.session = {
        trackerId,
        nickname: groups.nicknameKey(hostNickname),
        isHost: true
    };
    socket.join(trackerId);
    groups.upsertMember(trackerId, hostNickname, socket.id, true);
}

function canMutateTimer(session, action) {
    if (session.isHost) return true;
    const permissions = groups.getPermissionsForMember(session.trackerId, session.nickname);
    if (!permissions) return false;
    if (action === 'create') return permissions.canCreate;
    if (action === 'update') return permissions.canUpdate;
    if (action === 'delete') return permissions.canDelete;
    return false;
}

io.on('connection', (socket) => {
    socket.on('check_allowlist', ({ trackerId }, ack) => {
        if (!trackerId) {
            const payload = { trackerId: '', allowed: false, sharingActive: false };
            if (typeof ack === 'function') ack(payload);
            socket.emit('check_allowlist_result', payload);
            return;
        }

        const group = groups.getApprovedGroup(trackerId);
        if (!group && AUTO_APPROVE_GROUPS && /^TRK-[A-Z0-9]+$/i.test(trackerId)) {
            try {
                groups.approveGroup(trackerId, 'auto-approved');
            } catch (err) {
                console.warn('auto-approve failed:', err.message);
            }
        }

        const approvedGroup = groups.getApprovedGroup(trackerId);
        const payload = {
            trackerId,
            allowed: Boolean(approvedGroup),
            sharingActive: Boolean(approvedGroup?.sharing_active)
        };

        if (typeof ack === 'function') ack(payload);
        socket.emit('check_allowlist_result', payload);
    });

    socket.on('start_sharing', (payload, ack) => {
        const {
            trackerId,
            hostNickname,
            title,
            timers = [],
            memberPermissions = [],
            defaultPermissions = {}
        } = payload || {};

        if (!trackerId || !groups.isValidNickname(hostNickname)) {
            const err = { code: 'INVALID_PAYLOAD', message: 'Tracker ID and valid host nickname are required.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return emitError(socket, err.code, err.message);
        }

        try {
            const result = groups.startSharing({
                trackerId,
                hostNickname,
                title: title || 'UNNAMED GROUP',
                timers,
                memberPermissions,
                defaultPermissions
            });

            if (!result.ok) {
                if (typeof ack === 'function') ack({ ok: false, code: result.code, message: result.message });
                socket.emit('start_sharing_error', { code: result.code, message: result.message });
                return;
            }

            attachHostSession(socket, trackerId, hostNickname);

            const okPayload = { trackerId, sharingActive: true };
            if (typeof ack === 'function') ack({ ok: true, ...okPayload });
            socket.emit('start_sharing_ok', okPayload);
            broadcastMembers(trackerId);
            broadcastTimers(trackerId);
            broadcastPendingToHost(trackerId);
        } catch (err) {
            console.error('start_sharing error:', err);
            const msg = { code: 'DB_ERROR', message: 'Could not save sharing state. Try again.' };
            if (typeof ack === 'function') ack({ ok: false, ...msg });
            socket.emit('start_sharing_error', msg);
        }
    });

    socket.on('resume_host', ({ trackerId, hostNickname }, ack) => {
        if (!trackerId || !groups.isValidNickname(hostNickname)) {
            const err = { code: 'INVALID_PAYLOAD', message: 'Tracker ID and valid host nickname are required.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return;
        }

        const group = groups.getApprovedGroup(trackerId);
        if (!group || group.sharing_active !== 1) {
            const err = { code: 'NOT_SHARING', message: 'Group is not live. Press Share to start.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('start_sharing_error', err);
        }

        const key = groups.nicknameKey(hostNickname);
        if (group.host_nickname && group.host_nickname !== key) {
            const err = { code: 'FORBIDDEN', message: 'Only the original host can resume this group.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('start_sharing_error', err);
        }

        try {
            attachHostSession(socket, trackerId, hostNickname);
            const members = getLiveMembers(trackerId);
            const okPayload = { trackerId, sharingActive: true, resumed: true };
            if (typeof ack === 'function') ack({ ok: true, ...okPayload });
            socket.emit('start_sharing_ok', okPayload);
            socket.emit('members_updated', { trackerId, members });
            broadcastMembers(trackerId);
            broadcastPendingToHost(trackerId);
        } catch (err) {
            console.error('resume_host error:', err);
            const msg = { code: 'DB_ERROR', message: 'Could not resume host session.' };
            if (typeof ack === 'function') ack({ ok: false, ...msg });
        }
    });

    socket.on('stop_sharing', ({ trackerId }, ack) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can stop sharing.');
        }

        groups.stopSharing(trackerId);
        const pendingMap = pendingJoins.get(trackerId);
        if (pendingMap) {
            for (const [, socketId] of pendingMap) {
                const peer = findSocketById(socketId);
                if (peer) {
                    peer.data.pendingJoin = null;
                    peer.emit('join_denied', { trackerId, message: 'Host stopped sharing.' });
                }
            }
        }
        clearAllPendingForTracker(trackerId);
        io.to(trackerId).emit('sharing_stopped', { trackerId, reason: 'host_stopped' });

        const socketsInRoom = io.sockets.adapter.rooms.get(trackerId);
        if (socketsInRoom) {
            for (const socketId of socketsInRoom) {
                const peer = io.sockets.sockets.get(socketId);
                if (peer && !peer.data.session?.isHost) {
                    peer.leave(trackerId);
                    peer.data.session = null;
                }
            }
        }

        socket.leave(trackerId);
        socket.data.session = null;

        const okPayload = { trackerId };
        if (typeof ack === 'function') ack({ ok: true, ...okPayload });
        socket.emit('stop_sharing_ok', okPayload);
    });

    socket.on('join_group', ({ trackerId, nickname }, ack) => {
        if (!trackerId || !groups.isValidNickname(nickname)) {
            const err = { code: 'INVALID_PAYLOAD', message: 'Tracker ID and valid nickname are required.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('join_error', err);
        }

        const group = groups.getApprovedGroup(trackerId);
        if (!group) {
            const err = { code: 'NOT_ALLOWLISTED', message: 'This tracker ID is not activated yet.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('join_error', err);
        }

        if (group.sharing_active !== 1) {
            const err = { code: 'NOT_SHARING', message: 'Host has not started sharing yet.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('join_error', err);
        }

        const key = groups.nicknameKey(nickname);
        if (group.host_nickname && group.host_nickname === key) {
            const err = { code: 'NICKNAME_TAKEN', message: 'That nickname is reserved for the host.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('join_error', err);
        }

        if (groups.isNicknameTakenByOtherSocket(trackerId, nickname, socket.id)) {
            const err = { code: 'NICKNAME_TAKEN', message: 'That nickname is already in use in this group.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return socket.emit('join_error', err);
        }

        const existingGuest = groups.getGuestMember(trackerId, nickname);
        if (existingGuest) {
            const joinPayload = completeGuestJoin(socket, trackerId, nickname);
            if (typeof ack === 'function') ack({ ok: true, ...joinPayload });
            return;
        }

        setPendingJoin(trackerId, nickname, socket.id);
        socket.data.pendingJoin = { trackerId, nickname: key };

        const pendingPayload = { trackerId, nickname: key };
        emitToHost(trackerId, 'join_request', pendingPayload);
        broadcastPendingToHost(trackerId);

        if (typeof ack === 'function') ack({ ok: true, pending: true, ...pendingPayload });
        socket.emit('join_pending', pendingPayload);
    });

    socket.on('approve_guest', ({ trackerId, nickname }, ack) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can approve guests.');
        }

        const key = groups.nicknameKey(nickname);
        const pendingSocketId = pendingJoins.get(trackerId)?.get(key);
        if (!pendingSocketId) {
            const err = { code: 'NOT_FOUND', message: 'No pending join request for that guest.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return emitError(socket, err.code, err.message);
        }

        const guestSocket = findSocketById(pendingSocketId);
        if (!guestSocket) {
            clearPendingJoin(trackerId, nickname);
            broadcastPendingToHost(trackerId);
            const err = { code: 'GUEST_OFFLINE', message: 'Guest is no longer connected.' };
            if (typeof ack === 'function') ack({ ok: false, ...err });
            return emitError(socket, err.code, err.message);
        }

        completeGuestJoin(guestSocket, trackerId, nickname);
        broadcastPendingToHost(trackerId);

        if (typeof ack === 'function') ack({ ok: true, trackerId, nickname: key });
    });

    socket.on('deny_guest', ({ trackerId, nickname }, ack) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can deny guests.');
        }

        const key = groups.nicknameKey(nickname);
        const pendingSocketId = pendingJoins.get(trackerId)?.get(key);
        clearPendingJoin(trackerId, nickname);

        if (pendingSocketId) {
            const guestSocket = findSocketById(pendingSocketId);
            if (guestSocket) {
                guestSocket.data.pendingJoin = null;
                guestSocket.emit('join_denied', { trackerId, nickname: key, message: 'Host denied your join request.' });
            }
        }

        broadcastPendingToHost(trackerId);
        if (typeof ack === 'function') ack({ ok: true, trackerId, nickname: key });
    });

    socket.on('remove_guest', ({ trackerId, nickname }, ack) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can remove guests.');
        }

        const key = groups.nicknameKey(nickname);
        const guestRow = groups.getGuestMember(trackerId, nickname);

        if (guestRow?.socket_id) {
            const guestSocket = findSocketById(guestRow.socket_id);
            if (guestSocket) {
                guestSocket.emit('guest_removed', { trackerId, nickname: key, message: 'Host removed you from this group.' });
                guestSocket.leave(trackerId);
                guestSocket.data.session = null;
                guestSocket.data.pendingJoin = null;
            }
        }

        clearPendingJoin(trackerId, nickname);
        groups.removeGuestMember(trackerId, nickname);
        broadcastMembers(trackerId);
        broadcastPendingToHost(trackerId);

        if (typeof ack === 'function') ack({ ok: true, trackerId, nickname: key });
    });

    socket.on('leave_group', ({ trackerId, nickname }, ack) => {
        function reply(error, payload) {
            if (typeof ack !== 'function') return;
            if (error) ack({ ok: false, code: error.code, message: error.message });
            else ack({ ok: true, ...payload });
        }

        if (!trackerId) {
            return reply({ code: 'INVALID_PAYLOAD', message: 'Tracker ID is required.' });
        }

        const session = requireSession(socket);
        let guestKey = null;

        if (session?.trackerId === trackerId && !session.isHost) {
            guestKey = session.nickname;
        } else if (groups.isValidNickname(nickname)) {
            guestKey = groups.nicknameKey(nickname);
            const row = groups.getGuestMember(trackerId, guestKey);
            if (!row) {
                return reply(null, { trackerId, nickname: guestKey, alreadyLeft: true });
            }
            if (row.socket_id) {
                const liveSocket = findSocketById(row.socket_id);
                const liveSession = liveSocket?.data?.session;
                if (liveSession?.trackerId === trackerId && liveSession.nickname === guestKey) {
                    liveSocket.leave(trackerId);
                    liveSocket.data.session = null;
                    liveSocket.data.pendingJoin = null;
                }
            }
        } else {
            return reply({ code: 'FORBIDDEN', message: 'Provide a valid nickname to leave this group.' });
        }

        try {
            if (session?.trackerId === trackerId && !session.isHost) {
                socket.leave(trackerId);
                socket.data.session = null;
                socket.data.pendingJoin = null;
            }
            groups.removeGuestMember(trackerId, guestKey);
            reply(null, { trackerId, nickname: guestKey });
            broadcastMembers(trackerId);
        } catch (err) {
            console.error('leave_group error:', err);
            reply({ code: 'DB_ERROR', message: 'Could not leave group.' });
        }
    });

    socket.on('get_pending_joins', ({ trackerId }, ack) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can view pending joins.');
        }
        const payload = { trackerId, pending: getPendingNicknames(trackerId) };
        if (typeof ack === 'function') ack({ ok: true, ...payload });
        socket.emit('join_requests_updated', payload);
    });

    socket.on('update_group_title', ({ trackerId, title }) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can rename the group.');
        }

        const formatted = String(title || '').trim().toUpperCase() || 'UNNAMED GROUP';
        groups.updateGroupTitle(trackerId, formatted);
        io.to(trackerId).emit('group_meta_updated', { trackerId, title: formatted });
    });

    socket.on('get_group_members', ({ trackerId, hostNickname }, ack) => {
        function reply(error, payload) {
            if (typeof ack !== 'function') return;
            if (error) {
                ack({ ok: false, code: error.code, message: error.message });
            } else {
                ack({ ok: true, ...payload });
            }
        }

        try {
            let session = requireSession(socket);

            if ((!session || session.trackerId !== trackerId || !session.isHost) && hostNickname) {
                const group = groups.getApprovedGroup(trackerId);
                const key = groups.nicknameKey(hostNickname);
                if (group?.sharing_active === 1 && group.host_nickname === key) {
                    attachHostSession(socket, trackerId, hostNickname);
                    session = requireSession(socket);
                }
            }

            if (!session || session.trackerId !== trackerId || !session.isHost) {
                return reply({ code: 'FORBIDDEN', message: 'Only the host can view guest permissions.' });
            }

            reply(null, {
                trackerId,
                members: getLiveMembers(trackerId),
                pending: getPendingNicknames(trackerId)
            });
        } catch (err) {
            console.error('get_group_members error:', err);
            reply({ code: 'DB_ERROR', message: 'Could not load guest list.' });
        }
    });

    socket.on('set_member_permissions', ({ trackerId, nickname, canCreate, canUpdate, canDelete }, ack) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can change permissions.');
        }

        const permissions = {
            canCreate: Boolean(canCreate),
            canUpdate: Boolean(canUpdate),
            canDelete: Boolean(canDelete)
        };

        try {
            groups.upsertMemberPermissions(trackerId, nickname, permissions);
        } catch (err) {
            console.error('set_member_permissions error:', err);
            const msg = { code: 'DB_ERROR', message: 'Could not save permissions.' };
            if (typeof ack === 'function') ack({ ok: false, ...msg });
            return emitError(socket, msg.code, msg.message);
        }

        const key = groups.nicknameKey(nickname);
        const payload = { trackerId, nickname: key, ...permissions };
        io.to(trackerId).emit('permissions_updated', payload);

        for (const [, peer] of io.sockets.sockets) {
            const peerSession = peer.data.session;
            if (peerSession?.trackerId === trackerId && peerSession.nickname === key) {
                peer.emit('permissions_updated', payload);
            }
        }
        broadcastMembers(trackerId);

        if (typeof ack === 'function') ack({ ok: true, ...payload });
    });

    socket.on('set_default_permissions', ({ trackerId, canCreate, canUpdate, canDelete }) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId || !session.isHost) {
            return emitError(socket, 'FORBIDDEN', 'Only the host can change default permissions.');
        }

        groups.setDefaultPermissions(trackerId, {
            canCreate: canCreate !== false,
            canUpdate: Boolean(canUpdate),
            canDelete: Boolean(canDelete)
        });
    });

    socket.on('timer_create', ({ trackerId, timer }) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId) {
            return emitError(socket, 'FORBIDDEN', 'Join the group before adding timers.');
        }
        if (!canMutateTimer(session, 'create')) {
            return emitError(socket, 'FORBIDDEN', "You don't have permission to create timers.");
        }
        if (!timer?.id || !timer?.name || !timer?.endTime || !timer?.totalDuration) {
            return emitError(socket, 'INVALID_PAYLOAD', 'Timer payload is incomplete.');
        }

        groups.insertTimer(trackerId, timer, session.nickname);
        broadcastTimers(trackerId);
    });

    socket.on('timer_update', ({ trackerId, timer }) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId) {
            return emitError(socket, 'FORBIDDEN', 'Join the group before updating timers.');
        }
        if (!canMutateTimer(session, 'update')) {
            return emitError(socket, 'FORBIDDEN', "You don't have permission to update timers.");
        }
        if (!timer?.id) {
            return emitError(socket, 'INVALID_PAYLOAD', 'Timer ID is required.');
        }

        const updated = groups.updateTimer(trackerId, timer, session.nickname);
        if (!updated) {
            return emitError(socket, 'NOT_FOUND', 'Timer not found.');
        }
        broadcastTimers(trackerId);
    });

    socket.on('timer_delete', ({ trackerId, timerId }) => {
        const session = requireSession(socket);
        if (!session || session.trackerId !== trackerId) {
            return emitError(socket, 'FORBIDDEN', 'Join the group before deleting timers.');
        }
        if (!canMutateTimer(session, 'delete')) {
            return emitError(socket, 'FORBIDDEN', "You don't have permission to delete timers.");
        }

        const deleted = groups.deleteTimer(trackerId, timerId);
        if (!deleted) {
            return emitError(socket, 'NOT_FOUND', 'Timer not found.');
        }
        broadcastTimers(trackerId);
    });

    socket.on('disconnect', () => {
        const pending = socket.data.pendingJoin;
        if (pending?.trackerId && pending?.nickname) {
            const map = pendingJoins.get(pending.trackerId);
            if (map?.get(pending.nickname) === socket.id) {
                map.delete(pending.nickname);
                broadcastPendingToHost(pending.trackerId);
            }
        }
        try {
            groups.clearMemberSocket(socket.id);
        } catch (err) {
            console.warn('clearMemberSocket on disconnect:', err.message);
        }
        socket.data.session = null;
        socket.data.pendingJoin = null;
    });
});

server.listen(PORT, () => {
    console.log(`RoX server running on port ${PORT}`);
    console.log(`SQLite database: ${path.join(__dirname, 'data', 'trackers.db')}`);
    if (AUTO_APPROVE_GROUPS) {
        console.log('AUTO_APPROVE_GROUPS is ON — new tracker IDs are allowlisted automatically');
    }
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use. Stop the other process or set PORT to a different value.`);
        console.error(`Windows: netstat -ano | findstr :${PORT}  then  taskkill /PID <pid> /F`);
        process.exit(1);
    }
    throw err;
});
