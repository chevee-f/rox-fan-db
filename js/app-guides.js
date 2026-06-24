const GUIDE_EARLY_START = 20;
const GUIDE_TABLE_START = 30;
const GUIDE_TABLE_END = 150;
const EARLY_JOB_EXP_MOB = 'Poison Spore';

function mapMonsterPick(m, charLevel, expKey, useOdin = false) {
    const mult = getLevelGapMultiplier(m.level, charLevel);
    const rawValue = getSoloExp(m, expKey, false);
    const penalizedValue = Math.floor(rawValue * mult);
    const jobPerOdin = getExpPerOdin(m, charLevel, 'job');
    const basePerOdin = getExpPerOdin(m, charLevel, 'base');
    const expPerOdin = expKey === 'job' ? jobPerOdin : basePerOdin;
    const sortValue = useOdin ? expPerOdin : penalizedValue;

    return {
        name: m.name,
        level: m.level,
        location: m.location || 'Unknown',
        image: m.image || '',
        cardImage: findCardArtForMonster(m.name),
        rawValue,
        penalizedValue,
        odinJob: getPenalizedSoloExp(m, charLevel, 'job', true),
        odinBase: getPenalizedSoloExp(m, charLevel, 'base', true),
        jobPerOdin,
        basePerOdin,
        expPerOdin,
        sortValue,
        efficiency: Math.round(mult * 100),
        odinCost: getOdinCost(m)
    };
}

function getTopExpTargets(monsters, charLevel, expKey, limit = 3, useOdin = false) {
    return filterByLevel(monsters, charLevel, 15)
        .map((m) => mapMonsterPick(m, charLevel, expKey, useOdin))
        .filter((row) => row.sortValue > 0)
        .sort((a, b) => b.sortValue - a.sortValue)
        .slice(0, limit);
}

function findMonsterByName(name) {
    return masterMonsterData.find((m) => m.name === name) || null;
}

function findCardArtForMonster(monsterName) {
    const cardEntry = masterMonsterData.find((m) => m.name === `${monsterName} Card`);
    return cardEntry?.image || '';
}

function formatEfficiency(pct) {
    if (pct === 100) return '100%';
    if (pct === 80) return '80%';
    return '10%';
}

function formatLevelLabel(start, end) {
    return start === end ? `${start}` : `${start}–${end}`;
}

function formatNumericRange(values) {
    const nums = values.filter((value) => typeof value === 'number');
    if (!nums.length) return '—';
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    return min === max ? min.toLocaleString() : `${min.toLocaleString()}–${max.toLocaleString()}`;
}

function formatEfficiencyRange(values) {
    const labels = [...new Set(values.map((value) => formatEfficiency(value)))];
    return labels.length === 1 ? labels[0] : labels.join(' / ');
}

function buildMonsterAvatarHtml(image, className = 'guides-monster-avatar') {
    if (image) {
        return `<img class="${className}" src="${image}" alt="" loading="lazy">`;
    }
    return `<div class="${className} guides-avatar-fallback">?</div>`;
}

function buildMonsterNameCell(mob) {
    if (!mob) {
        return '<span class="guides-empty">No targets in range</span>';
    }

    return `
        <div class="monster-cell guides-monster-cell">
            ${buildMonsterAvatarHtml(mob.image)}
            <span><strong>${mob.name}</strong> <span class="guides-mob-lv">Lv ${mob.level}</span></span>
        </div>
    `;
}

function buildCardNameCell(cardName, cardImage, monsterImage) {
    const image = cardImage || monsterImage;
    return `
        <div class="monster-cell guides-monster-cell">
            ${buildMonsterAvatarHtml(image, 'guides-card-avatar')}
            <span><strong>${cardName}</strong></span>
        </div>
    `;
}

function getPoisonSporeMob() {
    return findMonsterByName(EARLY_JOB_EXP_MOB);
}

function buildEarlyJobRow(earlyStart, earlyEnd, useOdin = false) {
    const mob = getPoisonSporeMob();
    const levelLabel = formatLevelLabel(earlyStart, earlyEnd);
    const colSpan = 8;
    const midLevel = Math.floor((earlyStart + earlyEnd) / 2);

    if (!mob) {
        return `
            <tr class="guides-static-row">
                <td class="guides-level-cell">${levelLabel}</td>
                <td colspan="${colSpan - 1}" class="guides-empty">${EARLY_JOB_EXP_MOB} (not in database)</td>
            </tr>
        `;
    }

    const pick = mapMonsterPick(mob, midLevel, 'job', false);
    const primaryValue = useOdin ? pick.jobPerOdin : pick.penalizedValue;
    const compareValue = useOdin ? pick.penalizedValue : pick.jobPerOdin;

    return `
        <tr class="guides-static-row">
            <td class="guides-level-cell">${levelLabel}</td>
            <td>${buildMonsterNameCell(pick)}</td>
            <td>${mob.location || 'Unknown'}</td>
            <td class="guides-exp-cell ${useOdin ? 'guides-exp-cell--per-odin' : 'guides-exp-cell--job'}">${primaryValue.toLocaleString()}</td>
            <td class="guides-exp-cell guides-exp-cell--odin">${pick.odinJob.toLocaleString()}</td>
            <td class="guides-exp-cell ${useOdin ? 'guides-exp-cell--job' : 'guides-exp-cell--per-odin'}">${compareValue.toLocaleString()}</td>
            <td class="guides-eff-cell">—</td>
            <td class="guides-alt-cell">—</td>
        </tr>
    `;
}

