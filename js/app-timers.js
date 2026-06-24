let localTrackers = [];
let dashboardColumns = [];
let calculationEngineInterval = null;

let openAccordions = {};
let openFinishedAccordions = {};
let currentlyDraggingColumnId = null;

let appSettings = {
    theme: 'introboys',
    soundProfile: 'radar',
    masterVolume: 0.8,
    desktopNotifications: false
};

let sharedGroupState = {};
let guestPermissions = {};
let allowlistCache = {};
/** trackerIds where resumeHost succeeded this socket connection */
const hostSessionsReady = new Set();
/** trackerId -> in-flight host resume promise */
const hostResumeInflight = new Map();

function markHostSessionReady(trackerId) {
    if (trackerId) hostSessionsReady.add(trackerId);
}

function clearHostSessionReady(trackerId) {
    if (trackerId) hostSessionsReady.delete(trackerId);
}

function generateTrackerId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'TRK-';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function saveDashboardColumns() {
    localStorage.setItem("ro_dashboard_columns", JSON.stringify(dashboardColumns));
}

function migrateDashboardColumns() {
    let changed = false;
    dashboardColumns.forEach((col) => {
        if (!col.trackerId) {
            col.trackerId = generateTrackerId();
            changed = true;
        }
        if (!col.shareMode) {
            col.shareMode = 'local';
            changed = true;
        }
        if (col.sharingActive && col.shareMode !== 'guest' && col.shareMode !== 'host') {
            col.shareMode = 'host';
            changed = true;
        }
    });
    if (changed) saveDashboardColumns();
}

function getShareNickname() {
    const input = document.getElementById("share-nickname");
    const fromInput = input?.value?.trim();
    if (fromInput) {
        sessionStorage.setItem("share_nickname", fromInput);
        return fromInput;
    }
    return sessionStorage.getItem("share_nickname") || "";
}

function getHostNicknameForColumn(col) {
    const saved = col?.hostNickname?.trim();
    if (saved) return saved;
    return getShareNickname();
}

function resumeHostForColumn(col) {
    if (!col?.trackerId) return Promise.resolve(false);

    const trackerId = col.trackerId;
    if (hostResumeInflight.has(trackerId)) {
        return hostResumeInflight.get(trackerId);
    }

    const nickname = getHostNicknameForColumn(col);
    if (!nickname) return Promise.resolve(false);

    col.shareMode = 'host';

    const promise = ShareSocket.resumeHost(trackerId, nickname)
        .then(() => {
            markHostSessionReady(trackerId);
            saveDashboardColumns();
            return true;
        })
        .catch(() => {
            const timers = getTimersForColumn(col).map((t) => ({
                id: t.id,
                name: t.name,
                type: t.type,
                endTime: t.endTime,
                totalDuration: t.totalDuration
            }));
            return ShareSocket.startSharing({
                trackerId,
                hostNickname: nickname,
                title: col.title,
                timers,
                memberPermissions: [],
                defaultPermissions: { canCreate: false, canUpdate: false, canDelete: false }
            })
                .then(() => {
                    col.shareMode = 'host';
                    markHostSessionReady(trackerId);
                    saveDashboardColumns();
                    return true;
                })
                .catch(() => false);
        })
        .finally(() => {
            hostResumeInflight.delete(trackerId);
        });

    hostResumeInflight.set(trackerId, promise);
    return promise;
}

function getColumnByTrackerId(trackerId) {
    return dashboardColumns.find((c) => c.trackerId === trackerId);
}

function isHostSharingColumn(col) {
    if (!col?.trackerId || col.shareMode === 'guest' || !col.sharingActive) return false;
    return true;
}

function isColumnSharedLive(col) {
    if (!col) return false;
    if (col.disconnected) return false;
    if (col.shareMode === 'guest') return true;
    return col.shareMode === 'host' && col.sharingActive;
}

function isLiveSharedTracker(trackerId) {
    return dashboardColumns.some((c) => c.trackerId === trackerId && isColumnSharedLive(c));
}

function getTimersForColumn(col) {
    if (!col) return [];
    if (col.shareMode === 'guest' || (col.shareMode === 'host' && col.sharingActive)) {
        return localTrackers.filter((t) => t.sharedTrackerId === col.trackerId);
    }
    return localTrackers.filter((t) => t.columnIds && t.columnIds.includes(col.id));
}

function getTrackerIdForTimer(timerId) {
    const timer = localTrackers.find((t) => t.id === timerId);
    if (!timer) return null;
    if (timer.sharedTrackerId) return timer.sharedTrackerId;
    if (timer.columnIds?.length) {
        const col = dashboardColumns.find((c) => timer.columnIds.includes(c.id));
        if (col?.sharingActive && col.trackerId) return col.trackerId;
    }
    return null;
}

function getDisplayTitle(col) {
    const prefix = col.shareMode === 'guest' ? '[SHARED] ' : '';
    const offline = col.disconnected ? ' (offline)' : '';
    return `${prefix}${col.title}${offline}`;
}

function getShareStatusChip(col) {
    if (col.shareMode === 'guest') {
        return col.disconnected
            ? '<span class="share-status-chip share-status-offline">Offline</span>'
            : '<span class="share-status-chip share-status-live">Shared</span>';
    }
    if (col.sharingActive) {
        return '<span class="share-status-chip share-status-live">Live</span>';
    }
    if (allowlistCache[col.trackerId]?.allowed) {
        return '<span class="share-status-chip share-status-allowlisted">Ready</span>';
    }
    return '<span class="share-status-chip share-status-local">Local</span>';
}

function initTimers() {
    const cachedCols = localStorage.getItem("ro_dashboard_columns");
    if (cachedCols) {
        try { dashboardColumns = JSON.parse(cachedCols); } catch(e) { dashboardColumns = []; }
    } else {
        dashboardColumns = [];
        localStorage.setItem("ro_dashboard_columns", JSON.stringify(dashboardColumns));
    }

    const cachedData = localStorage.getItem("ro_active_trackers");
    if (cachedData) {
        try { localTrackers = JSON.parse(cachedData); } catch(e) { localTrackers = []; }
    }

    const cachedSettings = localStorage.getItem("ro_app_settings");
    if (cachedSettings) {
        try { 
            appSettings = JSON.parse(cachedSettings);
            if (document.getElementById("setting-sound-profile")) {
                document.getElementById("setting-sound-profile").value = appSettings.soundProfile;
                document.getElementById("setting-master-volume").value = appSettings.masterVolume * 100;
                document.getElementById("setting-desktop-notif").checked = appSettings.desktopNotifications;
                if (document.getElementById("setting-theme")) {
                    document.getElementById("setting-theme").value = appSettings.theme || 'introboys';
                }
                updateVolumeLabelDisplay(appSettings.masterVolume * 100);
                updateNotificationUIStatus();
            }
            if (typeof setAppTheme === 'function') {
                setAppTheme(appSettings.theme || 'introboys');
            }
        } catch(e) {}
    }

    setupModalKeybinds();
    setupGlobalClickListeners();

    migrateDashboardColumns();
    restoreGuestSessionsFromStorage();

    const savedNick = sessionStorage.getItem("share_nickname");
    const nickInput = document.getElementById("share-nickname");
    if (nickInput && savedNick) nickInput.value = savedNick;

    document.getElementById("join-tracker-id")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submitJoinGroup(); }
    });
    document.getElementById("share-nickname")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); submitJoinGroup(); }
    });

    initShareSocketLayer();

    if (calculationEngineInterval) clearInterval(calculationEngineInterval);
    calculationEngineInterval = setInterval(processTimerTick, 1000);

    renderTimersUI();
}

function toggleColumnAccordion(columnId) {
    openAccordions[columnId] = !openAccordions[columnId];
    renderTimersUI();
}

function toggleFinishedAccordion(columnId) {
    openFinishedAccordions[columnId] = !openFinishedAccordions[columnId];
    renderTimersUI();
}

/* ==========================================================================
   AUTOCOMPLETE ENGINE (MONSTERS.JS COMPATIBLE)
   ========================================================================== */
