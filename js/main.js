const CONFIG = {
  slug: 'orbit-rituals',
  title: 'Orbit Rituals',
  boardTitle: 'Founder rhythm map',
  boardSubtitle: 'Daily, weekly, and monthly rituals that keep the machine moving.',
  categories: ['Daily', 'Weekly', 'Monthly', 'Recovery'],
  states: ['Draft', 'Active', 'Needs work', 'Archived'],
  items: [
    {
      title: 'Morning clarity pass',
      category: 'Daily',
      state: 'Active',
      score: 9,
      effort: 2,
      streak: 6,
      duration: 20,
      cue: 'Before opening chat apps',
      lastDone: '2026-04-24',
      nextDue: '2026-04-25',
      note: 'Review priorities, inbox, and calendar before opening chat apps.',
    },
    {
      title: 'Friday founder review',
      category: 'Weekly',
      state: 'Active',
      score: 10,
      effort: 3,
      streak: 4,
      duration: 60,
      cue: 'Friday afternoon shutdown',
      lastDone: '2026-04-18',
      nextDue: '2026-04-25',
      note: 'Close loops, review wins, and choose the next three strategic bets.',
    },
    {
      title: 'Monthly reset block',
      category: 'Monthly',
      state: 'Draft',
      score: 8,
      effort: 4,
      streak: 1,
      duration: 90,
      cue: 'First working day of the month',
      lastDone: '2026-04-01',
      nextDue: '2026-05-01',
      note: 'Prune stale projects, check finances, and refresh the operating map.',
    },
  ],
};

const STORAGE_KEY = `${CONFIG.slug}/state/v2`;
const NUMBER_FIELDS = new Set(['score', 'effort', 'streak', 'duration']);
const refs = {
  boardTitle: document.querySelector('[data-role="board-title"]'),
  boardSubtitle: document.querySelector('[data-role="board-subtitle"]'),
  stats: document.querySelector('[data-role="stats"]'),
  insights: document.querySelector('[data-role="insights"]'),
  count: document.querySelector('[data-role="count"]'),
  list: document.querySelector('[data-role="list"]'),
  editor: document.querySelector('[data-role="editor"]'),
  secondaryPrimary: document.querySelector('[data-role="secondary-primary"]'),
  secondarySecondary: document.querySelector('[data-role="secondary-secondary"]'),
  search: document.querySelector('[data-field="search"]'),
  category: document.querySelector('[data-field="category"]'),
  status: document.querySelector('[data-field="status"]'),
  importFile: document.querySelector('#import-file'),
};

const toastHost = (() => {
  const host = document.createElement('div');
  host.className = 'toast-host';
  document.body.appendChild(host);
  return host;
})();

function showToast(message) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  toastHost.appendChild(node);
  requestAnimationFrame(() => node.classList.add('is-visible'));
  setTimeout(() => {
    node.classList.remove('is-visible');
    setTimeout(() => node.remove(), 200);
  }, 2200);
}

function uid() {
  return `${CONFIG.slug}_${Math.random().toString(36).slice(2, 10)}`;
}

function todayISO(offset = 0) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().slice(0, 10);
}

function daysFromToday(value) {
  if (!value) return 999;
  const today = new Date(`${todayISO()}T00:00:00`);
  const target = new Date(`${value}T00:00:00`);
  return Math.round((target - today) / 86400000);
}

