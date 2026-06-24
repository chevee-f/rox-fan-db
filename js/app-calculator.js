const EXP_TOP_LIMIT = 5;
const SHOW_BALANCED_TABLES = false;

function initCalculator() {
    if (typeof masterMonsterData === 'undefined') {
        console.error("Critical Runtime Error: masterMonsterData stream is empty!");
        return;
    }

    document.getElementById('monster-count').innerText = `[ LOADED: ${masterMonsterData.length}_MONSTERS ]`;
    loadSavedInputs();
    updateTables();
}

function generateHTMLTable(title, titleClass, list, myLevel, options = {}) {
    const { perOdinKey = 'job' } = options;
    const perOdinHeader = perOdinKey === 'base' ? 'BASE/OD' : (perOdinKey === 'balanced' ? 'BAL/OD' : 'JOB/OD');
    const colCount = 10;

    let html = `
        <div class="table-container">
            <h3 class="table-title ${titleClass}">// ${title}</h3>
            <table>
                <thead>
                    <tr>
                        <th>NAME</th>
                        <th style="width: 25px; text-align: center;">LV</th>
                        <th style="width: 35px; text-align: center;">EFF</th>
                        <th style="width: 50px; text-align: center;">SIZE</th>
                        <th style="width: 55px; text-align: center;">ELEM</th>
                        <th>BASE</th>
                        <th>JOB</th>
                        <th>O-JOB</th>
                        <th>${perOdinHeader}</th>
                    </tr>
                </thead>
                <tbody>
    `;

    if (list.length === 0) {
        html += `<tr><td colspan="${colCount}" class="no-data">NO RECORDS MATCH FILTERS</td></tr>`;
    } else {
        list.forEach((m, index) => {
            const rankClass = index === 0 ? 'exp-rank-1' : (index === 1 ? 'exp-rank-2' : (index === 2 ? 'exp-rank-3' : ''));
            const mult = getLevelGapMultiplier(m.level, myLevel);
            const calculatedBase = getPenalizedSoloExp(m, myLevel, 'base', false);
            const calculatedJob = getPenalizedSoloExp(m, myLevel, 'job', false);
            const odinBase = getPenalizedSoloExp(m, myLevel, 'base', true);
            const odinJob = getPenalizedSoloExp(m, myLevel, 'job', true);
            const perOdinValue = perOdinKey === 'base'
                ? getExpPerOdin(m, myLevel, 'base')
                : (perOdinKey === 'balanced'
                    ? Math.round(getBalancedPerOdin(m, myLevel))
                    : getExpPerOdin(m, myLevel, 'job'));

            const avatarHTML = m.image
                ? `<img class="monster-avatar" src="${m.image}" alt="" loading="lazy">`
                : `<div class="monster-avatar-fallback">N/A</div>`;

            const sizeStr = m.type || 'Medium';
            const sizeClass = `badge-${sizeStr.toLowerCase()}`;
            const elemStr = m.element || 'Neutral';
            const elemClass = `badge-${elemStr.toLowerCase()}`;

            const effText = `${Math.round(mult * 100)}%`;
            const effClass = mult === 1.0 ? 'eff-100' : (mult === 0.8 ? 'eff-80' : 'eff-10');
            const effSymbol = mult === 1.0 ? '▬' : '▼';

            html += `
                <tr class="${rankClass}">
                    <td><div class="monster-cell">${avatarHTML}<strong>${m.name}</strong></div></td>
                    <td style="text-align: center; color: var(--text-muted);">${m.level}</td>
                    <td style="text-align: center; font-size: 0.7rem;" class="${effClass}">${effSymbol} ${effText}</td>
                    <td style="text-align: center;"><span class="badge ${sizeClass}">${sizeStr.substring(0, 3)}</span></td>
                    <td style="text-align: center;"><span class="badge ${elemClass}">${elemStr}</span></td>
                    <td style="color: var(--accent-orange); font-weight: 700;">${calculatedBase}</td>
                    <td style="color: var(--accent-yellow); font-weight: 700;">${calculatedJob}</td>
                    <td style="color: var(--accent-orange); font-weight: 600; opacity: 0.85;">${odinBase}</td>
                    <td style="color: var(--accent-yellow); font-weight: 600; opacity: 0.85;">${odinJob}</td>
                    <td style="color: var(--accent-blue); font-weight: 800;">${perOdinValue}</td>
                </tr>
            `;
        });
    }
    html += `</tbody></table></div>`;
    return html;
}

function updateRightSidePanels(selection, myLevel) {
    const locBox = document.getElementById("right-locations-box");
    const metaBox = document.getElementById("right-meta-box");

    if (!locBox || !metaBox) return;

    if (!selection || selection.length === 0) {
        locBox.innerHTML = `<li class="no-data">NO RECS</li>`;
        metaBox.innerHTML = `<li class="no-data">NO RECS</li>`;
        return;
    }

    const topTargets = sortByBalancedExp(selection, myLevel, false).slice(0, 5);

    let locHTML = "";
    let metaHTML = "";

    topTargets.forEach(m => {
        locHTML += `
            <li class="meta-item">
                <strong>${m.name}</strong>
                <span class="val">${m.location || 'Unknown Zone'}</span>
            </li>
        `;
        metaHTML += `
            <li class="meta-item">
                <strong>${m.name}</strong>
                <span class="val">${m.element || 'None'} / ${m.race || 'None'}</span>
            </li>
        `;
    });

    locBox.innerHTML = locHTML;
    metaBox.innerHTML = metaHTML;
}