function handleTargetNameInput(value) {
    const box = document.getElementById("autocomplete-box");
    if (!box) return;

    const query = value.trim().toLowerCase();
    if (!query) { box.style.display = "none"; return; }

    const sourceData = window.monsterDatabase || [];
    const matches = sourceData.filter(m => m.name.toLowerCase().includes(query)).slice(0, 5);

    if (matches.length === 0) { box.style.display = "none"; return; }

    box.innerHTML = matches.map(m => `
        <div class="suggestion-item" onclick="selectMonsterSuggestion('${m.name.replace(/'/g, "\\'")}', '${m.type}')">
            <span>${m.name}</span>
            <span class="ui-text-xs" style="opacity:0.6;">${m.type}</span>
        </div>
    `).join('');
    box.style.display = "block";
}

function selectMonsterSuggestion(name, type) {
    document.getElementById("target-name").value = name;
    const validTypes = ["MVP", "MINI", "LIFE", "EVENT", "NONE"];
    if (type && validTypes.includes(type)) {
        document.getElementById("target-type").value = type;
    }
    document.getElementById("autocomplete-box").style.display = "none";
    document.getElementById("target-hrs").focus();
}

function setupGlobalClickListeners() {
    document.addEventListener("click", (e) => {
        const box = document.getElementById("autocomplete-box");
        if (box && !e.target.closest(".autocomplete-container")) {
            box.style.display = "none";
        }
    });
}

/* ==========================================================================
   STACKING INTERACTIVE SCREEN TOAST ENGINE
   ========================================================================== */
function spawnToastNotification(headline, subtitle, type = 'alarm') {
    const stack = document.getElementById("toast-notification-stack");
    if (!stack) return;

    const toast = document.createElement("div");
    toast.className = `toast-message toast-${type}`;
    
    toast.innerHTML = `
        <div>
            <div style="font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">${headline}</div>
            <div style="color: var(--text-muted); margin-top: 2px;">${subtitle}</div>
        </div>
        <button class="toast-close-btn">&times;</button>
    `;

    toast.querySelector(".toast-close-btn").addEventListener("click", () => {
        toast.remove();
    });

    stack.appendChild(toast);

    // Self-destruct toast row node entry cleanly after 8 seconds
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
}

/* ==========================================================================
   NATIVE HTML5 DRAG AND DROP HANDLING MATRIX
   ========================================================================== */
function handleColumnDragStart(e, columnId) {
    currentlyDraggingColumnId = columnId;
    e.currentTarget.classList.add("dragging");
    e.dataTransfer.effectAllowed = "move";
}

function handleColumnDragEnd(e) {
    e.currentTarget.classList.remove("dragging");
    const structures = document.querySelectorAll(".board-column");
    structures.forEach(s => s.classList.remove("drag-over"));
    currentlyDraggingColumnId = null;
}

function handleColumnDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    return false;
}

function handleColumnDragEnter(e) {
    e.currentTarget.classList.add("drag-over");
}

function handleColumnDragLeave(e) {
    e.currentTarget.classList.remove("drag-over");
}

function handleColumnDrop(e, targetColumnId) {
    if (e.stopPropagation) e.stopPropagation();
    
    if (currentlyDraggingColumnId && currentlyDraggingColumnId !== targetColumnId) {
        const fromIndex = dashboardColumns.findIndex(c => c.id === currentlyDraggingColumnId);
        const toIndex = dashboardColumns.findIndex(c => c.id === targetColumnId);

        if (fromIndex !== -1 && toIndex !== -1) {
            // Re-order master configurations array context
            const targetedObj = dashboardColumns.splice(fromIndex, 1)[0];
            dashboardColumns.splice(toIndex, 0, targetedObj);

            localStorage.setItem("ro_dashboard_columns", JSON.stringify(dashboardColumns));
            renderTimersUI();
        }
    }
    return false;
}

/* ==========================================================================
   MODAL DIALOG OPERATIONS
   ========================================================================== */
function openTimerModal(mode, trackerId = '', forceColumnId = '', focusTimeDirectly = false) {
    const titleEl = document.getElementById("modal-title-label");
    const submitBtn = document.getElementById("modal-submit-btn");
    const addAnotherBtn = document.getElementById("modal-submit-add-btn");
    const idAnchor = document.getElementById("modal-tracker-id");
    const assignedColInput = document.getElementById("modal-assigned-column");
    const labelText = document.getElementById("countdown-label-text");

    const nameInput = document.getElementById("target-name");
    const typeSelect = document.getElementById("target-type");
    const hrsInput = document.getElementById("target-hrs");
    const minsInput = document.getElementById("target-mins");
    const secsInput = document.getElementById("target-secs");

    document.getElementById("autocomplete-box").style.display = "none";
    idAnchor.value = trackerId;
    assignedColInput.value = forceColumnId;

    if (mode === 'EDIT') {
        titleEl.innerText = "// EDIT_ACTIVE_TIMER_DATA";
        titleEl.style.color = "var(--accent-orange)";
        submitBtn.innerText = "Apply Modifications";
        if (addAnotherBtn) addAnotherBtn.style.display = "none";
        labelText.innerText = "Reset Time Remaining (HH : MM : SS)";

        const targetNode = localTrackers.find(t => t.id === trackerId);
        if (targetNode) {
            nameInput.value = targetNode.name;
            typeSelect.value = targetNode.type || "NONE";
            
            const remainingMs = Math.max(0, targetNode.endTime - Date.now());
            const totalSecs = Math.floor(remainingMs / 1000);
            
            hrsInput.value = totalSecs > 0 ? Math.floor(totalSecs / 3600) : "";
            minsInput.value = totalSecs > 0 ? Math.floor((totalSecs % 3600) / 60) : "";
            secsInput.value = totalSecs > 0 ? totalSecs % 60 : "";
        }
    } else {
        titleEl.innerText = "// INITIALIZE_NEW_TIMER";
        titleEl.style.color = "var(--accent-blue)";
        submitBtn.innerText = "Execute Node Boot";
        if (addAnotherBtn) {
            addAnotherBtn.style.display = "";
            addAnotherBtn.innerText = "Commit // Boot Next";
        }
        labelText.innerText = "Spawn Countdown (HH : MM : SS)";

        nameInput.value = "";
        typeSelect.value = "NONE";
        hrsInput.value = "";
        minsInput.value = "";
        secsInput.value = "";
    }

    document.getElementById("timer-modal").classList.add("active");
    
    if (focusTimeDirectly) {
        hrsInput.focus();
        hrsInput.select();
    } else {
        nameInput.focus();
    }
}

function closeTimerModal() { document.getElementById("timer-modal").classList.remove("active"); }

function openGroupModal(mode, colId = '') {
    const titleEl = document.getElementById("group-modal-title");
    const idAnchor = document.getElementById("modal-group-id");
    const titleInput = document.getElementById("group-title");
    const submitBtn = document.getElementById("group-modal-submit");

    idAnchor.value = colId;

    if (mode === 'EDIT') {
        titleEl.innerText = "// RENAME_BOARD_GROUP";
        submitBtn.innerText = "Update Name Set";
        const col = dashboardColumns.find(c => c.id === colId);
        if (col) titleInput.value = col.title;
        const idRow = document.getElementById("group-tracker-id-row");
        const idDisplay = document.getElementById("group-tracker-id-display");
        if (idRow && idDisplay && col?.trackerId) {
            idRow.style.display = "flex";
            idDisplay.value = col.trackerId;
        } else if (idRow) {
            idRow.style.display = "none";
        }
    } else {
        titleEl.innerText = "// CREATE_NEW_DASHBOARD_GROUP";
        submitBtn.innerText = "Deploy Custom Group";
        titleInput.value = "";
        const idRow = document.getElementById("group-tracker-id-row");
        if (idRow) idRow.style.display = "none";
    }

    document.getElementById("group-modal").classList.add("active");
    titleInput.focus();
}

function closeGroupModal() { document.getElementById("group-modal").classList.remove("active"); }

function copyDisplayedTrackerId() {
    const val = document.getElementById("group-tracker-id-display")?.value;
    if (val) copyTrackerId(val);
}

function copyTrackerId(trackerId) {
    navigator.clipboard?.writeText(trackerId).then(() => {
        spawnToastNotification("Copied", trackerId, 'warn');
    }).catch(() => {
        prompt("Copy tracker ID:", trackerId);
    });
}
function openSettingsModal() { document.getElementById("settings-modal").classList.add("active"); }
function closeSettingsModal() { document.getElementById("settings-modal").classList.remove("active"); }