function bumpDate(value, days) {
  const date = new Date(`${value || todayISO()}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function cadenceDays(category) {
  if (category === 'Daily') return 1;
  if (category === 'Weekly') return 7;
  if (category === 'Monthly') return 30;
  return 2;
}

function formatDate(value) {
  if (!value) return 'No date';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function escapeHtml(value) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function normalize(item = {}) {
  return {
    id: item.id || uid(),
    title: item.title || 'New ritual',
    category: CONFIG.categories.includes(item.category) ? item.category : CONFIG.categories[0],
    state: CONFIG.states.includes(item.state) ? item.state : CONFIG.states[0],
    score: Number(item.score ?? 7),
    effort: Number(item.effort ?? 3),
    streak: Number(item.streak ?? 0),
    duration: Number(item.duration ?? 15),
    cue: item.cue || 'What triggers this ritual',
    lastDone: item.lastDone || todayISO(-1),
    nextDue: item.nextDue || todayISO(1),
    note: item.note || 'Capture why this rhythm matters and what makes it stick.',
  };
}

function priority(item) {
  const dueBoost = Math.max(0, 3 - Math.max(daysFromToday(item.nextDue), 0)) * 5;
  const stateBoost = item.state === 'Active' ? 8 : item.state === 'Needs work' ? 4 : item.state === 'Draft' ? 2 : -8;
  return item.score * 6 + item.streak * 3 + dueBoost + stateBoost - item.effort * 4;
}

function seedState() {
  return {
    boardTitle: CONFIG.boardTitle,
    boardSubtitle: CONFIG.boardSubtitle,
    items: CONFIG.items.map((item) => normalize(item)),
    ui: { search: '', category: 'all', status: 'all', selectedId: null },
  };
}

function hydrate() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw);
    return {
      ...seedState(),
      ...parsed,
      items: (parsed.items || []).map((item) => normalize(item)),
      ui: { ...seedState().ui, ...(parsed.ui || {}) },
    };
  } catch (error) {
    console.warn('Falling back to seed state', error);
    return seedState();
  }
}

let state = hydrate();
if (!state.ui.selectedId && state.items[0]) state.ui.selectedId = state.items[0].id;

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function filteredItems() {
  const query = state.ui.search.trim().toLowerCase();
  return [...state.items]
    .filter((item) => state.ui.category === 'all' || item.category === state.ui.category)
    .filter((item) => state.ui.status === 'all' || item.state === state.ui.status)
    .filter((item) => !query || `${item.title} ${item.note} ${item.category} ${item.state} ${item.cue}`.toLowerCase().includes(query))
    .sort((a, b) => priority(b) - priority(a) || daysFromToday(a.nextDue) - daysFromToday(b.nextDue));
}

function selectedItem() {
  return state.items.find((item) => item.id === state.ui.selectedId) || filteredItems()[0] || null;
}

function commit(nextState) {
  state = nextState;
  if (!state.ui.selectedId && state.items[0]) state.ui.selectedId = state.items[0].id;
  persist();
  render();
}

function updateSelected(field, value) {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? { ...item, [field]: NUMBER_FIELDS.has(field) ? Number(value) : value } : item),
  });
}

function addItem() {
  const item = normalize({ title: 'New ritual', cue: 'Pick the trigger for this rhythm' });
  commit({
    ...state,
    items: [item, ...state.items],
    ui: { ...state.ui, selectedId: item.id },
  });
  showToast('Added a new ritual.');
}

function removeSelected() {
  const target = selectedItem();
  if (!target) return;
  const nextItems = state.items.filter((item) => item.id !== target.id);
  commit({
    ...state,
    items: nextItems,
    ui: { ...state.ui, selectedId: nextItems[0]?.id || null },
  });
  showToast('Removed ritual.');
}

function exportState() {
  const blob = new Blob([JSON.stringify({ schema: `${CONFIG.slug}/v2`, ...state }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${CONFIG.slug}.json`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Downloaded backup.');
}

async function importState(file) {
  const raw = await file.text();
  const parsed = JSON.parse(raw);
  commit({
    ...seedState(),
    ...parsed,
    items: (parsed.items || []).map((item) => normalize(item)),
    ui: { ...seedState().ui, ...(parsed.ui || {}) },
  });
  showToast('Imported backup.');
}

function markDoneToday() {
  const target = selectedItem();
  if (!target) return;
  const nextDue = bumpDate(todayISO(), cadenceDays(target.category));
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? {
      ...item,
      lastDone: todayISO(),
      nextDue,
      streak: item.streak + 1,
      state: item.state === 'Needs work' ? 'Active' : item.state,
    } : item),
  });
  showToast('Logged this ritual for today.');
}

