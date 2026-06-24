function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function mergeHighlightRanges(ranges) {
    if (ranges.length === 0) return [];
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged = [{ ...sorted[0] }];
    for (let i = 1; i < sorted.length; i++) {
        const prev = merged[merged.length - 1];
        const curr = sorted[i];
        if (curr.start <= prev.end) {
            prev.end = Math.max(prev.end, curr.end);
        } else {
            merged.push({ ...curr });
        }
    }
    return merged;
}

function highlightQuestionText(text, keywords) {
    const plain = String(text);
    const activeKeywords = (keywords || []).map((k) => k.trim()).filter(Boolean);
    if (activeKeywords.length === 0) return escapeHtml(plain);

    const ranges = [];
    activeKeywords.forEach((keyword) => {
        const regex = new RegExp(escapeRegExp(keyword), 'gi');
        let match;
        while ((match = regex.exec(plain)) !== null) {
            ranges.push({ start: match.index, end: match.index + match[0].length });
        }
    });

    const merged = mergeHighlightRanges(ranges);
    let html = '';
    let cursor = 0;
    merged.forEach(({ start, end }) => {
        html += escapeHtml(plain.slice(cursor, start));
        html += `<mark class="quiz-hit">${escapeHtml(plain.slice(start, end))}</mark>`;
        cursor = end;
    });
    html += escapeHtml(plain.slice(cursor));
    return html;
}

function initQuiz() {
    if (typeof masterQuizData === 'undefined') {
        console.error("Critical Runtime Error: masterQuizData stream is empty!");
        return;
    }
    
    // Wire up the live listener to the search element box
    const searchInput = document.getElementById("quiz-search");
    if(searchInput) {
        searchInput.addEventListener("input", performSearch);
    }
    
    // Initial display of data counters
    renderQuizCount(masterQuizData.length);
    renderQuizUI(masterQuizData);
}

function renderQuizCount(count) {
    const counterEl = document.getElementById('quiz-count');
    if (counterEl) {
        counterEl.innerText = `[ POOL: ${count}_QUESTIONS ]`;
    }
}

function performSearch() {
    const query = document.getElementById("quiz-search").value.toLowerCase().trim();
    
    if (query === "") {
        renderQuizUI(masterQuizData);
        renderQuizCount(masterQuizData.length);
        return;
    }

    // 1. Split the search input into individual keywords (e.g., "str inc" -> ["str", "inc"])
    const keywords = query.split(/\s+/);

    // 2. Filter rows: check if EVERY keyword matches part of the question string
    const matches = masterQuizData.filter(item => {
        const questionLower = item.question.toLowerCase();
        return keywords.every(keyword => questionLower.includes(keyword));
    });

    renderQuizUI(matches, keywords); // Pass keywords array instead of single query string
    renderQuizCount(matches.length);
}

function renderQuizUI(dataset, highlightKeywords = []) {
    const outputContainer = document.getElementById("quiz-output-view");
    if (!outputContainer) return;

    outputContainer.innerHTML = "";

    const containerDiv = document.createElement("div");
    containerDiv.className = "table-container";

    let tableHTML = `
        <h3 class="table-title title-balanced">// SEARCH_RESULTS</h3>
        <table>
            <thead>
                <tr>
                    <th style="width: 40px; text-align: center;">ID</th>
                    <th>QUESTION</th>
                    <th style="width: 120px; text-align: center;">VERDICT</th>
                </tr>
            </thead>
            <tbody>
    `;

    if (dataset.length === 0) {
        tableHTML += `<tr><td colspan="3" class="no-data">NO MATCHING QUIZ RECORDS LOCATED</td></tr>`;
    } else {
        dataset.forEach(item => {
            const displayQuestion = highlightQuestionText(item.question, highlightKeywords);

            const isTrue = item.answer.toLowerCase().includes("true") || item.answer.includes("(O)");
            const badgeClass = isTrue ? "badge-water" : "badge-fire";

            tableHTML += `
                <tr>
                    <td style="text-align: center; color: var(--text-muted); font-size: 0.7rem;">#${item.id}</td>
                    <td style="white-space: normal; line-height: 1.4;">${displayQuestion}</td>
                    <td style="text-align: center;">
                        <span class="badge ${badgeClass}" style="padding: 4px 8px; font-size: 0.75rem; width: 80px; display: inline-block;">
                            ${item.answer}
                        </span>
                    </td>
                </tr>
            `;
        });
    }

    tableHTML += `</tbody></table>`;
    containerDiv.innerHTML = tableHTML;
    outputContainer.appendChild(containerDiv);
}

// Utility function to escape special characters for highlight regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}