// Global Background State Tracking variables
let globalBackgroundInterval = null;

function getComponentBase() {
    const path = window.location.pathname.replace(/\\/g, '/');
    return path.includes('/legal/') ? '../' : '';
}

function fixRelativeLinks(container) {
    const base = getComponentBase();
    if (!base) return;
    container.querySelectorAll('[data-legal-href]').forEach((el) => {
        el.setAttribute('href', base + el.getAttribute('data-legal-href'));
    });
    container.querySelectorAll('a[href^="index.html"], a[href^="exp.html"], a[href^="quiz.html"], a[href^="timers.html"], a[href^="guides.html"], a[href^="legal/"]').forEach((el) => {
        const href = el.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('#') && !href.startsWith(base)) {
            el.setAttribute('href', base + href);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const base = getComponentBase();
    const components = [
        { url: `${base}components/header.html`, target: 'global-header', callback: syncThemeControls },
        { url: `${base}components/nav.html`, target: 'global-nav', callback: highlightActiveLink },
        { url: `${base}components/aside.html`, target: 'global-aside', callback: bootPageModule },
        { url: `${base}components/footer.html`, target: 'global-footer', callback: fixRelativeLinks }
    ];

    components.forEach(comp => {
        const container = document.getElementById(comp.target);
        if (!container) return; 

        fetch(comp.url)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to load ${comp.url}`);
                return response.text();
            })
            .then(html => {
                container.innerHTML = html;
                fixRelativeLinks(container);
                if (comp.callback) comp.callback();
            })
            .catch(err => console.error("Layout Loader Error:", err));
    });

    // START THE BACKGROUND RADAR MONITORING ENGINE
    initGlobalBackgroundMonitor();
    initMobileTabBar();
    initAnalyticsLoader();
});

function initAnalyticsLoader() {
    const base = getComponentBase();
    if (document.querySelector('script[data-rox-analytics-loader]')) return;
    const script = document.createElement('script');
    script.src = `${base}js/analytics.js`;
    script.defer = true;
    script.dataset.roxAnalyticsLoader = '1';
    document.head.appendChild(script);
}

const MOBILE_TAB_BAR_HTML = `
<a href="exp.html" id="tab-exp" class="mobile-tab-btn">
    <span class="mobile-tab-icon" aria-hidden="true">EXP</span>
    <span class="mobile-tab-label">Tier List</span>
</a>
<a href="quiz.html" id="tab-quiz" class="mobile-tab-btn">
    <span class="mobile-tab-icon" aria-hidden="true">OX</span>
    <span class="mobile-tab-label">Quiz</span>
</a>
<a href="timers.html" id="tab-timers" class="mobile-tab-btn">
    <span class="mobile-tab-icon" aria-hidden="true">⏱</span>
    <span class="mobile-tab-label">Timers</span>
    <span class="mobile-tab-badge">β</span>
</a>`;

function mountMobileTabBar(bar) {
    bar.innerHTML = MOBILE_TAB_BAR_HTML;
    fixRelativeLinks(bar);
    highlightMobileTabBar();
}

function initMobileTabBar() {
    let bar = document.getElementById('mobile-tab-bar');
    if (!bar) {
        bar = document.createElement('nav');
        bar.id = 'mobile-tab-bar';
        bar.className = 'mobile-tab-bar';
        bar.setAttribute('aria-label', 'Tools');
        document.body.appendChild(bar);
    }

    mountMobileTabBar(bar);

    const base = getComponentBase();
    fetch(`${base}components/mobile-tab-bar.html`)
        .then((response) => {
            if (!response.ok) throw new Error('Failed to load mobile tab bar');
            return response.text();
        })
        .then((html) => {
            bar.innerHTML = html;
            fixRelativeLinks(bar);
            highlightMobileTabBar();
        })
        .catch(() => {
            /* inline HTML already mounted */
        });
}

function highlightMobileTabBar() {
    const currentPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
    const file = currentPath.split('/').pop() || 'index.html';

    const map = {
        'tab-exp': file === 'exp.html',
        'tab-quiz': file === 'quiz.html',
        'tab-timers': file === 'timers.html'
    };

    Object.entries(map).forEach(([id, active]) => {
        document.getElementById(id)?.classList.toggle('active', active);
    });
}

function highlightActiveLink() {
    const currentPath = window.location.pathname.replace(/\\/g, '/').toLowerCase();
    const file = currentPath.split('/').pop() || 'index.html';

    if (file === '' || file === 'index.html') {
        document.getElementById("nav-home")?.classList.add("active");
    } else if (file === 'exp.html') {
        document.getElementById("nav-calc")?.classList.add("active");
    } else if (file === 'quiz.html') {
        document.getElementById("nav-quiz")?.classList.add("active");
    } else if (file === 'timers.html') {
        document.getElementById("nav-timers")?.classList.add("active");
    } else if (file === 'guides.html') {
        document.getElementById("nav-guides")?.classList.add("active");
    }

    highlightMobileTabBar();
}

function bootPageModule() {
    const currentPath = window.location.pathname.replace(/\\/g, '/');

    if (currentPath.includes("quiz.html")) {
        if (typeof initQuiz === "function") initQuiz();
    } else if (currentPath.includes("timers.html")) {
        if (typeof initTimers === "function") initTimers();
    } else if (currentPath.includes("guides.html")) {
        if (typeof initGuides === "function") initGuides();
    } else if (document.getElementById("char-level")) {
        if (typeof initCalculator === "function") initCalculator();
    }
}

/* ==========================================================================
   GLOBAL BACKGROUND ALARM ENGINES (WITH CONFIGURATION LOADS)
   ========================================================================== */
function initGlobalBackgroundMonitor() {
    if (globalBackgroundInterval) clearInterval(globalBackgroundInterval);
    
    globalBackgroundInterval = setInterval(() => {
        const currentPath = window.location.pathname;
        if (currentPath.includes("timers.html")) return;

        const cachedTrackers = localStorage.getItem("ro_active_trackers");
        if (!cachedTrackers) return;

        let trackers = [];
        try { trackers = JSON.parse(cachedTrackers); } catch (e) { return; }

        // Pull active custom profile rules parameters on tick intervals
        let activeProfile = 'radar';
        let activeVolume = 0.8;
        const cachedSettings = localStorage.getItem("ro_app_settings");
        if (cachedSettings) {
            try {
                const s = JSON.parse(cachedSettings);
                activeProfile = s.soundProfile;
                activeVolume = s.masterVolume;
            } catch(e) {}
        }

        let changesMade = false;

        trackers.forEach(tracker => {
            const timeLeft = tracker.endTime - Date.now();

            // 1. Silent Cross-Tab Background Warning Chime at 1 minute
            if (timeLeft <= 60000 && timeLeft > 0 && !tracker.warningTriggered) {
                tracker.warningTriggered = true;
                changesMade = true;
                
                let warnPattern = [{ freq: 650, delay: 0.0, dur: 0.1 }, { freq: 650, delay: 0.15, dur: 0.1 }];
                if (activeProfile === 'pulse') warnPattern = [{ freq: 300, delay: 0.0, dur: 0.2 }, { freq: 300, delay: 0.25, dur: 0.2 }];
                if (activeProfile === 'digital') warnPattern = [{ freq: 1500, delay: 0.0, dur: 0.05 }, { freq: 1500, delay: 0.08, dur: 0.05 }];
                
                playGlobalBackgroundChime(warnPattern, activeProfile, activeVolume);

                if (localStorage.getItem("ro_app_settings") && JSON.parse(localStorage.getItem("ro_app_settings")).desktopNotifications && Notification.permission === "granted") {
                    new Notification(`⚠️ Spawn Warning: ${tracker.name}`, { body: "Less than 60 seconds remaining!", tag: tracker.id + "-warn" });
                }
            }

            // 2. Cross-Tab Background Spawn Alarm Notification
            if (timeLeft <= 0 && !tracker.alarmTriggered) {
                tracker.alarmTriggered = true;
                changesMade = true;
                
                let alarmPattern = [{ freq: 880, delay: 0.0, dur: 0.12 }, { freq: 880, delay: 0.15, dur: 0.12 }, { freq: 1200, delay: 0.3, dur: 0.25 }];
                if (activeProfile === 'pulse') alarmPattern = [{ freq: 400, delay: 0.0, dur: 0.3 }, { freq: 350, delay: 0.35, dur: 0.5 }];
                if (activeProfile === 'digital') alarmPattern = [{ freq: 1800, delay: 0.0, dur: 0.1 }, { freq: 1800, delay: 0.12, dur: 0.1 }, { freq: 1800, delay: 0.24, dur: 0.3 }];

                playGlobalBackgroundChime(alarmPattern, activeProfile, activeVolume);

                // Use Desktop Push if active, else fall back to basic blocking alert framework
                if (localStorage.getItem("ro_app_settings") && JSON.parse(localStorage.getItem("ro_app_settings")).desktopNotifications && Notification.permission === "granted") {
                    new Notification(`🚨 SPAWN ALERT: ${tracker.name}`, { body: "Target has spawned! Check field zones immediately.", tag: tracker.id + "-spawn" });
                } else {
                    setTimeout(() => {
                        alert(`🚨 [BACKGROUND SPAWN ALERT]\n\nYour tracked target "${tracker.name.toUpperCase()}" [${tracker.type || 'UNCLASSIFIED'}] has spawned!`);
                    }, 50);
                }
            }
        });

        if (changesMade) {
            localStorage.setItem("ro_active_trackers", JSON.stringify(trackers));
        }
    }, 1000);
}

function playGlobalBackgroundChime(pattern, profile, volume) {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        if (!audioCtx) return;

        let startTime = audioCtx.currentTime;

        pattern.forEach((note) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            if (profile === 'pulse') osc.type = 'triangle';
            else if (profile === 'digital') osc.type = 'square';
            else osc.type = 'sine';

            osc.frequency.setValueAtTime(note.freq, startTime + note.delay);
            gainNode.gain.setValueAtTime(volume * 0.15, startTime + note.delay);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + note.delay + note.dur - 0.02);

            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            osc.start(startTime + note.delay);
            osc.stop(startTime + note.delay + note.dur);
        });
    } catch (e) {
        console.warn("Background audio context initialization bypassed.");
    }
}