function updateVolumeLabelDisplay(val) {
    const lbl = document.getElementById("volume-label-display");
    if (lbl) lbl.innerText = `Audio Output Master Volume (${val}%)`;
}

function toggleDesktopNotificationPermission() {
    const checkbox = document.getElementById("setting-desktop-notif");
    if (checkbox.checked) {
        if (!("Notification" in window)) { checkbox.checked = false; return; }
        Notification.requestPermission().then(p => {
            if (p === "granted") { appSettings.desktopNotifications = true; } 
            else { appSettings.desktopNotifications = false; checkbox.checked = false; }
            saveSettingsState();
            updateNotificationUIStatus();
        });
    } else { appSettings.desktopNotifications = false; saveSettingsState(); updateNotificationUIStatus(); }
}

function updateNotificationUIStatus() {
    const txt = document.getElementById("notif-status-text");
    if (!txt) return;
    if (appSettings.desktopNotifications && Notification.permission === "granted") {
        txt.innerText = "Status: ACTIVE"; txt.style.color = "var(--accent-blue)";
    } else { txt.innerText = "Status: DISABLED"; txt.style.color = "var(--text-muted)"; }
}

function setupModalKeybinds() {
    document.getElementById("target-name")?.addEventListener("keydown", (e) => {
        const suggs = document.querySelectorAll(".suggestion-item");
        if (e.key === "Enter" && suggs.length === 0) { e.preventDefault(); saveTimerForm(); }
    });
    document.getElementById("group-title")?.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); saveGroupForm(); } });
}

function saveTimerForm(addAnother = false) {
    const idAnchor = document.getElementById("modal-tracker-id").value;
    const forcedColumnId = document.getElementById("modal-assigned-column").value;
    const nameInput = document.getElementById("target-name");
    const typeSelect = document.getElementById("target-type");
    const hrsInput = document.getElementById("target-hrs");
    const minsInput = document.getElementById("target-mins");
    const secsInput = document.getElementById("target-secs");

    if (!nameInput.value.trim()) { return; }

    const hrs = parseInt(hrsInput.value, 10) || 0;
    const mins = parseInt(minsInput.value, 10) || 0;
    const secs = parseInt(secsInput.value, 10) || 0;
    const durationTotalMs = ((hrs * 3600) + (mins * 60) + secs) * 1000;

    if (durationTotalMs <= 0) { return; }

    const absoluteEndTime = Date.now() + durationTotalMs;

    if (idAnchor) {
        const idx = localTrackers.findIndex(t => t.id === idAnchor);
        if (idx !== -1) {
            localTrackers[idx].name = nameInput.value.trim();
            localTrackers[idx].type = typeSelect.value;
            localTrackers[idx].endTime = absoluteEndTime;
            localTrackers[idx].totalDuration = durationTotalMs;
            localTrackers[idx].warningTriggered = false;
            localTrackers[idx].alarmTriggered = false;

            const trackerId = getTrackerIdForTimer(idAnchor);
            if (trackerId && isLiveSharedTracker(trackerId)) {
                const actor = getShareNickname().trim().toUpperCase();
                if (actor) localTrackers[idx].addedBy = actor;
            }

            if (trackerId && isLiveSharedTracker(trackerId) && ShareSocket.isConnected()) {
                ShareSocket.timerUpdate(trackerId, {
                    id: idAnchor,
                    name: localTrackers[idx].name,
                    type: localTrackers[idx].type,
                    endTime: absoluteEndTime,
                    totalDuration: durationTotalMs
                });
            }
        }
    } else {
        let columnsList = forcedColumnId ? [forcedColumnId] : dashboardColumns.map(c => c.id);
        const col = forcedColumnId ? dashboardColumns.find(c => c.id === forcedColumnId) : null;

        const newTimer = {
            id: "tr_" + Date.now() + Math.random().toString(36).substr(2, 4),
            name: nameInput.value.trim(),
            type: typeSelect.value,
            columnIds: columnsList,
            endTime: absoluteEndTime,
            totalDuration: durationTotalMs,
            warningTriggered: false,
            alarmTriggered: false
        };

        if (col && isColumnSharedLive(col)) {
            newTimer.sharedTrackerId = col.trackerId;
        }

        localTrackers.push(newTimer);

        if (col && isColumnSharedLive(col) && ShareSocket.isConnected()) {
            ShareSocket.timerCreate(col.trackerId, {
                id: newTimer.id,
                name: newTimer.name,
                type: newTimer.type,
                endTime: newTimer.endTime,
                totalDuration: newTimer.totalDuration
            });
        }
    }

    saveTrackersState();
    renderTimersUI();

    if (addAnother && !idAnchor) {
        openTimerModal('CREATE', '', forcedColumnId);
    } else {
        closeTimerModal();
    }
}

function saveGroupForm() {
    const idAnchor = document.getElementById("modal-group-id").value;
    const titleInput = document.getElementById("group-title");

    let formattedTitle = titleInput.value.trim().toUpperCase() || "UNNAMED GROUP";

    if (idAnchor) {
        const idx = dashboardColumns.findIndex(c => c.id === idAnchor);
        if (idx !== -1) {
            dashboardColumns[idx].title = formattedTitle;
            const col = dashboardColumns[idx];
            if (col.shareMode === 'host' && col.sharingActive && ShareSocket.isConnected()) {
                ShareSocket.updateGroupTitle(col.trackerId, formattedTitle);
            }
        }
    } else {
        dashboardColumns.push({
            id: "col_" + Date.now(),
            title: formattedTitle,
            trackerId: generateTrackerId(),
            shareMode: 'local',
            sharingActive: false
        });
    }

    saveDashboardColumns();
    closeGroupModal();
    renderTimersUI();
}

function deleteTracker(id) {
    const trackerId = getTrackerIdForTimer(id);
    localTrackers = localTrackers.filter(t => t.id !== id);
    saveTrackersState();
    renderTimersUI();

    if (trackerId && isLiveSharedTracker(trackerId) && ShareSocket.isConnected()) {
        ShareSocket.timerDelete(trackerId, id);
    }
}

function deleteColumnView(colId) {
    const col = dashboardColumns.find(c => c.id === colId);
    if (!col) return;

    const label = col.shareMode === 'guest' ? 'Remove this shared group from your dashboard?' : 'Permanently wipe out this group column?';
    if (!confirm(label)) return;

    const finishDelete = () => {
        dashboardColumns = dashboardColumns.filter(c => c.id !== colId);
        if (col.trackerId && col.shareMode === 'guest') {
            localTrackers = localTrackers.filter(t => t.sharedTrackerId !== col.trackerId);
        } else {
            localTrackers.forEach(t => { if (t.columnIds) t.columnIds = t.columnIds.filter(id => id !== colId); });
        }
        if (col.shareMode === 'guest') {
            persistGuestSessions();
        }
        saveDashboardColumns();
        saveTrackersState();
        renderTimersUI();
    };

    if (col.shareMode === 'host' && col.sharingActive) {
        handleStopSharing(colId, false).finally(finishDelete);
        return;
    }

    if (col.shareMode === 'guest' && col.trackerId) {
        const trackerId = col.trackerId;
        const nickname = getShareNickname();
        const leaveServer = ShareSocket.isConnected()
            ? ShareSocket.leaveGroup(trackerId, nickname)
            : Promise.resolve();
        leaveServer.finally(finishDelete);
        return;
    }

    finishDelete();
}

function clearFinishedTimersForColumn(columnId) {
    const col = dashboardColumns.find(c => c.id === columnId);
    const toRemove = localTrackers.filter(t => {
        const isFinished = (t.endTime - Date.now()) <= 0;
        if (col?.shareMode === 'guest' || (col?.sharingActive && col?.trackerId)) {
            return isFinished && t.sharedTrackerId === col.trackerId;
        }
        return isFinished && t.columnIds && t.columnIds.includes(columnId);
    });

    toRemove.forEach(t => {
        if (col && isColumnSharedLive(col) && ShareSocket.isConnected()) {
            ShareSocket.timerDelete(col.trackerId, t.id);
        }
    });

    const removeIds = new Set(toRemove.map(t => t.id));
    localTrackers = localTrackers.filter(t => !removeIds.has(t.id));
    saveTrackersState();
    renderTimersUI();
}