function snoozeRitual(days) {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? { ...item, nextDue: bumpDate(item.nextDue, days) } : item),
  });
  showToast(`Moved the next ritual by ${days} days.`);
}

function resetStreak() {
  const target = selectedItem();
  if (!target) return;
  commit({
    ...state,
    items: state.items.map((item) => item.id === target.id ? { ...item, streak: 0, state: 'Needs work' } : item),
  });
  showToast('Reset this ritual streak.');
}

function toneForDue(item) {
  const days = daysFromToday(item.nextDue);
  if (days <= 0) return 'danger';
  if (days <= 2) return 'warn';
  return 'success';
}

function renderStats(items) {
  const active = state.items.filter((item) => item.state === 'Active').length;
  const dueToday = state.items.filter((item) => daysFromToday(item.nextDue) <= 0 && item.state !== 'Archived').length;
  const totalMinutes = state.items.reduce((sum, item) => sum + item.duration, 0);
  const avgStreak = state.items.length ? (state.items.reduce((sum, item) => sum + item.streak, 0) / state.items.length).toFixed(1) : '0.0';
  const cards = [
    ['Rituals', String(state.items.length), 'tracked rhythms on the board'],
    ['Active', String(active), 'rituals currently in rotation'],
    ['Due today', String(dueToday), `${totalMinutes} minutes across the full rhythm map`],
    ['Average streak', avgStreak, 'consistency across your rituals'],
  ];
  refs.stats.innerHTML = cards.map(([label, valueText, note]) => `
    <article class="card stat">
      <span>${label}</span>
      <strong>${valueText}</strong>
      <small>${note}</small>
    </article>
  `).join('');
  refs.count.textContent = items[0] ? `Top: ${items[0].title}` : 'No rituals';
}

function renderInsights(items) {
  const mostConsistent = [...state.items].sort((a, b) => b.streak - a.streak)[0];
  const slipping = state.items.find((item) => item.state === 'Needs work') || [...state.items].sort((a, b) => daysFromToday(a.nextDue) - daysFromToday(b.nextDue))[0];
  const longest = [...state.items].sort((a, b) => b.duration - a.duration)[0];
  const cards = [
    {
      label: 'Most consistent',
      title: mostConsistent?.title || 'No ritual yet',
      body: mostConsistent ? `${mostConsistent.streak} streak with cue: ${mostConsistent.cue}.` : 'Add a rhythm and its consistency will show up here.',
    },
    {
      label: 'Needs attention',
      title: slipping?.title || 'Nothing slipping',
      body: slipping ? `Next due ${formatDate(slipping.nextDue)} and state ${slipping.state}.` : 'Healthy rhythms surface here once they wobble.',
    },
    {
      label: 'Biggest ritual block',
      title: longest?.title || 'No ritual block',
      body: longest ? `${longest.duration} minutes with leverage score ${priority(longest)}.` : 'Longer rituals show up once you map them.',
    },
  ];
  refs.insights.innerHTML = cards.map((card) => `
    <article class="card insight-card">
      <p class="eyebrow">${card.label}</p>
      <h3>${card.title}</h3>
      <p>${card.body}</p>
    </article>
  `).join('');
}

function renderList(items) {
  if (!items.length) {
    refs.list.innerHTML = `
      <div class="empty">
        <strong>No rituals yet</strong>
        <p>Plant a rhythm for planning, shipping, recovery, or review.</p>
      </div>
    `;
    return;
  }

  refs.list.innerHTML = items.map((item) => `
    <button class="item ${item.id === state.ui.selectedId ? 'is-selected' : ''}" type="button" data-id="${item.id}">
      <div class="item-top">
        <strong>${item.title}</strong>
        <span class="score">${priority(item)}</span>
      </div>
      <p>${item.note}</p>
      <div class="badge-row">
        <span class="pill ${toneForDue(item)}">Next ${formatDate(item.nextDue)}</span>
        <span class="pill">${item.duration} min</span>
        <span class="pill">${item.streak} streak</span>
      </div>
      <div class="meta">
        <span>${item.category}</span>
        <span>${item.state}</span>
        <span>${item.cue}</span>
        <span>Last done ${formatDate(item.lastDone)}</span>
      </div>
    </button>
  `).join('');
}