function getBestPickForLevel(level, expKey, useOdin = false) {
    const picks = getTopExpTargets(masterMonsterData, level, expKey, 3, useOdin);
    return {
        level,
        best: picks[0] || null,
        alternates: picks.slice(1)
    };
}

function groupByBestMonster(entries) {
    if (!entries.length) return [];

    const groups = [];
    let current = {
        start: entries[0].level,
        end: entries[0].level,
        entries: [entries[0]],
        monsterName: entries[0].best?.name ?? null
    };

    for (let i = 1; i < entries.length; i += 1) {
        const entry = entries[i];
        const monsterName = entry.best?.name ?? null;

        if (monsterName && monsterName === current.monsterName) {
            current.end = entry.level;
            current.entries.push(entry);
        } else {
            groups.push(current);
            current = {
                start: entry.level,
                end: entry.level,
                entries: [entry],
                monsterName
            };
        }
    }

    groups.push(current);
    return groups;
}

function buildGroupedExpRow(group, expKey, useOdin = false) {
    const levelLabel = formatLevelLabel(group.start, group.end);
    const best = group.entries[0].best;
    const alternates = group.entries[0].alternates;
    const valueClass = expKey === 'job' ? 'guides-exp-cell--job' : 'guides-exp-cell--base';
    const perOdinKey = expKey === 'job' ? 'jobPerOdin' : 'basePerOdin';
    const odinKillKey = expKey === 'job' ? 'odinJob' : 'odinBase';
    const expValues = group.entries.map((entry) => (
        useOdin ? entry.best?.[perOdinKey] : entry.best?.penalizedValue
    ));
    const odinKillValues = group.entries.map((entry) => entry.best?.[odinKillKey]);
    const compareValues = group.entries.map((entry) => (
        useOdin ? entry.best?.penalizedValue : entry.best?.[perOdinKey]
    ));
    const effValues = group.entries.map((entry) => entry.best?.efficiency);
    const colSpan = 8;

    if (!best) {
        return `
            <tr>
                <td class="guides-level-cell">${levelLabel}</td>
                <td colspan="${colSpan - 1}" class="guides-empty">No targets in range</td>
            </tr>
        `;
    }

    const altMetric = useOdin ? perOdinKey : 'penalizedValue';
    const primaryClass = useOdin ? 'guides-exp-cell--per-odin' : valueClass;
    const compareClass = useOdin ? valueClass : 'guides-exp-cell--per-odin';

    return `
        <tr>
            <td class="guides-level-cell">${levelLabel}</td>
            <td>${buildMonsterNameCell(best)}</td>
            <td>${best.location}</td>
            <td class="guides-exp-cell ${primaryClass}">${formatNumericRange(expValues)}</td>
            <td class="guides-exp-cell guides-exp-cell--odin">${formatNumericRange(odinKillValues)}</td>
            <td class="guides-exp-cell ${compareClass}">${formatNumericRange(compareValues)}</td>
            <td class="guides-eff-cell">${formatEfficiencyRange(effValues)}</td>
            <td class="guides-alt-cell">${alternates.length
                ? alternates.map((m) => `${m.name} (${m[altMetric].toLocaleString()})`).join('<br>')
                : '—'}</td>
        </tr>
    `;
}

