(function initRoXAnalytics() {
    if (window.__roxAnalyticsLoaded) return;
    if (window.location.pathname.replace(/\\/g, '/').includes('ops-console.html')) return;

    window.__roxAnalyticsLoaded = true;

    fetch('/api/public-config')
        .then((res) => (res.ok ? res.json() : null))
        .then((config) => {
            const analytics = config?.analytics;
            if (!analytics?.provider) return;

            if (analytics.provider === 'plausible') {
                injectPlausible(analytics);
            } else if (analytics.provider === 'umami') {
                injectUmami(analytics);
            }
        })
        .catch(() => {
            /* analytics optional — fail silently */
        });

    function injectPlausible(analytics) {
        if (!analytics.domain || document.querySelector('script[data-rox-plausible]')) return;
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.domain = analytics.domain;
        script.dataset.roxPlausible = '1';
        script.src = analytics.scriptUrl || 'https://plausible.io/js/script.js';
        document.head.appendChild(script);
    }

    function injectUmami(analytics) {
        if (!analytics.websiteId || document.querySelector('script[data-rox-umami]')) return;
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.websiteId = analytics.websiteId;
        script.dataset.roxUmami = '1';
        script.src = analytics.scriptUrl || 'https://cloud.umami.is/script.js';
        document.head.appendChild(script);
    }
})();
