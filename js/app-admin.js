const OPS_TOKEN_KEY = 'rox_ops_token';

function getToken() {
    return sessionStorage.getItem(OPS_TOKEN_KEY) || '';
}

function setToken(token) {
    if (token) sessionStorage.setItem(OPS_TOKEN_KEY, token);
    else sessionStorage.removeItem(OPS_TOKEN_KEY);
}

async function adminFetch(path, options = {}) {
    const token = getToken();
    const headers = {
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`
    };
    if (options.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
        setToken('');
        throw new Error('Session expired — sign in again.');
    }
    if (!res.ok) {
        throw new Error(data.error || res.statusText || 'Request failed');
    }
    return data;
}

function formatStatus(group) {
    return group.sharing_active ? 'LIVE' : 'idle';
}

function statusClass(group) {
    return group.sharing_active ? 'ops-status-live' : 'ops-status-idle';
}

function renderGroupsTable(groups) {
    const tbody = document.getElementById('ops-groups-body');
    const emptyEl = document.getElementById('ops-groups-empty');
    if (!tbody) return;

    if (!groups.length) {
        tbody.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
        return;
    }

    if (emptyEl) emptyEl.hidden = true;
    tbody.innerHTML = groups.map((group) => `
        <tr>
            <td><code class="ops-tracker-id">${group.tracker_id}</code></td>
            <td><span class="ops-status-chip ${statusClass(group)}">${formatStatus(group)}</span></td>
            <td>${group.title || '—'}</td>
            <td>${group.host_nickname || '—'}</td>
            <td class="ops-notes-cell">${group.notes || '—'}</td>
            <td class="ops-date-cell">${group.approved_at || '—'}</td>
            <td>
                <button type="button" class="ops-btn ops-btn-danger" data-revoke="${group.tracker_id}">Revoke</button>
            </td>
        </tr>
    `).join('');

    tbody.querySelectorAll('[data-revoke]').forEach((btn) => {
        btn.addEventListener('click', () => revokeGroup(btn.dataset.revoke));
    });
}

async function loadServerStatus() {
    const statusEl = document.getElementById('ops-server-status');
    try {
        const data = await fetch('/api/admin/status').then((r) => r.json());
        if (!statusEl) return;
        if (!data.configured) {
            statusEl.textContent = 'ADMIN_SECRET is not set on the server — console login will not work until you configure it.';
            statusEl.className = 'ops-banner ops-banner-warn';
            return;
        }
        statusEl.textContent = data.autoApprove
            ? 'AUTO_APPROVE_GROUPS is ON — new tracker IDs are allowlisted automatically.'
            : 'Manual allowlist mode — hosts need approval before they can share.';
        statusEl.className = data.autoApprove ? 'ops-banner ops-banner-info' : 'ops-banner';
    } catch {
        if (statusEl) {
            statusEl.textContent = 'Could not reach server status.';
            statusEl.className = 'ops-banner ops-banner-warn';
        }
    }
}

async function refreshGroups() {
    const data = await adminFetch('/api/admin/groups');
    renderGroupsTable(data.groups || []);
    const countEl = document.getElementById('ops-group-count');
    if (countEl) countEl.textContent = `${(data.groups || []).length} groups`;
}

function showPanel(panel) {
    document.getElementById('ops-login-panel')?.classList.toggle('active', panel === 'login');
    document.getElementById('ops-console-panel')?.classList.toggle('active', panel === 'console');
}

function setMessage(elId, text, type = '') {
    const el = document.getElementById(elId);
    if (!el) return;
    el.textContent = text || '';
    el.className = type ? `ops-message ops-message-${type}` : 'ops-message';
    el.hidden = !text;
}

async function handleLogin(event) {
    event.preventDefault();
    const input = document.getElementById('ops-passphrase');
    const passphrase = input?.value?.trim();
    if (!passphrase) return;

    setMessage('ops-login-message', '');
    setToken(passphrase);

    try {
        await refreshGroups();
        showPanel('console');
        input.value = '';
    } catch (err) {
        setToken('');
        setMessage('ops-login-message', err.message || 'Invalid passphrase.', 'error');
    }
}

async function handleApprove(event) {
    event.preventDefault();
    const idInput = document.getElementById('ops-approve-id');
    const notesInput = document.getElementById('ops-approve-notes');
    const trackerId = idInput?.value?.trim().toUpperCase();
    const notes = notesInput?.value?.trim();

    if (!trackerId) {
        setMessage('ops-console-message', 'Enter a tracker ID.', 'error');
        return;
    }

    setMessage('ops-console-message', '');
    try {
        await adminFetch('/api/admin/approve', {
            method: 'POST',
            body: JSON.stringify({ trackerId, notes })
        });
        if (idInput) idInput.value = '';
        if (notesInput) notesInput.value = '';
        setMessage('ops-console-message', `Approved ${trackerId}.`, 'ok');
        await refreshGroups();
    } catch (err) {
        setMessage('ops-console-message', err.message || 'Approve failed.', 'error');
    }
}

async function revokeGroup(trackerId) {
    const label = trackerId;
    if (!confirm(`Revoke ${label}? This removes allowlist access and deletes shared data for that group.`)) {
        return;
    }

    setMessage('ops-console-message', '');
    try {
        await adminFetch(`/api/admin/groups/${encodeURIComponent(trackerId)}`, { method: 'DELETE' });
        setMessage('ops-console-message', `Revoked ${label}.`, 'ok');
        await refreshGroups();
    } catch (err) {
        setMessage('ops-console-message', err.message || 'Revoke failed.', 'error');
    }
}

function handleLogout() {
    setToken('');
    showPanel('login');
    setMessage('ops-console-message', '');
    document.getElementById('ops-groups-body').innerHTML = '';
    document.getElementById('ops-groups-empty').hidden = false;
}

async function initOpsConsole() {
    await loadServerStatus();
    showPanel('login');

    document.getElementById('ops-login-form')?.addEventListener('submit', handleLogin);
    document.getElementById('ops-approve-form')?.addEventListener('submit', handleApprove);
    document.getElementById('ops-refresh-btn')?.addEventListener('click', () => {
        refreshGroups().catch((err) => setMessage('ops-console-message', err.message, 'error'));
    });
    document.getElementById('ops-logout-btn')?.addEventListener('click', handleLogout);

    const token = getToken();
    if (!token) return;

    try {
        await refreshGroups();
        showPanel('console');
    } catch {
        setToken('');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOpsConsole);
} else {
    initOpsConsole();
}