function renderExpGuideTable(expKey, tbodyId, odinTbodyId, metaId, odinMetaId, options = {}) {
    const {
        earlyStart = GUIDE_EARLY_START,
        tableStart = GUIDE_TABLE_START,
        endLevel = GUIDE_TABLE_END,
        staticEarlyJob = false
    } = options;

    const tbody = document.getElementById(tbodyId);
    const odinTbody = document.getElementById(odinTbodyId);
    const metaEl = document.getElementById(metaId);
    const odinMetaEl = document.getElementById(odinMetaId);
    if (!tbody || typeof masterMonsterData === 'undefined') return;

    const buildRows = (useOdin) => {
        const rows = [];
        if (staticEarlyJob && expKey === 'job' && earlyStart < tableStart) {
            rows.push(buildEarlyJobRow(earlyStart, tableStart - 1, useOdin));
        }

        const loopStart = staticEarlyJob && expKey === 'job' ? tableStart : earlyStart;
        const entries = [];
        for (let level = loopStart; level <= endLevel; level += 1) {
            entries.push(getBestPickForLevel(level, expKey, useOdin));
        }

        groupByBestMonster(entries).forEach((group) => {
            rows.push(buildGroupedExpRow(group, expKey, useOdin));
        });

        return { rows, loopStart };
    };

    const withoutOdin = buildRows(false);
    tbody.innerHTML = withoutOdin.rows.join('');

    if (odinTbody) {
        const withOdin = buildRows(true);
        odinTbody.innerHTML = withOdin.rows.join('');
    }

    const label = expKey === 'job' ? 'JOB EXP' : 'BASE EXP';
    const perOdinLabel = expKey === 'job' ? 'JOB/ODIN' : 'BASE/ODIN';
    const earlyNote = staticEarlyJob && expKey === 'job'
        ? `${earlyStart}–${tableStart - 1} · ${EARLY_JOB_EXP_MOB.toUpperCase()} · `
        : '';

    if (metaEl) {
        metaEl.textContent = `[ ${label} · NO ODIN · ${earlyNote}${withoutOdin.loopStart}–${endLevel} · SOLO · ±15 LV WINDOW ]`;
    }
    if (odinMetaEl) {
        odinMetaEl.textContent = `[ ${label} · ${perOdinLabel} RANK · ${earlyNote}${withoutOdin.loopStart}–${endLevel} · SOLO · SMALL 1 / MEDIUM 2 / LARGE 3 ODIN ]`;
    }
}

function parseFarmLevelMin(farmLevel) {
    const match = String(farmLevel).match(/(\d+)/);
    return match ? Number(match[1]) : 999;
}

function renderCardsGuideTable() {
    const tbody = document.getElementById('cards-guide-body');
    const metaEl = document.getElementById('cards-guide-meta');
    if (!tbody || typeof guidesCardData === 'undefined') {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" class="no-data">Card data failed to load.</td></tr>';
        }
        return;
    }

    const sorted = [...guidesCardData].sort(
        (a, b) => parseFarmLevelMin(a.farmLevel) - parseFarmLevelMin(b.farmLevel)
    );

    tbody.innerHTML = sorted.map((entry) => {
        const mob = findMonsterByName(entry.monster);
        const cardImage = findCardArtForMonster(entry.monster);
        const mobCell = mob
            ? buildMonsterNameCell(mob)
            : `<strong>${entry.monster}</strong>`;

        return `
            <tr>
                <td>${buildCardNameCell(entry.card, cardImage, mob?.image)}</td>
                <td>${mobCell}</td>
                <td>${mob?.location || '—'}</td>
                <td class="guides-level-cell">${entry.farmLevel}</td>
                <td class="guides-drop-cell">${entry.dropRate}</td>
            </tr>
        `;
    }).join('');

    if (metaEl) {
        metaEl.textContent = `[ ${sorted.length} CARDS · DROP RATES ARE ESTIMATES · VERIFY IN-GAME ]`;
    }
}

function switchGuidesTab(tabId) {
    document.querySelectorAll('.guides-tab').forEach((btn) => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });

    document.querySelectorAll('.guides-panel').forEach((panel) => {
        panel.classList.toggle('active', panel.id === `guides-panel-${tabId}`);
    });
}

function initGuidesTabs() {
    document.querySelectorAll('.guides-tab').forEach((btn) => {
        btn.addEventListener('click', () => switchGuidesTab(btn.dataset.tab));
    });
}

function initGuides() {
    if (window.__guidesInitialized) return;

    if (typeof masterMonsterData === 'undefined') {
        console.error('Guides: masterMonsterData is not loaded.');
        ['job-exp-guide-body', 'base-exp-guide-body', 'job-exp-guide-odin-body', 'base-exp-guide-odin-body'].forEach((id) => {
            const tbody = document.getElementById(id);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="8" class="no-data">Monster database failed to load.</td></tr>';
            }
        });
        return;
    }

    window.__guidesInitialized = true;
    initGuidesTabs();

    renderExpGuideTable('job', 'job-exp-guide-body', 'job-exp-guide-odin-body', 'job-exp-guide-meta', 'job-exp-guide-odin-meta', {
        staticEarlyJob: true
    });
    renderExpGuideTable('base', 'base-exp-guide-body', 'base-exp-guide-odin-body', 'base-exp-guide-meta', 'base-exp-guide-odin-meta');
    renderCardsGuideTable();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGuides);
} else {
    initGuides();
}