function renderEditor(item) {
  if (!item) {
    refs.editor.innerHTML = `
      <div class="empty">
        <strong>No selection</strong>
        <p>Pick a ritual or create a new one.</p>
      </div>
    `;
    return;
  }

  refs.editor.innerHTML = `
    <div class="editor-head">
      <div>
        <p class="eyebrow">Ritual editor</p>
        <h3>${item.title}</h3>
      </div>
      <span class="score">Priority ${priority(item)}</span>
    </div>
    <div class="editor-grid">
      <label class="field">
        <span>Ritual name</span>
        <input type="text" data-item-field="title" value="${escapeHtml(item.title)}" />
      </label>
      <label class="field">
        <span>Trigger cue</span>
        <input type="text" data-item-field="cue" value="${escapeHtml(item.cue)}" />
      </label>
      <label class="field">
        <span>Why it matters</span>
        <textarea data-item-field="note">${escapeHtml(item.note)}</textarea>
      </label>
      <div class="field-grid">
        <label class="field">
          <span>Type</span>
          <select data-item-field="category">${CONFIG.categories.map((entry) => `<option value="${entry}" ${item.category === entry ? 'selected' : ''}>${entry}</option>`).join('')}</select>
        </label>
        <label class="field">
          <span>Status</span>
          <select data-item-field="state">${CONFIG.states.map((entry) => `<option value="${entry}" ${item.state === entry ? 'selected' : ''}>${entry}</option>`).join('')}</select>
        </label>
      </div>
      <div class="field-grid">
        <label class="field">
          <span>Last done</span>
          <input type="date" data-item-field="lastDone" value="${item.lastDone}" />
        </label>
        <label class="field">
          <span>Next due</span>
          <input type="date" data-item-field="nextDue" value="${item.nextDue}" />
        </label>
      </div>
      <div class="field-grid three">
        <label class="field range-wrap">
          <span>Streak</span>
          <input type="range" min="0" max="30" data-item-field="streak" value="${item.streak}" />
          <output>${item.streak}</output>
        </label>
        <label class="field range-wrap">
          <span>Leverage</span>
          <input type="range" min="1" max="10" data-item-field="score" value="${item.score}" />
          <output>${item.score} / 10</output>
        </label>
        <label class="field range-wrap">
          <span>Friction</span>
          <input type="range" min="1" max="10" data-item-field="effort" value="${item.effort}" />
          <output>${item.effort} / 10</output>
        </label>
      </div>
      <label class="field">
        <span>Minutes</span>
        <input type="number" min="5" step="5" data-item-field="duration" value="${item.duration}" />
      </label>
      <div class="quick-actions">
        <button class="btn" type="button" data-action="done-today">Log done today</button>
        <button class="btn" type="button" data-action="snooze-1">Move next due +1 day</button>
        <button class="btn" type="button" data-action="reset-streak">Reset streak</button>
      </div>
      <div class="editor-actions">
        <span class="helper">Last done ${formatDate(item.lastDone)}, next due ${formatDate(item.nextDue)}.</span>
        <button class="btn btn-danger" type="button" data-action="remove-current">Remove</button>
      </div>
    </div>
  `;
}