function appendTableGroup(sectionHTML, expMode, selection, myLevel, options) {
    const {
        prefix,
        sortBase,
        sortJob,
        sortBalanced,
        odinMode = false
    } = options;

    if (expMode === "All" || expMode === "Base") {
        const topBase = sortBase(selection, myLevel).slice(0, EXP_TOP_LIMIT);
        const title = odinMode ? `${prefix}_BASE (BASE/ODIN RANK)` : `${prefix}_BASE (PENALIZED)`;
        sectionHTML += generateHTMLTable(title, "title-base", topBase, myLevel, {
            perOdinKey: odinMode ? 'base' : 'job'
        });
    }
    if (expMode === "All" || expMode === "Job") {
        const topJob = sortJob(selection, myLevel).slice(0, EXP_TOP_LIMIT);
        const title = odinMode ? `${prefix}_JOB (JOB/ODIN RANK)` : `${prefix}_JOB (PENALIZED)`;
        sectionHTML += generateHTMLTable(title, "title-job", topJob, myLevel, {
            perOdinKey: 'job'
        });
    }
    if (SHOW_BALANCED_TABLES && (expMode === "All" || expMode === "Balanced")) {
        const topBalanced = sortBalanced(selection, myLevel).slice(0, EXP_TOP_LIMIT);
        const title = odinMode ? `${prefix}_BALANCED (ODIN EFF)` : `${prefix}_BALANCED (PENALIZED)`;
        sectionHTML += generateHTMLTable(title, "title-balanced", topBalanced, myLevel, {
            perOdinKey: odinMode ? 'balanced' : 'job'
        });
    }

    return sectionHTML;
}

function renderUI(monsters, myLevel, sizeFilter, elementFilter, raceFilter, expMode) {
    const outputContainer = document.getElementById("output-view");
    if (!outputContainer) return;

    outputContainer.innerHTML = "";
    let finalSelection = filterByLevel(monsters, myLevel, 15);

    if (sizeFilter !== "All") {
        finalSelection = finalSelection.filter(m => m.type && m.type.toLowerCase() === sizeFilter.toLowerCase());
    }
    if (elementFilter !== "All") {
        finalSelection = finalSelection.filter(m => m.element && m.element.toLowerCase() === elementFilter.toLowerCase());
    }
    if (raceFilter !== "All") {
        finalSelection = finalSelection.filter(m => m.race && m.race.toLowerCase() === raceFilter.toLowerCase());
    }

    let displayTitle = `TARGET // RUNTIME_POOL <span>(${finalSelection.length} matches)</span>`;
    updateRightSidePanels(finalSelection, myLevel);

    const section = document.createElement("div");
    section.className = "view-section";
    let sectionHTML = `<h2 class="view-title">${displayTitle}</h2>`;

    if (finalSelection.length === 0) {
        sectionHTML += `<p class="no-data">NO ENTRIES MATCH ALL CRITERIA FOR LEVEL ${myLevel}</p>`;
        section.innerHTML = sectionHTML;
        outputContainer.appendChild(section);
        return;
    }

    const isSingleView = expMode !== "All";
    sectionHTML += `<div class="tables-grid ${isSingleView ? 'single-view' : ''}">`;
    sectionHTML = appendTableGroup(sectionHTML, expMode, finalSelection, myLevel, {
        prefix: 'TOP_5',
        sortBase: (list, level) => sortByBaseExp(list, level, false),
        sortJob: (list, level) => sortByJobExp(list, level, false),
        sortBalanced: (list, level) => sortByBalancedExp(list, level, false),
        odinMode: false
    });
    sectionHTML += `</div>`;

    sectionHTML += `
        <h2 class="view-title odin-section-title">ODIN // EXP_PER_POINT <span>(small 1 · medium 2 · large 3)</span></h2>
        <div class="tables-grid ${isSingleView ? 'single-view' : ''} odin-section">
    `;
    sectionHTML = appendTableGroup(sectionHTML, expMode, finalSelection, myLevel, {
        prefix: 'ODIN_TOP_5',
        sortBase: sortByBaseExpPerOdin,
        sortJob: sortByJobExpPerOdin,
        sortBalanced: sortByBalancedPerOdin,
        odinMode: true
    });
    sectionHTML += `</div>`;

    section.innerHTML = sectionHTML;
    outputContainer.appendChild(section);
}

function loadSavedInputs() {
    const savedLevel = localStorage.getItem("monster_calc_level");
    const savedSize = localStorage.getItem("monster_calc_size");
    const savedElement = localStorage.getItem("monster_calc_element");
    const savedRace = localStorage.getItem("monster_calc_race");
    const savedMode = localStorage.getItem("monster_calc_mode");

    if (savedLevel !== null) document.getElementById("char-level").value = savedLevel;
    if (savedSize !== null) document.getElementById("size-type").value = savedSize;
    if (savedElement !== null) document.getElementById("element-type").value = savedElement;
    if (savedRace !== null) document.getElementById("race-type").value = savedRace;
    if (savedMode !== null) {
        const modeEl = document.getElementById("exp-mode");
        modeEl.value = savedMode === 'Balanced' ? 'All' : savedMode;
    }
}

function updateTables() {
    const levelInput = document.getElementById("char-level").value;
    const currentLevel = Number(levelInput) || 1;
    const sizeSelect = document.getElementById("size-type").value;
    const elementSelect = document.getElementById("element-type").value;
    const raceSelect = document.getElementById("race-type").value;
    const modeSelect = document.getElementById("exp-mode").value;

    localStorage.setItem("monster_calc_level", levelInput);
    localStorage.setItem("monster_calc_size", sizeSelect);
    localStorage.setItem("monster_calc_element", elementSelect);
    localStorage.setItem("monster_calc_race", raceSelect);
    localStorage.setItem("monster_calc_mode", modeSelect);

    renderUI(masterMonsterData, currentLevel, sizeSelect, elementSelect, raceSelect, modeSelect);
}
