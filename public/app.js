const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.themeParams?.bg_color) {
    document.documentElement.style.setProperty('--bg', tg.themeParams.bg_color);
  }
}

// Разделы: id -> { label, icon, endpoints? }
const SECTIONS = {
  marketplace: {
    label: 'Маркетплейс',
    icon: '🛒',
    endpoints: [
      { key: 'vehicles', label: 'Транспорт', icon: '🚗' },
      { key: 'items', label: 'Предметы', icon: '📦' },
      { key: 'houses', label: 'Дома', icon: '🏠' },
      { key: 'apartments', label: 'Квартиры', icon: '🏢' },
      { key: 'warehouses', label: 'Склады', icon: '🏭' },
      { key: 'offices', label: 'Офисы', icon: '💼' },
      { key: 'clothes', label: 'Одежда', icon: '👕' },
    ],
  },
  mansions: { label: 'Особняки', icon: '🏰', single: true },
  psn: { label: 'ПСН', icon: '🏬', single: true },
  captures: { label: 'Капты', icon: '🚩', single: true },
  'family-wars': { label: 'Войны семей', icon: '⚔️', single: true },
  arena: { label: 'Арена', icon: '🏟️', single: true },
  'rating-organizations': { label: 'Рейтинг организаций', icon: '🏆', single: true },
};

const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');
let activeSectionBtn = null;

function renderTabs() {
  Object.entries(SECTIONS).forEach(([id, section]) => {
    const btn = document.createElement('button');
    btn.className = 'tab';
    btn.innerHTML = `<span class="tab-icon">${section.icon}</span>${section.label}`;
    btn.onclick = () => {
      activeSectionBtn?.classList.remove('active');
      btn.classList.add('active');
      activeSectionBtn = btn;
      selectSection(id);
    };
    tabsEl.appendChild(btn);
  });
}

function selectSection(id) {
  const section = SECTIONS[id];
  contentEl.innerHTML = '';

  if (section.single) {
    loadAndRender(`/api/${id}`, `${section.icon} ${section.label}`);
    return;
  }

  const subNav = document.createElement('div');
  subNav.className = 'subnav';
  section.endpoints.forEach((ep, i) => {
    const b = document.createElement('button');
    b.className = 'sub-tab' + (i === 0 ? ' active' : '');
    b.innerHTML = `${ep.icon} ${ep.label}`;
    b.onclick = () => {
      subNav.querySelectorAll('.sub-tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      loadAndRender(`/api/${id}/${ep.key}`, `${ep.icon} ${section.label} — ${ep.label}`);
    };
    subNav.appendChild(b);
  });
  contentEl.appendChild(subNav);

  const resultsBox = document.createElement('div');
  resultsBox.className = 'results';
  contentEl.appendChild(resultsBox);

  // Автозагрузка первой подкатегории
  loadAndRender(`/api/${id}/${section.endpoints[0].key}`, `${section.endpoints[0].icon} ${section.label} — ${section.endpoints[0].label}`);
}

function skeletonHTML() {
  return `
    <div class="skeleton"></div>
    <div class="skeleton"></div>
    <div class="skeleton"></div>
  `;
}

async function loadAndRender(url, title) {
  let box = contentEl.querySelector('.results');
  if (!box) {
    box = document.createElement('div');
    box.className = 'results';
    contentEl.appendChild(box);
  }
  box.innerHTML = `<h2>${title}</h2>${skeletonHTML()}`;

  try {
    const res = await fetch(url);
    const payload = await res.json();

    if (!res.ok) {
      box.innerHTML = `<h2>${title}</h2><div class="error-box">⚠️ ${escapeHtml(payload.error || 'Неизвестная ошибка')}</div>`;
      return;
    }

    const cacheNote = payload.fromCache
      ? '<span class="badge">из кэша</span>'
      : '<span class="badge badge-fresh">свежие данные</span>';

    box.innerHTML = `<h2>${title} ${cacheNote}</h2>`;
    box.appendChild(renderData(payload.data));
  } catch (err) {
    box.innerHTML = `<h2>${title}</h2><div class="error-box">⚠️ Сбой сети: ${escapeHtml(err.message)}</div>`;
  }
}

// Универсальный рендер: массив объектов -> карточки, иначе -> JSON-блок
function renderData(data) {
  const items = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : null);

  if (!items) {
    const pre = document.createElement('pre');
    pre.textContent = JSON.stringify(data, null, 2);
    return pre;
  }

  if (items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'Пусто — лотов/записей нет.';
    return empty;
  }

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'card';
    const fields = Object.entries(item).slice(0, 8);
    card.innerHTML = fields
      .map(([k, v]) => `
        <div class="card-row">
          <span class="card-key">${escapeHtml(k)}</span>
          <span class="card-value">${escapeHtml(formatValue(v))}</span>
        </div>`)
      .join('');
    grid.appendChild(card);
  });

  return grid;
}

function formatValue(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

renderTabs();
