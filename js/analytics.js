(function initRoXAnalytics() {
    if (window.__roxAnalyticsLoaded) return;
    if (window.location.pathname.replace(/\\/g, '/').includes('ops-console.html')) return;

    window.__roxAnalyticsLoaded = true;

    fetch('/api/public-config')
        .then((res) => (res.ok ? res.json() : null))
        .then((config) => {
            const analytics = config?.analytics;
            if (!analytics?.provider) return;

            if (analytics.provider === 'umami') {
                injectUmami(analytics);
            } else if (analytics.provider === 'cloudflare') {
                injectCloudflare(analytics);
            } else if (analytics.provider === 'plausible') {
                injectPlausible(analytics);
            }
        })
        .catch(() => {
            /* analytics optional — fail silently */
        });

    function injectUmami(analytics) {
        if (!analytics.websiteId || document.querySelector('script[data-rox-umami]')) return;
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.websiteId = analytics.websiteId;
        script.dataset.roxUmami = '1';
        script.src = analytics.scriptUrl || 'https://cloud.umami.is/script.js';
        document.head.appendChild(script);
    }

    function injectCloudflare(analytics) {
        if (!analytics.token || document.querySelector('script[data-rox-cloudflare]')) return;
        const script = document.createElement('script');
        script.defer = true;
        script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
        script.dataset.cfBeacon = JSON.stringify({ token: analytics.token });
        script.dataset.roxCloudflare = '1';
        document.head.appendChild(script);
    }

    function injectPlausible(analytics) {
        if (!analytics.domain || document.querySelector('script[data-rox-plausible]')) return;
        const script = document.createElement('script');
        script.defer = true;
        script.dataset.domain = analytics.domain;
        script.dataset.roxPlausible = '1';
        script.src = analytics.scriptUrl || 'https://plausible.io/js/script.js';
        document.head.appendChild(script);
    }
})();
