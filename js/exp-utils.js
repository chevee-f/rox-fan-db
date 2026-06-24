function getLevelGapMultiplier(monsterLevel, charLevel) {
    const gap = Math.abs(monsterLevel - charLevel);
    if (gap <= 3) return 1.0;
    if (gap <= 6) return 0.8;
    return 0.1;
}

function getOdinCost(monster) {
    const size = (monster?.type || 'Medium').toLowerCase();
    if (size === 'small') return 1;
    if (size === 'large') return 3;
    return 2;
}

function getSoloExp(monster, expKey, withOdin = false) {
    const bucket = withOdin ? 'withOdin' : 'withoutOdin';
    return monster?.exp?.solo?.[bucket]?.[expKey] ?? 0;
}

function getPenalizedSoloExp(monster, charLevel, expKey, withOdin = false) {
    const mult = getLevelGapMultiplier(monster.level, charLevel);
    return Math.floor(getSoloExp(monster, expKey, withOdin) * mult);
}

function getExpPerOdin(monster, charLevel, expKey) {
    const cost = getOdinCost(monster);
    if (!cost) return 0;
    return Math.floor(getPenalizedSoloExp(monster, charLevel, expKey, true) / cost);
}

function getBalancedScore(monster, charLevel, withOdin = false) {
    const base = getPenalizedSoloExp(monster, charLevel, 'base', withOdin);
    const job = getPenalizedSoloExp(monster, charLevel, 'job', withOdin);
    return (base + job) - Math.abs(base - job) * 0.5;
}

function getBalancedPerOdin(monster, charLevel) {
    const basePerOdin = getExpPerOdin(monster, charLevel, 'base');
    const jobPerOdin = getExpPerOdin(monster, charLevel, 'job');
    return (basePerOdin + jobPerOdin) - Math.abs(basePerOdin - jobPerOdin) * 0.5;
}

function filterByLevel(monsters, charLevel, range = 15) {
    return monsters.filter(
        (m) => typeof m.level === 'number' && m.level >= charLevel - range && m.level <= charLevel + range
    );
}

function sortByBaseExp(monsters, charLevel, withOdin = false) {
    return [...monsters].sort((a, b) => {
        const aVal = getPenalizedSoloExp(a, charLevel, 'base', withOdin);
        const bVal = getPenalizedSoloExp(b, charLevel, 'base', withOdin);
        return bVal - aVal;
    });
}

function sortByJobExp(monsters, charLevel, withOdin = false) {
    return [...monsters].sort((a, b) => {
        const aVal = getPenalizedSoloExp(a, charLevel, 'job', withOdin);
        const bVal = getPenalizedSoloExp(b, charLevel, 'job', withOdin);
        return bVal - aVal;
    });
}

function sortByBalancedExp(monsters, charLevel, withOdin = false) {
    return [...monsters].sort((a, b) => {
        return getBalancedScore(b, charLevel, withOdin) - getBalancedScore(a, charLevel, withOdin);
    });
}

function sortByBaseExpPerOdin(monsters, charLevel) {
    return [...monsters].sort((a, b) => {
        return getExpPerOdin(b, charLevel, 'base') - getExpPerOdin(a, charLevel, 'base');
    });
}

function sortByJobExpPerOdin(monsters, charLevel) {
    return [...monsters].sort((a, b) => {
        return getExpPerOdin(b, charLevel, 'job') - getExpPerOdin(a, charLevel, 'job');
    });
}

function sortByBalancedPerOdin(monsters, charLevel) {
    return [...monsters].sort((a, b) => {
        return getBalancedPerOdin(b, charLevel) - getBalancedPerOdin(a, charLevel);
    });
}
