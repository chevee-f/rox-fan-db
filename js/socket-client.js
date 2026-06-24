/* global io */
const ShareSocket = (() => {
    let socket = null;

    function init(handlers) {
        if (typeof io === 'undefined') {
            console.warn('Socket.IO client not loaded — shared groups unavailable.');
            return;
        }

        if (socket) return;

        socket = io();

        socket.on('connect', () => {
            if (handlers.onConnect) handlers.onConnect();
        });

        socket.on('connect_error', (err) => {
            console.error('Share socket connection failed:', err.message);
            if (handlers.onConnectError) handlers.onConnectError(err);
        });

        socket.on('check_allowlist_result', (payload) => {
            if (handlers.onCheckAllowlistResult) handlers.onCheckAllowlistResult(payload);
        });

        socket.on('start_sharing_ok', (payload) => {
            if (handlers.onStartSharingOk) handlers.onStartSharingOk(payload);
        });

        socket.on('start_sharing_error', (payload) => {
            if (handlers.onStartSharingError) handlers.onStartSharingError(payload);
        });

        socket.on('stop_sharing_ok', (payload) => {
            if (handlers.onStopSharingOk) handlers.onStopSharingOk(payload);
        });

        socket.on('sharing_stopped', (payload) => {
            if (handlers.onSharingStopped) handlers.onSharingStopped(payload);
        });

        socket.on('join_ok', (payload) => {
            if (handlers.onJoinOk) handlers.onJoinOk(payload);
        });

        socket.on('join_pending', (payload) => {
            if (handlers.onJoinPending) handlers.onJoinPending(payload);
        });

        socket.on('join_denied', (payload) => {
            if (handlers.onJoinDenied) handlers.onJoinDenied(payload);
        });

        socket.on('join_error', (payload) => {
            if (handlers.onJoinError) handlers.onJoinError(payload);
        });

        socket.on('join_request', (payload) => {
            if (handlers.onJoinRequest) handlers.onJoinRequest(payload);
        });

        socket.on('join_requests_updated', (payload) => {
            if (handlers.onJoinRequestsUpdated) handlers.onJoinRequestsUpdated(payload);
        });

        socket.on('guest_removed', (payload) => {
            if (handlers.onGuestRemoved) handlers.onGuestRemoved(payload);
        });

        socket.on('group_meta_updated', (payload) => {
            if (handlers.onGroupMetaUpdated) handlers.onGroupMetaUpdated(payload);
        });

        socket.on('timers_updated', (payload) => {
            if (handlers.onTimersUpdated) handlers.onTimersUpdated(payload);
        });

        socket.on('permissions_updated', (payload) => {
            if (handlers.onPermissionsUpdated) handlers.onPermissionsUpdated(payload);
        });

        socket.on('members_updated', (payload) => {
            if (handlers.onMembersUpdated) handlers.onMembersUpdated(payload);
        });

        socket.on('error', (payload) => {
            if (handlers.onError) handlers.onError(payload);
        });
    }

    function emit(event, payload, timeoutMs = 10000) {
        if (!socket?.connected) {
            return Promise.reject(new Error('Not connected to server.'));
        }
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject({ code: 'TIMEOUT', message: `Server did not respond (${event}).` });
            }, timeoutMs);
            socket.emit(event, payload, (response) => {
                clearTimeout(timer);
                if (response?.ok === false) {
                    reject(response);
                } else {
                    resolve(response);
                }
            });
        });
    }

    function emitVoid(event, payload) {
        if (!socket?.connected) return;
        socket.emit(event, payload);
    }

    return {
        init,
        isConnected: () => Boolean(socket?.connected),
        checkAllowlist: (trackerId) => emit('check_allowlist', { trackerId }),
        startSharing: (payload) => emit('start_sharing', payload),
        resumeHost: (trackerId, hostNickname) => emit('resume_host', { trackerId, hostNickname }),
        stopSharing: (trackerId) => emit('stop_sharing', { trackerId }),
        joinGroup: (trackerId, nickname) => emit('join_group', { trackerId, nickname }),
        approveGuest: (trackerId, nickname) => emit('approve_guest', { trackerId, nickname }),
        denyGuest: (trackerId, nickname) => emit('deny_guest', { trackerId, nickname }),
        removeGuest: (trackerId, nickname) => emit('remove_guest', { trackerId, nickname }),
        leaveGroup: (trackerId, nickname) => emit('leave_group', { trackerId, nickname }),
        getPendingJoins: (trackerId) => emit('get_pending_joins', { trackerId }),
        updateGroupTitle: (trackerId, title) => emitVoid('update_group_title', { trackerId, title }),
        setMemberPermissions: (trackerId, nickname, permissions) =>
            emit('set_member_permissions', { trackerId, nickname, ...permissions }),
        getGroupMembers: (trackerId, hostNickname) => emit('get_group_members', { trackerId, hostNickname }),
        setDefaultPermissions: (trackerId, permissions) =>
            emitVoid('set_default_permissions', { trackerId, ...permissions }),
        timerCreate: (trackerId, timer) => emitVoid('timer_create', { trackerId, timer }),
        timerUpdate: (trackerId, timer) => emitVoid('timer_update', { trackerId, timer }),
        timerDelete: (trackerId, timerId) => emitVoid('timer_delete', { trackerId, timerId })
    };
})();