/* Clear everything inside a column, countdowns included */
function clearAllTimersForColumn(columnId) {
    const col = dashboardColumns.find(c => c.id === columnId);
    if (!confirm("Are you sure you want to clear ALL trackers (active and finished) in this group?")) return;

    const toRemove = getTimersForColumn(col);
    if (col && isColumnSharedLive(col) && ShareSocket.isConnected()) {
        toRemove.forEach(t => ShareSocket.timerDelete(col.trackerId, t.id));
    }

    if (col?.shareMode === 'guest' || (col?.sharingActive && col?.trackerId)) {
        localTrackers = localTrackers.filter(t => t.sharedTrackerId !== col.trackerId);
    } else {
        localTrackers = localTrackers.filter(t => !(t.columnIds && t.columnIds.includes(columnId)));
    }
    saveTrackersState();
    renderTimersUI();
}

function purgeAllApplicationData() {
    if (confirm("Hard clean wipe all runtime objects back to basic values?")) {
        localTrackers = [];
        dashboardColumns = [];
        openAccordions = {};
        openFinishedAccordions = {};
        purgeSharedSessionState();
        localStorage.setItem("ro_dashboard_columns", JSON.stringify(dashboardColumns));
        saveTrackersState();
        closeSettingsModal();
        renderTimersUI();
    }
}

function purgeSharedSessionState() {
    sharedGroupState = {};
    guestPermissions = {};
    allowlistCache = {};
    sessionStorage.removeItem("guest_sessions");
    localStorage.removeItem("ro_guest_sessions");
}

function saveTrackersState() { localStorage.setItem("ro_active_trackers", JSON.stringify(localTrackers)); }
function saveSettingsState() {
    const volInput = document.getElementById("setting-master-volume").value;
    const soundSel = document.getElementById("setting-sound-profile").value;
    const notifCheck = document.getElementById("setting-desktop-notif").checked;
    const themeSel = document.getElementById("setting-theme");
    appSettings.soundProfile = soundSel;
    appSettings.masterVolume = parseFloat(volInput) / 100;
    appSettings.desktopNotifications = notifCheck;
    if (themeSel) appSettings.theme = themeSel.value;
    localStorage.setItem("ro_app_settings", JSON.stringify(appSettings));
    if (typeof setAppTheme === 'function') setAppTheme(appSettings.theme);
}

function previewAudioProfile() {
    saveSettingsState();
    let audioPattern = [{ freq: 880, delay: 0.0, dur: 0.12 }, { freq: 880, delay: 0.15, dur: 0.12 }, { freq: 1200, delay: 0.3, dur: 0.25 }];
    if (appSettings.soundProfile === 'pulse') audioPattern = [{ freq: 400, delay: 0.0, dur: 0.3 }, { freq: 350, delay: 0.35, dur: 0.5 }];
    else if (appSettings.soundProfile === 'digital') audioPattern = [{ freq: 1800, delay: 0.0, dur: 0.1 }, { freq: 1800, delay: 0.12, dur: 0.1 }, { freq: 1800, delay: 0.24, dur: 0.3 }];
    playSynthesizedChimePattern(audioPattern);
}

function processTimerTick() {
    if (localTrackers.length === 0) return;
    let changes = false;
    localTrackers.forEach(tracker => {
        const timeLeft = tracker.endTime - Date.now();
        if (timeLeft <= 60000 && timeLeft > 0 && !tracker.warningTriggered) { tracker.warningTriggered = true; changes = true; triggerWarningNotification(tracker); }
        if (timeLeft <= 0 && !tracker.alarmTriggered) { tracker.alarmTriggered = true; changes = true; triggerAlarmNotification(tracker); }
    });
    if (changes) saveTrackersState();
    renderTimersUI();
}

/* ==========================================================================
   DOM CORE RENDER PROCEDURES
   ========================================================================== */
