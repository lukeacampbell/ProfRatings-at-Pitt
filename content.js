(async function() {
  const csvUrl = chrome.runtime.getURL('ProfessorData.csv');
  let text;
  try {
    text = await fetch(csvUrl).then(r => r.text());
  } catch (e) {
    return;
  }

  
  const lines = text.trim().split(/\r?\n/).slice(1);
  const lookup = {}; 
  lines.forEach(line => {
    const [scoreStr, name, url] = line.split(',');
    const score = parseFloat(scoreStr);
    if (name) {
      lookup[name.trim()] = {
        rating: isNaN(score) ? null : score,
        url: (url || '').trim()
      };
    }
  });

  function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const dp = Array.from({ length: m + 1 }, () => []);
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
      }
    }
    return dp[m][n];
  }

  function makeBadge(r) {
    const span = document.createElement('span');
    span.className = 'prof-rating-badge';
    span.textContent = (r != null && !isNaN(r)) ? r.toFixed(1) : '?';
    span.style.cssText = [
      'display:inline-block',
      'padding:2px 6px',
      'margin:0 4px',
      'border-radius:4px',
      'font-size:0.85em',
      'font-weight:600',
      'color:#fff'
    ].join(';');
    span.style.backgroundColor = (r != null && !isNaN(r))
      ? (r < 3   ? 'red'
         : r < 4 ? 'orange'
         : 'green')
      : 'gray';
    return span;
  }

  const seen = new WeakSet();

  function commonPrefix(a, b) {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }

  function processInstructor(cell) {
    if (seen.has(cell)) return;
    seen.add(cell);

    const spanEl = cell.querySelector('span[aria-hidden="false"], span[aria-hidden="true"]');
    if (!spanEl) return;
    const rawName = spanEl.textContent.trim();
    const lower = rawName.toLowerCase();
    if (lower.includes('to be announced') || lower === 'tba') return;

    let entry = lookup[rawName];
    let usedName = rawName;

    if (!entry) {
      const parts = lower.split(/\s+/);
      const first = parts[0], last = parts[parts.length - 1];

      const candidates = Object.keys(lookup).filter(k => {
        const kl = k.toLowerCase().split(/\s+/).pop();
        return kl === last;
      });

      if (candidates.length) {
        let best = { key: null, dist: Infinity };
        candidates.forEach(k => {
          const d = levenshtein(lower, k.toLowerCase());
          if (d < best.dist) best = { key: k, dist: d };
        });
        const sim = 1 - best.dist / Math.max(lower.length, best.key.length);
        const prefixLen = commonPrefix(first, best.key.toLowerCase().split(/\s+/)[0]);

        if (sim >= 0.7) {
          entry = lookup[best.key];
          usedName = best.key;
        } else if (prefixLen >= 3) {
          entry = lookup[best.key];
          usedName = best.key;
        }
      }
    }

    const row = cell.parentElement?.parentElement;
    if (!row) return;
    const gridcells = Array.from(row.querySelectorAll('[role="gridcell"]'));
    const placeholder = gridcells[gridcells.length - 1];
    if (!placeholder) return;

    placeholder.querySelectorAll('.prof-rating-badge, .prof-rating-link').forEach(el => el.remove());

    const rating = entry?.rating ?? null;
    const badge = makeBadge(rating);

    let nodeToInsert;
    if (entry && entry.url) {
      const a = document.createElement('a');
      a.className = 'prof-rating-link';
      a.href = entry.url;
      a.target = '_blank';
      a.style.textDecoration = 'none';
      a.style.color = 'inherit';
      a.appendChild(badge);
      nodeToInsert = a;
    } else {
      const a = document.createElement('a');
      a.className = 'prof-rating-link';
      a.href = 'https://www.ratemyprofessors.com/school/1247';
      a.target = '_blank';
      a.style.textDecoration = 'none';
      a.style.color = 'inherit';
      a.appendChild(badge);
      nodeToInsert = a;
    }

    const dotBtn = placeholder.querySelector('button[class*="IconButton"]');
    if (dotBtn && dotBtn.parentNode) {
      dotBtn.parentNode.insertBefore(nodeToInsert, dotBtn);
    } else {
      placeholder.appendChild(nodeToInsert);
    }
  }

  function scanAll() {
    const cells = document.querySelectorAll('div[header="Instructor"]');
    cells.forEach(processInstructor);
  }
  scanAll();

  new MutationObserver(records => {
    records.forEach(record => {
      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node.matches('div[header="Instructor"]')) processInstructor(node);
        node.querySelectorAll && node.querySelectorAll('div[header="Instructor"]').forEach(processInstructor);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  setInterval(scanAll, 5000);
})();
