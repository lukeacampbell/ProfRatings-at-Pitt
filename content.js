console.log('🟢 Professor Ratings extension loaded (with “?”-only links)');

(async function() {
  const csvUrl = chrome.runtime.getURL('ProfessorData.csv');
  let text;
  try {
    text = await fetch(csvUrl).then(r => r.text());
  } catch (e) {
    return;
  }
  
  const [, ...lines] = text.trim().split(/\r?\n/);
  const lookup = {};
  lines.forEach(line => {
    const [score, ...parts] = line.split(',');
    const name = parts.join(',').trim();
    if (name) lookup[name] = parseFloat(score);
  });

  function levenshtein(a,b) {
    const m=a.length, n=b.length;
    const dp=Array.from({length:m+1},()=>[]);
    for(let i=0;i<=m;i++) dp[i][0]=i;
    for(let j=0;j<=n;j++) dp[0][j]=j;
    for(let i=1;i<=m;i++){
      for(let j=1;j<=n;j++){
        dp[i][j] = Math.min(
          dp[i-1][j]+1,
          dp[i][j-1]+1,
          dp[i-1][j-1] + (a[i-1]===b[j-1]?0:1)
        );
      }
    }
    return dp[m][n];
  }

  function makeBadge(rating) {
    const span = document.createElement('span');
    span.className = 'prof-rating-badge';
    span.textContent = (rating != null && !isNaN(rating)) ? rating.toFixed(1) : '?';
    span.style.cssText = [
      'display:inline-block',
      'padding:2px 6px',
      'margin:0 4px',
      'border-radius:4px',
      'font-size:0.85em',
      'font-weight:600',
      'color:#fff'
    ].join(';');
    
    if (rating != null && !isNaN(rating)) {
      if (rating < 3) span.style.backgroundColor = 'red';
      else if (rating < 4) span.style.backgroundColor = 'orange';
      else span.style.backgroundColor = 'green';
    } else {
      span.style.backgroundColor = 'gray';
    }
    return span;
  }

  const seen = new WeakSet();

  function commonPrefix(a,b) {
    let i=0;
    while(i<a.length && i<b.length && a[i]===b[i]) i++;
    return i;
  }

  function processInstructor(cell) {
    if (seen.has(cell)) return;
    seen.add(cell);

    const span = cell.querySelector('span[aria-hidden="false"], span[aria-hidden="true"]');
    if (!span) return;
    
    const rawName = span.innerText.trim();
    const lower = rawName.toLowerCase();
    if (lower.includes('to be announced') || lower==='tba') return;

    let rating = lookup[rawName];
    let usedName = rawName;

    if (rating == null) {
      const parts = lower.split(/\s+/);
      const first = parts[0], last = parts[parts.length-1];
      const candidates = Object.keys(lookup).filter(k =>
        k.toLowerCase().split(/\s+/).pop() === last
      );
      
      if (candidates.length) {
        let best = {key: null, dist: Infinity};
        candidates.forEach(k => {
          const d = levenshtein(lower, k.toLowerCase());
          if (d < best.dist) best = {key: k, dist: d};
        });
        
        const sim = 1 - best.dist / Math.max(lower.length, best.key.length);
        const prefixLen = commonPrefix(first, best.key.toLowerCase().split(/\s+/)[0]);
        
        if (sim >= 0.7 || prefixLen >= 3) {
          rating = lookup[best.key];
          usedName = best.key;
        }
      }
    }

    const row = cell.parentElement.parentElement;
    if (!row) return;
    
    const gridcells = Array.from(row.querySelectorAll('[role="gridcell"]'));
    const placeholder = gridcells[gridcells.length-1];
    if (!placeholder) return;

    placeholder.querySelectorAll('.prof-rating-badge, .prof-rating-link').forEach(el => el.remove());

    const badge = makeBadge(rating);
    let nodeToInsert;
    
    if (rating == null) {
      const a = document.createElement('a');
      a.className = 'prof-rating-link';
      a.href = 'https://www.ratemyprofessors.com/school/1247';
      a.target = '_blank';
      a.style.textDecoration = 'none';
      a.style.color = 'inherit';
      a.appendChild(badge);
      nodeToInsert = a;
    } else {
      nodeToInsert = badge;
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
    records.forEach(r => {
      r.addedNodes.forEach(n => {
        if (!(n instanceof Element)) return;
        if (n.matches('div[header="Instructor"]')) processInstructor(n);
        if (n.querySelectorAll) {
          n.querySelectorAll('div[header="Instructor"]').forEach(processInstructor);
        }
      });
    });
  }).observe(document.body, {childList: true, subtree: true});

  setInterval(scanAll, 5000);
})();