function buildTimerCardHtml(t, isFinishedMode = false, col = null) {
    const msLeft = t.endTime - Date.now();
    let clockText = "00:00:00";
    let percentage = 0;

    if (msLeft > 0) {
        percentage = Math.max(0, Math.min(100, (msLeft / t.totalDuration) * 100));
        const totalSecs = Math.floor(msLeft / 1000);
        const hrs = Math.floor(totalSecs / 3600).toString().padStart(2, '0');
        const mins = Math.floor((totalSecs % 3600) / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        clockText = `${hrs}:${mins}:${secs}`;
    } else {
        clockText = "WINDOW OPEN";
        percentage = 0;
    }

    let typeBadge = "badge-neutral";
    if(t.type === "MVP") typeBadge = "badge-fire";
    if(t.type === "MINI") typeBadge = "badge-orange";
    if(t.type === "LIFE") typeBadge = "badge-medium";
    if(t.type === "EVENT") typeBadge = "badge-water";

    let barState = "";
    if (percentage < 20) barState = "critical";
    else if (percentage < 50) barState = "warning";

    const actionLabelHtml = isFinishedMode 
        ? `<button type="button" class="timer-action-btn timer-action-btn--reset" onclick="openTimerModal('EDIT', '${t.id}', '', true)">Reset</button>` 
        : `<button type="button" class="timer-action-btn timer-action-btn--edit" onclick="openTimerModal('EDIT', '${t.id}')">Edit</button>`;

    const isHostCol = col && col.shareMode === 'host';
    const perms = col?.trackerId ? guestPermissions[col.trackerId] : null;
    const canEdit = !col || isHostCol || perms?.canUpdate;
    const canDelete = !col || isHostCol || perms?.canDelete;
    const canCreate = !col || isHostCol || perms?.canCreate;

    const editHtml = canEdit ? actionLabelHtml : '';
    const deleteHtml = canDelete
        ? `<button type="button" class="timer-action-btn timer-action-btn--delete" onclick="deleteTracker('${t.id}')" aria-label="Delete timer">&times;</button>`
        : '';
    const addedByHtml = t.addedBy
        ? `<span class="timer-added-by">by ${t.addedBy}</span>`
        : '';

    return `
        <div class="timer-card ${msLeft <= 0 ? 'spawned' : ''}">
            <div class="timer-card-meta">
                <span class="badge ${typeBadge}" style="padding:1px 4px;">${t.type || 'GENERAL'}</span>
                <div class="timer-card-actions">
                    ${editHtml}
                    ${deleteHtml}
                </div>
            </div>
            <div class="timer-card-meta">
                <span class="timer-card-name">${t.name} ${addedByHtml}</span>
                <span class="timer-card-clock" style="color: ${msLeft <= 0 ? 'var(--elem-fire)' : 'var(--accent-blue)'};">${clockText}</span>
            </div>
            <div class="progress-track">
                <div class="progress-bar ${barState}" style="width: ${percentage}%;"></div>
            </div>
        </div>
    `;
}

function renderTimersUI() {
    const container = document.getElementById("timers-dashboard-mount");
    if (!container) return;
    container.innerHTML = "";

    if (dashboardColumns.length === 0) {
        container.innerHTML = `<div class="no-data" style="grid-column: 1 / -1; padding:40px; text-align:center; color: var(--text-muted);">NO COLUMNS MOUNTED. DEPLOY A NEW GROUP TO START.</div>`;
        return;
    }

    dashboardColumns.forEach((col, idx) => {
        const colEl = document.createElement("div");
        const extraClass = col.shareMode === 'guest' ? ' col-shared-guest' : '';
        const offlineClass = col.disconnected ? ' col-disconnected' : '';
        colEl.className = `board-column ${idx % 2 !== 0 ? 'col-alt' : ''}${extraClass}${offlineClass}`;
        
        const isGuest = col.shareMode === 'guest';
        const canGuestCreate = isGuest && guestPermissions[col.trackerId]?.canCreate;

        if (!isGuest) {
            colEl.setAttribute("draggable", "true");
            colEl.addEventListener("dragstart", (e) => handleColumnDragStart(e, col.id));
            colEl.addEventListener("dragend", handleColumnDragEnd);
            colEl.addEventListener("dragover", handleColumnDragOver);
            colEl.addEventListener("dragenter", handleColumnDragEnter);
            colEl.addEventListener("dragleave", handleColumnDragLeave);
            colEl.addEventListener("drop", (e) => handleColumnDrop(e, col.id));
        }

        const allMatched = getTimersForColumn(col);
        const activeTimers = allMatched.filter(t => (t.endTime - Date.now()) > 0).sort((a, b) => a.endTime - b.endTime);
        const finishedTimers = allMatched.filter(t => (t.endTime - Date.now()) <= 0).sort((a, b) => b.endTime - a.endTime);

        let shareControls = '';
        if (!isGuest) {
            const startBtn = !col.sharingActive
                ? `<button class="col-action-btn" style="color:var(--accent-yellow);" onclick="handleStartSharing('${col.id}')">▶ Share</button>`
                : `<button class="col-action-btn" style="color:var(--elem-fire);" onclick="handleStopSharing('${col.id}')">■ Stop</button>`;
            const pendingCount = (sharedGroupState[col.trackerId]?.pending || []).length;
            const permsBtn = col.sharingActive
                ? `<button class="col-action-btn" onclick="openPermissionsModal('${col.id}')" style="${pendingCount ? 'border-color:var(--accent-yellow);color:var(--accent-yellow);' : ''}">Perms${pendingCount ? ` (${pendingCount})` : ''}</button>`
                : '';
            shareControls = `<div class="column-header-actions-secondary">${startBtn}${permsBtn}</div>`;
        }

        const addBtn = (!isGuest || canGuestCreate) && !col.disconnected
            ? `<button class="col-action-btn add-inline" onclick="openTimerModal('CREATE', '', '${col.id}')">+ Add</button>`
            : '';
        const nameBtn = !isGuest
            ? `<button class="col-action-btn" onclick="openGroupModal('EDIT', '${col.id}')">Rename</button>`
            : '';
        const clearBtn = !isGuest
            ? `<button class="col-action-btn" style="color:var(--accent-orange);" onclick="clearAllTimersForColumn('${col.id}')">Clear</button>`
            : '';
        const trackerIdRow = !isGuest && col.trackerId
            ? `<div class="tracker-id-row">${getShareStatusChip(col)}<span class="tracker-id-code">${col.trackerId}</span><button class="col-action-btn" onclick="copyTrackerId('${col.trackerId}')">Copy</button></div>`
            : (isGuest && col.trackerId
                ? `<div class="tracker-id-row">${getShareStatusChip(col)}<span class="tracker-id-code">${col.trackerId}</span></div>`
                : '');

        const primaryActions = `${addBtn}${nameBtn}${clearBtn}`;
        const actionsBlock = (primaryActions || shareControls) ? `
                <div class="column-header-actions">
                    <div class="column-header-actions-primary">${primaryActions}</div>
                    ${shareControls}
                </div>` : '';

        let colHeaderHtml = `
            <div class="column-header" draggable="false">
                <div class="column-header-top">
                    <div class="column-header-info">
                        <span class="column-title">${getDisplayTitle(col)} (${allMatched.length})</span>
                        ${trackerIdRow}
                    </div>
                    <button class="col-action-btn col-delete" onclick="deleteColumnView('${col.id}')" title="Remove group">&times;</button>
                </div>${actionsBlock}
            </div>
            <div class="column-body" draggable="false">
        `;

        if (activeTimers.length === 0 && finishedTimers.length === 0) {
            colHeaderHtml += `<div class="no-data ui-text-sm" style="padding:16px 0;">NO TRACKERS DETECTED</div>`;
        } else {
            if (activeTimers.length > 0) {
                const visibleActive = activeTimers.slice(0, 5);
                const hiddenActive = activeTimers.slice(5);

                visibleActive.forEach(t => { colHeaderHtml += buildTimerCardHtml(t, false, col); });

                if (hiddenActive.length > 0) {
                    const isAccordionOpen = !!openAccordions[col.id];
                    colHeaderHtml += `
                        <div class="accordion-wrapper">
                            <button class="accordion-trigger" onclick="toggleColumnAccordion('${col.id}')">
                                <span>${isAccordionOpen ? '▼ Hide' : '▲ Show'} Active Overflows (${hiddenActive.length})</span>
                            </button>
                            <div class="accordion-content ${isAccordionOpen ? 'open' : ''}">
                    `;
                    hiddenActive.forEach(t => { colHeaderHtml += buildTimerCardHtml(t, false, col); });
                    colHeaderHtml += `</div></div>`;
                }
            }

            if (finishedTimers.length > 0) {
                colHeaderHtml += `
                    <div class="finished-section-divider">
                        <div class="finished-section-header">
                            <span class="finished-section-title">Finished Windows (${finishedTimers.length})</span>
                            ${!isGuest ? `<button class="clear-finished-inline" onclick="clearFinishedTimersForColumn('${col.id}')">Clear Finished</button>` : ''}
                        </div>
                `;

                const visibleFinished = finishedTimers.slice(0, 3);
                const hiddenFinished = finishedTimers.slice(3);

                visibleFinished.forEach(t => { colHeaderHtml += buildTimerCardHtml(t, true, col); });

                if (hiddenFinished.length > 0) {
                    const isFinAccordionOpen = !!openFinishedAccordions[col.id];
                    colHeaderHtml += `
                        <div class="accordion-wrapper">
                            <button class="accordion-trigger" style="border-color: rgba(248,113,113,0.2);" onclick="toggleFinishedAccordion('${col.id}')">
                                <span>${isFinAccordionOpen ? '▼ Hide' : '▲ Show'} Historical (${hiddenFinished.length})</span>
                            </button>
                            <div class="accordion-content ${isFinAccordionOpen ? 'open' : ''}">
                    `;
                    hiddenFinished.forEach(t => { colHeaderHtml += buildTimerCardHtml(t, true, col); });
                    colHeaderHtml += `</div></div>`;
                }

                colHeaderHtml += `</div>`;
            }
        }

        colHeaderHtml += `</div>`;
        colEl.innerHTML = colHeaderHtml;
        container.appendChild(colEl);
    });
}

function playSynthesizedChimePattern(pattern) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if(!audioCtx) return;
        let startTime = audioCtx.currentTime; const targetVolume = appSettings.masterVolume;
        pattern.forEach((note) => {
            const osc = audioCtx.createOscillator(); const gainNode = audioCtx.createGain();
            if (appSettings.soundProfile === 'pulse') osc.type = 'triangle'; else if (appSettings.soundProfile === 'digital') osc.type = 'square'; else osc.type = 'sine';
            osc.frequency.setValueAtTime(note.freq, startTime + note.delay);
            gainNode.gain.setValueAtTime(targetVolume * 0.15, startTime + note.delay);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + note.delay + note.dur - 0.02);
            osc.connect(gainNode); gainNode.connect(audioCtx.destination);
            osc.start(startTime + note.delay); osc.stop(startTime + note.delay + note.dur);
        });
    } catch (e) {}
}

function triggerWarningNotification(tracker) {
    let audioPattern = [{ freq: 650, delay: 0.0, dur: 0.1 }, { freq: 650, delay: 0.15, dur: 0.1 }];
    if (appSettings.soundProfile === 'pulse') audioPattern = [{ freq: 300, delay: 0.0, dur: 0.2 }, { freq: 300, delay: 0.25, dur: 0.2 }];
    else if (appSettings.soundProfile === 'digital') audioPattern = [{ freq: 1500, delay: 0.0, dur: 0.05 }, { freq: 1500, delay: 0.08, dur: 0.05 }];
    playSynthesizedChimePattern(audioPattern);
    
    spawnToastNotification(`⚠️ Warning: ${tracker.name}`, `Approaching milestone window.`, 'warn');

    if (appSettings.desktopNotifications && Notification.permission === "granted") {
        new Notification(`⚠️ Warning: ${tracker.name}`, { body: `Approaching milestone window.`, tag: tracker.id + "-warn" });
    }
}

