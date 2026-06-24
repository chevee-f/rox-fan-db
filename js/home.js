function renderChangelogMarkdown(markdown) {
    const lines = markdown.split('\n');
    let html = '';
    let inList = false;

    const closeList = () => {
        if (inList) {
            html += '</ul>';
            inList = false;
        }
    };

    for (const raw of lines) {
        const line = raw.trimEnd();
        if (!line.trim()) {
            closeList();
            continue;
        }
        if (line.startsWith('# ')) {
            closeList();
            continue;
        }
        if (line.startsWith('## ')) {
            closeList();
            html += `<h3 class="changelog-version">${escapeHtml(line.slice(3))}</h3>`;
            continue;
        }
        if (line.startsWith('### ')) {
            closeList();
            html += `<h4 class="changelog-section">${escapeHtml(line.slice(4))}</h4>`;
            continue;
        }
        if (line.startsWith('- ')) {
            if (!inList) {
                html += '<ul class="changelog-list">';
                inList = true;
            }
            html += `<li>${escapeHtml(line.slice(2))}</li>`;
            continue;
        }
        closeList();
        html += `<p>${escapeHtml(line)}</p>`;
    }

    closeList();
    return html;
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function initHomepage() {
    const container = document.getElementById('changelog-body');
    if (!container) return;

    const base = window.location.pathname.replace(/\\/g, '/').includes('/legal/') ? '../' : '';
    fetch(`${base}CHANGELOG.md`)
        .then((response) => {
            if (!response.ok) throw new Error('Changelog not found');
            return response.text();
        })
        .then((markdown) => {
            container.innerHTML = renderChangelogMarkdown(markdown);
        })
        .catch(() => {
            container.innerHTML = '<p class="no-data">Changelog could not be loaded.</p>';
        });
}

document.addEventListener('DOMContentLoaded', initHomepage);
