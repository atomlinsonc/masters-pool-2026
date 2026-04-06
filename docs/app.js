/* ═══════════════════════════════════════════════════════
   GFL Masters 2026 — Frontend App
═══════════════════════════════════════════════════════ */

const PLAYERS = ['Austin', 'Casey', 'Mike', 'Kenny', 'Tyler', 'Lev'];
const TOTAL_PICKS = 20;

// ── API Base URL ─────────────────────────────────────
// Read from <meta name="api-base"> — set this to your Vercel URL in index.html
const API_BASE = (() => {
  const meta = document.querySelector('meta[name="api-base"]');
  const val = meta?.content?.trim();
  // Strip trailing slash
  return val ? val.replace(/\/$/, '') : '';
})();

// ── State ────────────────────────────────────────────
let state = {
  view: 'draft',
  selectedName: null,
  draftData: null,   // { picks, draftOrder, nextPick, isComplete }
  field: [],          // available golfers
  standings: null,    // standings response
  searchQuery: '',
};

// ── Boot ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildNamePills();
  buildDraftBoardSkeleton();
  bindNav();
  loadDraft();
});

// ── Navigation ────────────────────────────────────────
function bindNav() {
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}

function switchView(view) {
  state.view = view;
  document.querySelectorAll('.view').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
  document.getElementById(`view-${view}`).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  if (view === 'standings') loadStandings();
}

// ── Name Pills ────────────────────────────────────────
function buildNamePills() {
  const container = document.getElementById('name-selector');
  PLAYERS.forEach((name) => {
    const pill = document.createElement('button');
    pill.className = 'name-pill';
    pill.textContent = name;
    pill.addEventListener('click', () => selectName(name));
    container.appendChild(pill);
  });
}

function selectName(name) {
  state.selectedName = name;
  document.querySelectorAll('.name-pill').forEach((p) => {
    p.classList.toggle('selected', p.textContent === name);
  });
  renderPickPanel();
}