function triggerAlarmNotification(tracker) {
    let audioPattern = [{ freq: 880, delay: 0.0, dur: 0.12 }, { freq: 880, delay: 0.15, dur: 0.12 }, { freq: 1200, delay: 0.3, dur: 0.25 }];
    if (appSettings.soundProfile === 'pulse') audioPattern = [{ freq: 400, delay: 0.0, dur: 0.3 }, { freq: 350, delay: 0.35, dur: 0.5 }];
    else if (appSettings.soundProfile === 'digital') audioPattern = [{ freq: 1800, delay: 0.0, dur: 0.1 }, { freq: 1800, delay: 0.12, dur: 0.1 }, { freq: 1800, delay: 0.24, dur: 0.3 }];
    playSynthesizedChimePattern(audioPattern);
    
    // Non-blocking stacked screen notification elements
    spawnToastNotification(`🚨 SPAWN WINDOW OPEN`, `${tracker.name.toUpperCase()} has arrived!`, 'alarm');

    if (appSettings.desktopNotifications && Notification.permission === "granted") {
        new Notification(`🚨 ALERT: ${tracker.name}`, { body: `Target window reached!`, tag: tracker.id + "-spawn" });
    }
}

/* ==========================================================================
   SHARED GROUP SOCKET LAYER
   ========================================================================== */
function applyServerTimers(trackerId, timers) {
    const existing = {};
    localTrackers.filter((t) => t.sharedTrackerId === trackerId).forEach((t) => {
        existing[t.id] = { warningTriggered: t.warningTriggered, alarmTriggered: t.alarmTriggered };
    });

    localTrackers = localTrackers.filter((t) => t.sharedTrackerId !== trackerId);
    const col = getColumnByTrackerId(trackerId);

    timers.forEach((t) => {
        const prev = existing[t.id] || {};
        localTrackers.push({
            id: t.id,
            name: t.name,
            type: t.type || 'NONE',
            endTime: t.endTime,
            totalDuration: t.totalDuration,
            addedBy: t.addedBy,
            sharedTrackerId: trackerId,
            columnIds: col ? [col.id] : [],
            warningTriggered: prev.warningTriggered || false,
            alarmTriggered: prev.alarmTriggered || false
        });
    });

    saveTrackersState();
    renderTimersUI();
}

function persistGuestSessions() {
    const sessions = dashboardColumns
        .filter((c) => c.shareMode === 'guest' && c.trackerId && !c.disconnected)
        .map((c) => ({ trackerId: c.trackerId, colId: c.id, title: c.title }));
    sessionStorage.setItem("guest_sessions", JSON.stringify(sessions));
    localStorage.setItem("ro_guest_sessions", JSON.stringify(sessions));
}

function restoreGuestSessionsFromStorage() {
    const raw = sessionStorage.getItem("guest_sessions") || localStorage.getItem("ro_guest_sessions");
    if (!raw) return;

    try {
        const sessions = JSON.parse(raw);
        let changed = false;

        sessions.forEach((s) => {
            if (!s?.trackerId) return;

            let col = dashboardColumns.find((c) => c.trackerId === s.trackerId && c.shareMode === 'guest');
            if (!col) {
                dashboardColumns.push({
                    id: s.colId || ("col_guest_" + s.trackerId),
                    title: (s.title || 'SHARED GROUP').toUpperCase(),
                    trackerId: s.trackerId,
                    shareMode: 'guest',
                    sharingActive: true,
                    disconnected: false
                });
                changed = true;
            } else if (col.disconnected) {
                col.disconnected = false;
                changed = true;
            }
        });

        if (changed) saveDashboardColumns();
    } catch (e) {
        console.warn('restoreGuestSessionsFromStorage:', e);
    }
}

function refreshAllowlistStatusForColumns() {
    if (!ShareSocket.isConnected()) return;
    dashboardColumns
        .filter((c) => c.shareMode === 'local' && c.trackerId)
        .forEach((col) => {
            ShareSocket.checkAllowlist(col.trackerId)
                .then((result) => {
                    allowlistCache[col.trackerId] = result;
                    renderTimersUI();
                })
                .catch(() => {});
        });
}

function reconnectSharedSessions() {
    if (!ShareSocket.isConnected()) return;

    const guestNick = getShareNickname();

    dashboardColumns
        .filter((c) => isHostSharingColumn(c))
        .forEach((col) => {
            resumeHostForColumn(col).then((ok) => {
                if (ok) return loadHostGroupMembers(col.trackerId);
            });
        });

    dashboardColumns
        .filter((c) => c.shareMode === 'guest' && c.trackerId && !c.disconnected)
        .forEach((col) => {
            if (!guestNick) return;
            ShareSocket.joinGroup(col.trackerId, guestNick).catch(() => {
                col.disconnected = true;
                saveDashboardColumns();
                persistGuestSessions();
            });
        });
}

function initShareSocketLayer() {
    ShareSocket.init({
        onConnect: () => {
            hostSessionsReady.clear();
            hostResumeInflight.clear();
            refreshAllowlistStatusForColumns();
            reconnectSharedSessions();
        },
        onConnectError: () => {
            spawnToastNotification('Server Offline', 'Cannot reach the server. Check your connection or try again later.', 'warn');
        },
        onStartSharingOk: (payload) => {
            const col = getColumnByTrackerId(payload.trackerId);
            if (col) {
                col.shareMode = 'host';
                col.sharingActive = true;
                col.disconnected = false;
                const hostNick = getHostNicknameForColumn(col);
                if (hostNick) col.hostNickname = hostNick.trim().toUpperCase();
                localTrackers.forEach((t) => {
                    if (t.columnIds?.includes(col.id)) {
                        t.sharedTrackerId = payload.trackerId;
                    }
                });
                saveTrackersState();
                saveDashboardColumns();
            }
            markHostSessionReady(payload.trackerId);
            if (!payload.resumed) {
                spawnToastNotification('Sharing Live', payload.trackerId, 'warn');
            }
            ShareSocket.getPendingJoins(payload.trackerId).then((res) => {
                if (!sharedGroupState[payload.trackerId]) sharedGroupState[payload.trackerId] = { members: [], pending: [] };
                sharedGroupState[payload.trackerId].pending = res.pending || [];
                renderTimersUI();
            }).catch(() => {});
            loadHostGroupMembers(payload.trackerId);
            renderTimersUI();
        },
        onStartSharingError: (payload) => {
            spawnToastNotification(payload.code || 'Error', payload.message || 'Could not start sharing.', 'alarm');
        },
        onStopSharingOk: (payload) => {
            clearHostSessionReady(payload.trackerId);
            const col = getColumnByTrackerId(payload.trackerId);
            if (col) {
                col.sharingActive = false;
                col.shareMode = 'local';
                saveDashboardColumns();
            }
            renderTimersUI();
        },
        onSharingStopped: (payload) => {
            clearHostSessionReady(payload.trackerId);
            dashboardColumns
                .filter((c) => c.trackerId === payload.trackerId && c.shareMode === 'guest')
                .forEach((c) => { c.disconnected = true; });
            const hostCol = getColumnByTrackerId(payload.trackerId);
            if (hostCol && hostCol.shareMode === 'host') {
                hostCol.sharingActive = false;
                hostCol.shareMode = 'local';
            }
            saveDashboardColumns();
            spawnToastNotification('Sharing Stopped', `${payload.trackerId} is offline.`, 'warn');
            renderTimersUI();
        },
        onJoinOk: (payload) => {
            guestPermissions[payload.trackerId] = payload.permissions;
            if (!sharedGroupState[payload.trackerId]) sharedGroupState[payload.trackerId] = { members: [], pending: [] };
            sharedGroupState[payload.trackerId].members = payload.members || [];
            sharedGroupState[payload.trackerId].pending = (sharedGroupState[payload.trackerId].pending || [])
                .filter((n) => n !== getShareNickname().toUpperCase());

            let col = getColumnByTrackerId(payload.trackerId);
            if (!col) {
                col = {
                    id: "col_guest_" + Date.now(),
                    title: (payload.title || 'SHARED GROUP').toUpperCase(),
                    trackerId: payload.trackerId,
                    shareMode: 'guest',
                    sharingActive: true,
                    disconnected: false
                };
                dashboardColumns.push(col);
            } else {
                col.title = (payload.title || col.title).toUpperCase();
                col.disconnected = false;
            }

            applyServerTimers(payload.trackerId, payload.timers || []);
            saveDashboardColumns();
            persistGuestSessions();
            spawnToastNotification('Joined Group', payload.title || payload.trackerId, 'warn');
        },
        onJoinPending: (payload) => {
            spawnToastNotification('Pending Approval', `Waiting for host to accept (${payload.nickname}).`, 'warn');
        },
        onJoinDenied: (payload) => {
            spawnToastNotification('Join Denied', payload.message || 'Host denied your request.', 'alarm');
        },
        onJoinRequest: (payload) => {
            if (!sharedGroupState[payload.trackerId]) sharedGroupState[payload.trackerId] = { members: [], pending: [] };
            const pending = sharedGroupState[payload.trackerId].pending || [];
            if (!pending.includes(payload.nickname)) pending.push(payload.nickname);
            sharedGroupState[payload.trackerId].pending = pending;
            spawnToastNotification('Join Request', `${payload.nickname} wants to join.`, 'warn');
            renderTimersUI();
            refreshPermissionsPanelsIfOpen(payload.trackerId);
        },
        onJoinRequestsUpdated: (payload) => {
            if (!sharedGroupState[payload.trackerId]) sharedGroupState[payload.trackerId] = { members: [], pending: [] };
            sharedGroupState[payload.trackerId].pending = payload.pending || [];
            renderTimersUI();
            refreshPermissionsPanelsIfOpen(payload.trackerId);
        },
        onGuestRemoved: (payload) => {
            removeGuestColumnFromDashboard(payload.trackerId);
            spawnToastNotification('Removed', payload.message || 'You were removed from the group.', 'alarm');
        },
        onJoinError: (payload) => {
            spawnToastNotification(payload.code || 'Join Failed', payload.message || 'Could not join group.', 'alarm');
        },
        onGroupMetaUpdated: (payload) => {
            const col = getColumnByTrackerId(payload.trackerId);
            if (col) {
                col.title = payload.title;
                saveDashboardColumns();
                renderTimersUI();
            }
        },
        onTimersUpdated: (payload) => {
            applyServerTimers(payload.trackerId, payload.timers || []);
        },
        onPermissionsUpdated: (payload) => {
            const myNick = getShareNickname().toUpperCase();
            if (payload.nickname === myNick) {
                guestPermissions[payload.trackerId] = {
                    canCreate: payload.canCreate,
                    canUpdate: payload.canUpdate,
                    canDelete: payload.canDelete
                };
                renderTimersUI();
            }
            applyMemberPermissionsToState(payload.trackerId, payload.nickname, payload);
            refreshPermissionsPanelsIfOpen(payload.trackerId);
        },
        onMembersUpdated: (payload) => {
            if (!sharedGroupState[payload.trackerId]) sharedGroupState[payload.trackerId] = { members: [], pending: [] };
            sharedGroupState[payload.trackerId].members = payload.members || [];
            refreshPermissionsPanelsIfOpen(payload.trackerId);
            if (document.getElementById("permissions-modal")?.classList.contains('active')) {
                setPermissionsModalLoading(false);
            }
            renderTimersUI();
        },
        onError: (payload) => {
            spawnToastNotification(payload.code || 'Error', payload.message || 'Action failed.', 'alarm');
        }
    });
}

