(function () {
    const STORAGE_KEY = 'ro_app_settings';
    const THEMES = ['introboys', 'dark', 'light', 'hacker', 'modern'];
    const DEFAULT_THEME = 'introboys';

    function normalizeTheme(theme) {
        return THEMES.includes(theme) ? theme : DEFAULT_THEME;
    }

    function readStoredTheme() {
        try {
            const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            if (!settings.theme) return DEFAULT_THEME;
            return normalizeTheme(settings.theme);
        } catch {
            return DEFAULT_THEME;
        }
    }

    function applyAppTheme(theme) {
        const resolved = normalizeTheme(theme);
        document.documentElement.setAttribute('data-theme', resolved);
        return resolved;
    }

    applyAppTheme(readStoredTheme());

    function syncThemeButtons() {
        const current = normalizeTheme(document.documentElement.getAttribute('data-theme'));
        document.querySelectorAll('.theme-switch-btn').forEach((btn) => {
            const choice = btn.getAttribute('data-theme-choice');
            const isActive = choice === current;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
        });
    }

    function syncThemeSelect() {
        const select = document.getElementById('setting-theme');
        if (select) {
            select.value = normalizeTheme(document.documentElement.getAttribute('data-theme'));
        }
    }

    function persistTheme(theme) {
        try {
            const settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            settings.theme = normalizeTheme(theme);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch { /* ignore */ }
    }

    function setTheme(theme) {
        const resolved = applyAppTheme(theme);
        persistTheme(resolved);
        syncThemeButtons();
        syncThemeSelect();
        return resolved;
    }

    function bindThemeButtons() {
        document.querySelectorAll('.theme-switch-btn').forEach((btn) => {
            if (btn.dataset.themeBound) return;
            btn.dataset.themeBound = '1';
            btn.addEventListener('click', () => {
                setTheme(btn.getAttribute('data-theme-choice'));
            });
        });
    }

    window.applyAppTheme = applyAppTheme;
    window.setAppTheme = setTheme;
    window.syncThemeControls = function () {
        bindThemeButtons();
        syncThemeButtons();
        syncThemeSelect();
    };

    document.addEventListener('DOMContentLoaded', syncThemeControls);
})();