// ── Draft Data ────────────────────────────────────────
async function loadDraft() {
  try {
    const res = await fetch(`${API_BASE}/api/draft`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.draftData = await res.json();
    renderDraft();

    if (!state.draftData.isComplete) {
      await loadField();
    }
  } catch (err) {
    console.error('Failed to load draft:', err);
  }
}

async function loadField() {
  try {
    const res = await fetch(`${API_BASE}/api/field`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    state.field = data.available || [];
    renderGolferGrid();
  } catch (err) {
    console.error('Failed to load field:', err);
  }
}

// ── Render Draft ──────────────────────────────────────
function renderDraft() {
  const { isComplete, nextPick, picks, draftOrder } = state.draftData || {};

  // Toggle draft complete vs active
  show('draft-complete-banner', isComplete);
  show('draft-active', !isComplete);

  if (isComplete) {
    renderDraftBoard(picks, draftOrder);
    return;
  }

  // Clock card
  if (nextPick) {
    document.getElementById('clock-pick-num').textContent =
      `Pick ${nextPick.pick} of ${TOTAL_PICKS}`;
    document.getElementById('clock-player').textContent = nextPick.player;
    document.getElementById('clock-sub').textContent =
      `Groups: ${nextPick.groups.map((g) => `G${g}`).join(', ')}`;
  }

  renderPickPanel();
  renderDraftBoard(picks, draftOrder);
}

function renderPickPanel() {
  const { nextPick } = state.draftData || {};
  if (!nextPick || !state.selectedName) {
    hide('pick-panel');
    hide('not-your-turn');
    return;
  }

  if (state.selectedName === nextPick.player) {
    show('pick-panel');
    hide('not-your-turn');
    renderGolferGrid();
  } else {
    hide('pick-panel');
    show('not-your-turn');
    document.getElementById('waiting-text').textContent =
      `It's not your turn — ${nextPick.player} is on the clock.`;
  }
}

// ── Draft Board ───────────────────────────────────────
function buildDraftBoardSkeleton() {
  const tbody = document.getElementById('draft-board-body');
  tbody.innerHTML = '';
  for (let i = 1; i <= TOTAL_PICKS; i++) {
    const tr = document.createElement('tr');
    tr.id = `draft-row-${i}`;
    tr.className = 'pending';
    tr.innerHTML = `
      <td class="pick-num">${i}</td>
      <td class="player-name">—</td>
      <td class="golfer-name">—</td>
      <td></td>
    `;
    tbody.appendChild(tr);
  }
}

function renderDraftBoard(picks = [], draftOrder = []) {
  draftOrder.forEach((def) => {
    const tr = document.getElementById(`draft-row-${def.pick}`);
    if (!tr) return;

    const pick = picks.find((p) => p.pickNumber === def.pick);
    tr.className = pick ? '' : 'pending';

    const groupBadges = def.groups
      .map((g) => `<span class="group-badge">G${g}</span>`)
      .join('');

    tr.innerHTML = `
      <td class="pick-num">${def.pick}</td>
      <td class="player-name">${def.player}</td>
      <td class="golfer-name">${pick ? pick.golfer : '—'}</td>
      <td><div class="groups-cell">${groupBadges}</div></td>
    `;
  });
}

// ── Golfer Grid ───────────────────────────────────────
function renderGolferGrid() {
  const grid = document.getElementById('golfer-grid');
  const q = state.searchQuery.toLowerCase();
  const filtered = state.field.filter((g) => g.toLowerCase().includes(q));

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;padding:0.5rem;">No golfers match your search.</p>';
    return;
  }

  filtered.forEach((golfer) => {
    const card = document.createElement('button');
    card.className = 'golfer-card';
    card.textContent = golfer;
    card.addEventListener('click', () => confirmPick(golfer));
    grid.appendChild(card);
  });
}

document.addEventListener('input', (e) => {
  if (e.target.id === 'golfer-search') {
    state.searchQuery = e.target.value;
    renderGolferGrid();
  }
});

// ── Make a Pick ───────────────────────────────────────
async function confirmPick(golfer) {
  const { nextPick } = state.draftData || {};
  if (!nextPick) return;

  const confirmed = confirm(
    `Draft ${golfer} for Pick #${nextPick.pick}?\n\nThis will count toward: ${nextPick.groups.map((g) => `Group ${g}`).join(', ')}`
  );
  if (!confirmed) return;

  try {
    const res = await fetch(`${API_BASE}/api/draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickNumber: nextPick.pick, golfer }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(`Error: ${data.error || 'Pick failed'}`);
      return;
    }

    // Clear search
    state.searchQuery = '';
    const searchEl = document.getElementById('golfer-search');
    if (searchEl) searchEl.value = '';

    // Reload
    await loadDraft();

    // If complete, switch to standings
    if (data.isComplete) {
      setTimeout(() => switchView('standings'), 600);
    }
  } catch (err) {
    alert('Network error — please try again.');
    console.error(err);
  }
}

// ── Standings ─────────────────────────────────────────
async function loadStandings() {
  const refreshBtn = document.getElementById('refresh-btn');
  refreshBtn.classList.add('loading');

  show('standings-loading');
  hide('standings-error');
  hide('groups-grid');
  hide('player-summaries');
  hide('standings-empty');

  try {
    const res = await fetch(`${API_BASE}/api/standings`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.standings = await res.json();
    renderStandings();
  } catch (err) {
    console.error('Failed to load standings:', err);
    showError('standings-error', 'Could not fetch standings. Is the server running?');
  } finally {
    hide('standings-loading');
    refreshBtn.classList.remove('loading');
  }
}

function renderStandings() {
  const data = state.standings;
  if (!data) return;

  // Meta line
  const updatedAt = new Date(data.updatedAt).toLocaleTimeString();
  const metaEl = document.getElementById('standings-meta');
  metaEl.textContent = `${data.eventName} · ${data.eventStatus} · Updated ${updatedAt}`;

  // ESPN error banner
  if (data.espnError) {
    const errEl = document.getElementById('standings-error');
    errEl.textContent = `Live data unavailable: ${data.espnError}. Showing draft order only.`;
    errEl.classList.remove('hidden');
  }

  if (!data.draftComplete && data.groups.every((g) => g.entries.length === 0)) {
    show('standings-empty');
    return;
  }

  // Group cards
  const grid = document.getElementById('groups-grid');
  grid.innerHTML = '';
  show('groups-grid');

  data.groups.forEach((group) => {
    const card = buildGroupCard(group);
    grid.appendChild(card);
  });

  // Player summaries
  renderPlayerSummaries(data.playerSummaries);
}

function buildGroupCard(group) {
  const card = document.createElement('div');
  card.className = 'group-card';

  const header = document.createElement('div');
  header.className = 'group-card-header';
  header.innerHTML = `
    <span>${group.name}</span>
    <span class="pick-count">${group.entries.length} golfers</span>
  `;

  card.appendChild(header);

  if (group.entries.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'group-empty';
    empty.textContent = 'No picks yet';
    card.appendChild(empty);
    return card;
  }

  const table = document.createElement('table');
  table.className = 'group-table';
  table.innerHTML = `
    <thead>
      <tr>
        <th>#</th>
        <th>Golfer</th>
        <th>Pos</th>
        <th>Score</th>
      </tr>
    </thead>
  `;

  const tbody = document.createElement('tbody');
  group.entries.forEach((entry, idx) => {
    const scoreClass = scoreColorClass(entry.scoreValue, entry.score);
    const thruText = entry.thru && entry.thru !== '--' ? `<br><span style="color:var(--text-light);font-size:0.7rem">Thru ${entry.thru}</span>` : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="rank">${idx + 1}</td>
      <td class="g-golfer">
        ${entry.golfer}
        <small>${entry.draftedBy}</small>
      </td>
      <td class="g-pos">${entry.position}${thruText}</td>
      <td class="g-score ${scoreClass}">${entry.score}</td>
    `;
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  card.appendChild(table);
  return card;
}

function scoreColorClass(value, display) {
  if (value === null || display === '--' || display === 'E') return 'score-even';
  if (typeof value === 'number') {
    if (value < 0) return 'score-under';
    if (value > 0) return 'score-over';
  }
  if (display?.startsWith('-')) return 'score-under';
  if (display?.startsWith('+')) return 'score-over';
  return 'score-even';
}

function renderPlayerSummaries(summaries) {
  const container = document.getElementById('player-summaries');
  container.innerHTML = '';

  const players = Object.keys(summaries).sort();
  if (players.length === 0) {
    container.innerHTML = '<p style="color:var(--text-light);font-style:italic;font-size:0.85rem;">No picks yet.</p>';
    show('player-summaries');
    return;
  }

  players.forEach((player) => {
    const picks = summaries[player];
    const card = document.createElement('div');
    card.className = 'player-summary-card';

    const headerEl = document.createElement('div');
    headerEl.className = 'player-summary-header';
    headerEl.innerHTML = `
      <span class="ps-name">${player}</span>
      <span class="ps-toggle">▾</span>
    `;

    const bodyEl = document.createElement('div');
    bodyEl.className = 'player-summary-body';

    const table = document.createElement('table');
    picks.forEach((p) => {
      const scoreClass = scoreColorClass(null, p.score);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="ps-golfer">
          ${p.golfer}
          <span style="color:var(--text-light);font-size:0.72rem;margin-left:4px">
            ${p.groups.map((g) => `G${g}`).join(' ')}
          </span>
        </td>
        <td class="ps-score ${scoreClass}">${p.score} <span style="color:var(--text-light);font-weight:400">${p.position}</span></td>
      `;
      table.appendChild(tr);
    });

    bodyEl.appendChild(table);

    headerEl.addEventListener('click', () => {
      const isOpen = bodyEl.classList.toggle('open');
      headerEl.classList.toggle('open', isOpen);
    });

    card.appendChild(headerEl);
    card.appendChild(bodyEl);
    container.appendChild(card);
  });

  show('player-summaries');
}

// ── Admin ─────────────────────────────────────────────
function toggleAdmin() {
  const panel = document.getElementById('admin-panel');
  const isHidden = panel.classList.toggle('hidden');
  if (isHidden) {
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-msg').textContent = '';
  }
}

async function adminReset() {
  const password = document.getElementById('admin-password').value;
  const msgEl = document.getElementById('admin-msg');
  msgEl.className = 'admin-msg';

  try {
    const res = await fetch(`${API_BASE}/api/admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (!res.ok) {
      msgEl.className = 'admin-msg error';
      msgEl.textContent = data.error || 'Reset failed';
      return;
    }

    msgEl.textContent = 'Draft reset! Reloading…';
    setTimeout(() => {
      toggleAdmin();
      state.selectedName = null;
      document.querySelectorAll('.name-pill').forEach((p) => p.classList.remove('selected'));
      loadDraft();
      if (state.view === 'standings') switchView('draft');
    }, 1200);
  } catch {
    msgEl.className = 'admin-msg error';
    msgEl.textContent = 'Network error';
  }
}

// ── Helpers ───────────────────────────────────────────
function show(id, condition = true) {
  const el = document.getElementById(id);
  if (!el) return;
  if (condition) el.classList.remove('hidden');
  else el.classList.add('hidden');
}

function hide(id) {
  show(id, false);
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}