async function handleStartSharing(colId) {
    const col = dashboardColumns.find((c) => c.id === colId);
    if (!col?.trackerId) return;

    const nickname = getShareNickname();
    if (!nickname) {
        spawnToastNotification('Nickname Required', 'Enter your nickname in the join panel first.', 'warn');
        document.getElementById("share-nickname")?.focus();
        return;
    }

    if (!ShareSocket.isConnected()) {
        spawnToastNotification('Server Offline', 'Start the server with npm start.', 'alarm');
        return;
    }

    try {
        const allow = await ShareSocket.checkAllowlist(col.trackerId);
        allowlistCache[col.trackerId] = allow;
        if (!allow.allowed) {
            spawnToastNotification('Not Activated', 'Send this tracker ID to admin for allowlisting.', 'alarm');
            renderTimersUI();
            return;
        }

        const timers = getTimersForColumn(col).map((t) => ({
            id: t.id,
            name: t.name,
            type: t.type,
            endTime: t.endTime,
            totalDuration: t.totalDuration
        }));

        col.hostNickname = nickname.trim().toUpperCase();
        saveDashboardColumns();

        await ShareSocket.startSharing({
            trackerId: col.trackerId,
            hostNickname: nickname,
            title: col.title,
            timers,
            memberPermissions: [],
            defaultPermissions: { canCreate: false, canUpdate: false, canDelete: false }
        });
    } catch (err) {
        spawnToastNotification(err.code || 'Error', err.message || 'Could not start sharing.', 'alarm');
    }
}

async function handleStopSharing(colId, showConfirm = true) {
    const col = dashboardColumns.find((c) => c.id === colId);
    if (!col?.trackerId || !col.sharingActive) return;

    if (showConfirm && !confirm('Stop sharing this group? Guests will be disconnected.')) return;

    try {
        await ShareSocket.stopSharing(col.trackerId);
        col.sharingActive = false;
        col.shareMode = 'local';
        saveDashboardColumns();
        renderTimersUI();
    } catch (err) {
        spawnToastNotification(err.code || 'Error', err.message || 'Could not stop sharing.', 'alarm');
    }
}

async function submitJoinGroup() {
    const trackerId = document.getElementById("join-tracker-id")?.value?.trim().toUpperCase();
    const nickname = getShareNickname();

    if (!trackerId || !nickname) {
        spawnToastNotification('Missing Fields', 'Tracker ID and nickname are required.', 'warn');
        return;
    }

    if (!ShareSocket.isConnected()) {
        spawnToastNotification('Server Offline', 'Start the server with npm start.', 'alarm');
        return;
    }

    if (dashboardColumns.some((c) => c.trackerId === trackerId && c.shareMode === 'guest')) {
        spawnToastNotification('Already Joined', 'This group is already on your dashboard.', 'warn');
        return;
    }

    try {
        const res = await ShareSocket.joinGroup(trackerId, nickname);
        document.getElementById("join-tracker-id").value = '';
        if (res?.pending) {
            spawnToastNotification('Pending Approval', 'Waiting for the host to accept your request.', 'warn');
        }
    } catch (err) {
        spawnToastNotification(err.code || 'Join Failed', err.message || 'Could not join group.', 'alarm');
    }
}

function removeGuestColumnFromDashboard(trackerId) {
    dashboardColumns = dashboardColumns.filter((c) => !(c.trackerId === trackerId && c.shareMode === 'guest'));
    localTrackers = localTrackers.filter((t) => t.sharedTrackerId !== trackerId);
    saveDashboardColumns();
    saveTrackersState();
    persistGuestSessions();
    renderTimersUI();
}

function refreshPermissionsPanelsIfOpen(trackerId) {
    const colId = document.getElementById("permissions-col-id")?.value;
    if (!colId) return;
    const col = dashboardColumns.find((c) => c.id === colId);
    if (col?.trackerId === trackerId) renderPermissionsPanels(trackerId);
}

function applyMemberPermissionsToState(trackerId, nickname, permissions) {
    if (!sharedGroupState[trackerId]) sharedGroupState[trackerId] = { members: [], pending: [] };
    const key = String(nickname).toUpperCase();
    const members = sharedGroupState[trackerId].members || [];
    const member = members.find((m) => String(m.nickname).toUpperCase() === key);
    if (member) {
        member.permissions = {
            canCreate: Boolean(permissions.canCreate),
            canUpdate: Boolean(permissions.canUpdate),
            canDelete: Boolean(permissions.canDelete)
        };
    }
}

async function ensureHostSession(trackerId, { force = false } = {}) {
    const col = getColumnByTrackerId(trackerId);
    if (!isHostSharingColumn(col)) return;
    if (!force && hostSessionsReady.has(trackerId)) return;
    await resumeHostForColumn(col);
}

function applyMembersResponse(trackerId, res) {
    if (!sharedGroupState[trackerId]) sharedGroupState[trackerId] = { members: [], pending: [] };
    sharedGroupState[trackerId].members = res.members || [];
    sharedGroupState[trackerId].pending = res.pending || [];
    refreshPermissionsPanelsIfOpen(trackerId);
}