function renderPanels() {
  const queue = [...state.items].filter((item) => item.state !== 'Archived').sort((a, b) => daysFromToday(a.nextDue) - daysFromToday(b.nextDue));
  refs.secondaryPrimary.innerHTML = `
    <div class="secondary-head">
      <div>
        <p class="eyebrow">Today orbit</p>
        <h3>What deserves attention next</h3>
      </div>
      <span class="chip">${queue.length} live</span>
    </div>
    <div class="stack">
      ${queue.slice(0, 4).map((item) => `
        <div class="mini-card">
          <div class="inline-split">
            <strong>${item.title}</strong>
            <span class="pill ${toneForDue(item)}">${formatDate(item.nextDue)}</span>
          </div>
          <p>${item.duration} minutes, ${item.streak} streak, cue: ${item.cue}.</p>
        </div>
      `).join('') || `<div class="empty"><strong>No live rituals</strong><p>Archived rhythms stay out of the queue.</p></div>`}
    </div>
  `;

  const byCategory = CONFIG.categories.map((entry) => ({ entry, count: state.items.filter((item) => item.category === entry && item.state !== 'Archived').length }));
  refs.secondarySecondary.innerHTML = `
    <div class="secondary-head">
      <div>
        <p class="eyebrow">Rhythm balance</p>
        <h3>Cadence distribution</h3>
      </div>
      <span class="chip">${state.items.reduce((sum, item) => sum + item.duration, 0)} min</span>
    </div>
    <ul class="metric-list">
      ${byCategory.map(({ entry, count }) => `<li><span>${entry}</span><strong>${count}</strong></li>`).join('')}
      <li><span>Strongest streak</span><strong>${state.items.length ? [...state.items].sort((a, b) => b.streak - a.streak)[0].title : '—'}</strong></li>
    </ul>
  `;
}

function render() {
  refs.boardTitle.textContent = state.boardTitle;
  refs.boardSubtitle.textContent = state.boardSubtitle;
  refs.search.value = state.ui.search;
  refs.category.innerHTML = `<option value="all">All types</option>${CONFIG.categories.map((entry) => `<option value="${entry}" ${state.ui.category === entry ? 'selected' : ''}>${entry}</option>`).join('')}`;
  refs.status.innerHTML = `<option value="all">All statuses</option>${CONFIG.states.map((entry) => `<option value="${entry}" ${state.ui.status === entry ? 'selected' : ''}>${entry}</option>`).join('')}`;
  const items = filteredItems();
  if (!items.some((item) => item.id === state.ui.selectedId)) state.ui.selectedId = items[0]?.id || null;
  renderStats(items);
  renderInsights(items);
  renderList(items);
  renderEditor(selectedItem());
  renderPanels();
}

document.addEventListener('click', (event) => {
  const itemButton = event.target.closest('.item');
  if (itemButton) {
    commit({ ...state, ui: { ...state.ui, selectedId: itemButton.dataset.id } });
    return;
  }

  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action) return;
  if (action === 'new') addItem();
  if (action === 'reset') { commit(seedState()); showToast('Re-seeded sample board.'); }
  if (action === 'remove-current') removeSelected();
  if (action === 'export') exportState();
  if (action === 'import') refs.importFile.click();
  if (action === 'done-today') markDoneToday();
  if (action === 'snooze-1') snoozeRitual(1);
  if (action === 'reset-streak') resetStreak();
});

document.addEventListener('input', (event) => {
  const field = event.target.dataset.field;
  if (field === 'search') {
    commit({ ...state, ui: { ...state.ui, search: event.target.value } });
    return;
  }
  const itemField = event.target.dataset.itemField;
  if (itemField) updateSelected(itemField, event.target.value);
});

document.addEventListener('change', async (event) => {
  const field = event.target.dataset.field;
  if (field === 'category' || field === 'status') {
    commit({ ...state, ui: { ...state.ui, [field]: event.target.value } });
    return;
  }
  if (event.target.id === 'import-file') {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      await importState(file);
    } catch (error) {
      console.error(error);
      showToast('Import failed.');
    } finally {
      event.target.value = '';
    }
  }
});

document.addEventListener('keydown', (event) => {
  if (event.target.closest('input, textarea, select')) return;
  if (event.key.toLowerCase() === 'n') {
    event.preventDefault();
    addItem();
  }
  if (event.key === '/') {
    event.preventDefault();
    refs.search.focus();
  }
});

render();