async function loadHostGroupMembers(trackerId) {
    if (!ShareSocket.isConnected()) return;
    const col = getColumnByTrackerId(trackerId);
    if (!isHostSharingColumn(col)) return;

    const hostNickname = getHostNicknameForColumn(col);

    try {
        const res = await ShareSocket.getGroupMembers(trackerId, hostNickname);
        applyMembersResponse(trackerId, res);
        if (hostNickname) markHostSessionReady(trackerId);
        return res;
    } catch (err) {
        if (err?.code === 'FORBIDDEN' || err?.code === 'TIMEOUT') {
            clearHostSessionReady(trackerId);
            await resumeHostForColumn(col);
            const res = await ShareSocket.getGroupMembers(trackerId, hostNickname);
            applyMembersResponse(trackerId, res);
            if (hostNickname) markHostSessionReady(trackerId);
            return res;
        }
        throw err;
    }
}

async function syncGroupMembersFromServer(trackerId) {
    await ensureHostSession(trackerId);
    return loadHostGroupMembers(trackerId);
}

function setPermissionsModalLoading(loading) {
    const loadingEl = document.getElementById("permissions-loading");
    const emptyEl = document.getElementById("permissions-empty");
    const listEl = document.getElementById("permissions-member-list");
    if (loadingEl) loadingEl.style.display = loading ? 'block' : 'none';
    if (loading) {
        if (emptyEl) emptyEl.style.display = 'none';
        if (listEl) listEl.innerHTML = '';
    }
}

async function openPermissionsModal(colId) {
    const col = dashboardColumns.find((c) => c.id === colId);
    if (!col?.trackerId) return;

    document.getElementById("permissions-col-id").value = colId;
    document.getElementById("permissions-tracker-label").innerText = `Tracker: ${col.trackerId}`;
    document.getElementById("permissions-modal").classList.add("active");
    setPermissionsModalLoading(true);

    try {
        if (ShareSocket.isConnected() && isHostSharingColumn(col)) {
            col.shareMode = 'host';
            await loadHostGroupMembers(col.trackerId);
        }
    } catch (_) {
        /* show cached or empty state */
    } finally {
        setPermissionsModalLoading(false);
        renderPermissionsPanels(col.trackerId);
    }
}

function closePermissionsModal() {
    document.getElementById("permissions-modal").classList.remove("active");
}

function renderPermissionsPanels(trackerId) {
    const pendingSection = document.getElementById("permissions-pending-section");
    const pendingList = document.getElementById("permissions-pending-list");
    const listEl = document.getElementById("permissions-member-list");
    const emptyEl = document.getElementById("permissions-empty");
    if (!listEl || !emptyEl) return;

    const pending = sharedGroupState[trackerId]?.pending || [];
    if (pendingSection && pendingList) {
        if (pending.length > 0) {
            pendingSection.style.display = 'block';
            pendingList.innerHTML = '';
            pending.forEach((nickname) => {
                const row = document.createElement('div');
                row.style.cssText = 'border:1px solid var(--accent-yellow); padding:8px 10px; display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap;';
                row.innerHTML = `
                    <span class="ui-text-md" style="font-weight:800;">${nickname}</span>
                    <div style="display:flex; gap:4px;">
                        <button class="col-action-btn add-inline approve-guest-btn" type="button">Accept</button>
                        <button class="col-action-btn deny-guest-btn" type="button" style="color:var(--elem-fire);">Deny</button>
                    </div>`;
                row.querySelector('.approve-guest-btn').addEventListener('click', () => approveGuestJoin(trackerId, nickname));
                row.querySelector('.deny-guest-btn').addEventListener('click', () => denyGuestJoin(trackerId, nickname));
                pendingList.appendChild(row);
            });
        } else {
            pendingSection.style.display = 'none';
            pendingList.innerHTML = '';
        }
    }

    const members = (sharedGroupState[trackerId]?.members || []).filter((m) => !m.isHost && m.isHost !== 1);
    listEl.innerHTML = '';

    if (members.length === 0) {
        emptyEl.style.display = 'block';
        return;
    }

    emptyEl.style.display = 'none';
    members.forEach((member) => {
        const perms = member.permissions || { canCreate: false, canUpdate: false, canDelete: false };
        const statusLabel = member.connected
            ? '<span class="ui-text-xs" style="color:var(--accent-green); font-weight:700;">● online</span>'
            : '<span class="ui-text-xs" style="color:var(--text-muted);">○ offline</span>';
        const row = document.createElement('div');
        row.className = 'perm-guest-row';
        row.style.cssText = 'border:1px solid var(--border-color); padding:10px;';
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-bottom:8px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
                    <span class="ui-text-md" style="font-weight:800;">${member.nickname}</span>
                    ${statusLabel}
                </div>
                <button class="col-action-btn remove-guest-btn" type="button" style="color:var(--elem-fire);">Remove</button>
            </div>
            <div class="ui-text-sm" style="display:flex; gap:12px; flex-wrap:wrap;">
                <label><input type="checkbox" data-perm="create" data-nick="${member.nickname}" data-tid="${trackerId}" ${perms.canCreate ? 'checked' : ''}> Create</label>
                <label><input type="checkbox" data-perm="update" data-nick="${member.nickname}" data-tid="${trackerId}" ${perms.canUpdate ? 'checked' : ''}> Update</label>
                <label><input type="checkbox" data-perm="delete" data-nick="${member.nickname}" data-tid="${trackerId}" ${perms.canDelete ? 'checked' : ''}> Delete</label>
            </div>`;
        row.querySelector('.remove-guest-btn').addEventListener('click', () => removeGuestFromGroup(trackerId, member.nickname));
        listEl.appendChild(row);
    });

    listEl.querySelectorAll('input[type="checkbox"]').forEach((box) => {
        box.addEventListener('change', onPermissionCheckboxChange);
    });
}

async function approveGuestJoin(trackerId, nickname) {
    try {
        await ShareSocket.approveGuest(trackerId, nickname);
        spawnToastNotification('Guest Approved', `${nickname} can now access the group.`, 'warn');
        refreshPermissionsPanelsIfOpen(trackerId);
        renderTimersUI();
    } catch (err) {
        spawnToastNotification(err.code || 'Error', err.message || 'Could not approve guest.', 'alarm');
    }
}

async function denyGuestJoin(trackerId, nickname) {
    try {
        await ShareSocket.denyGuest(trackerId, nickname);
        spawnToastNotification('Guest Denied', `${nickname} was not allowed to join.`, 'warn');
        refreshPermissionsPanelsIfOpen(trackerId);
        renderTimersUI();
    } catch (err) {
        spawnToastNotification(err.code || 'Error', err.message || 'Could not deny guest.', 'alarm');
    }
}

async function removeGuestFromGroup(trackerId, nickname) {
    if (!confirm(`Remove ${nickname} from this group?`)) return;
    try {
        await ShareSocket.removeGuest(trackerId, nickname);
        spawnToastNotification('Guest Removed', `${nickname} was removed.`, 'warn');
        refreshPermissionsPanelsIfOpen(trackerId);
        renderTimersUI();
    } catch (err) {
        spawnToastNotification(err.code || 'Error', err.message || 'Could not remove guest.', 'alarm');
    }
}

function onPermissionCheckboxChange(e) {
    const nick = e.target.dataset.nick;
    const tid = e.target.dataset.tid;
    const row = e.target.closest('.perm-guest-row');
    if (!row || !tid || !nick) return;

    const permissions = {
        canCreate: Boolean(row.querySelector('[data-perm="create"]')?.checked),
        canUpdate: Boolean(row.querySelector('[data-perm="update"]')?.checked),
        canDelete: Boolean(row.querySelector('[data-perm="delete"]')?.checked)
    };

    applyMemberPermissionsToState(tid, nick, permissions);

    ShareSocket.setMemberPermissions(tid, nick, permissions)
        .then(() => {
            spawnToastNotification('Permissions Saved', `${nick} updated.`, 'warn');
        })
        .catch((err) => {
            spawnToastNotification(err.code || 'Save Failed', err.message || 'Could not save permissions.', 'alarm');
            if (ShareSocket.isConnected()) {
                ShareSocket.getGroupMembers(tid).then((res) => {
                    if (sharedGroupState[tid]) sharedGroupState[tid].members = res.members || [];
                    renderPermissionsPanels(tid);
                }).catch(() => renderPermissionsPanels(tid));
            }
        });
}