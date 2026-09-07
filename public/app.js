const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

// Известные сервера Majestic RP (коды подтверждены как рабочие serverId в API).
// Точное имя города для каждого кода подтверждается самим ответом API
// (поле serverName) — чтобы не завести неверные подписи, список ниже
// содержит только коды; название подставится живьём после первого запроса.
const SERVER_IDS = [
  'RU1', 'RU2', 'RU3', 'RU4', 'RU5', 'RU6', 'RU7', 'RU8', 'RU9', 'RU10',
  'RU11', 'RU12', 'RU13', 'RU14', 'RU15', 'RU16', 'RU17', 'RU18', 'RU19', 'MCL',
];

let currentServerId = 'RU1';
const knownServerNames = {}; // serverId -> человеческое имя, заполняется по мере запросов

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

const LABELS = {
  model: 'Модель', modelName: 'Название', itemName: 'Название', houseName: 'Название',
  apartmentName: 'Название', warehouseName: 'Название', officeName: 'Название',
  clothesName: 'Название', name: 'Название',
  totalCount: 'Всего лотов', soldCount: 'Продано за период',
  averagePrice: 'Средняя цена', minPrice: 'Мин. цена', maxPrice: 'Макс. цена',
  serverId: 'Сервер', serverName: 'Название сервера',
  totalVehicles: 'Всего транспорта', totalItems: 'Всего предметов', totalHouses: 'Всего домов',
  totalApartments: 'Всего квартир', totalWarehouses: 'Всего складов', totalOffices: 'Всего офисов',
  totalClothes: 'Всего одежды', totalSold: 'Продано всего',
  overallAveragePrice: 'Средняя цена по серверу', lastUpdated: 'Обновлено', periodDays: 'Период',
};

const TITLE_KEY_PATTERN = /name$/i;
const PRICE_KEY_PATTERN = /price/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

function humanizeKey(key) {
  if (LABELS[key]) return LABELS[key];
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(key, value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && DATE_PATTERN.test(value)) {
    const d = new Date(value);
    return d.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  if (typeof value === 'number') {
    const formatted = value.toLocaleString('ru-RU');
    if (PRICE_KEY_PATTERN.test(key)) return `$${formatted}`;
    if (/^period/i.test(key)) return `${formatted} дн.`;
    return formatted;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

const serverBarEl = document.getElementById('serverBar');
const tabsEl = document.getElementById('tabs');
const contentEl = document.getElementById('content');
let activeSectionBtn = null;
let activeSectionId = null;

function renderServerBar() {
  const label = document.createElement('span');
  label.className = 'server-label';
  label.textContent = '🌐';
  serverBarEl.appendChild(label);

  const scroller = document.createElement('div');
  scroller.className = 'server-scroller';

  SERVER_IDS.forEach((id) => {
    const chip = document.createElement('button');
    chip.className = 'server-chip glass' + (id === currentServerId ? ' active' : '');
    chip.dataset.serverId = id;
    chip.textContent = id;
    chip.onclick = () => {
      if (currentServerId === id) return;
      currentServerId = id;
      scroller.querySelectorAll('.server-chip').forEach((c) => c.classList.remove('active'));
      chip.classList.add('active');
      if (activeSectionId) selectSection(activeSectionId);
    };
    scroller.appendChild(chip);
  });

  serverBarEl.appendChild(scroller);
}

function renderTabs() {
  Object.entries(SECTIONS).forEach(([id, section]) => {
    const btn = document.createElement('button');
    btn.className = 'tab glass';
    btn.innerHTML = `<span class="tab-icon">${section.icon}</span>${section.label}`;
    btn.onclick = () => {
      activeSectionBtn?.classList.remove('active');
      btn.classList.add('active');
      activeSectionBtn = btn;
      activeSectionId = id;
      selectSection(id);
    };
    tabsEl.appendChild(btn);
  });
}

function selectSection(id) {
  const section = SECTIONS[id];
  contentEl.innerHTML = '';

  if (section.single) {
    loadAndRender(`/api/${id}/${currentServerId}`, section.icon, section.label);
    return;
  }

  const subNav = document.createElement('div');
  subNav.className = 'subnav';
  section.endpoints.forEach((ep, i) => {
    const b = document.createElement('button');
    b.className = 'sub-tab glass' + (i === 0 ? ' active' : '');
    b.innerHTML = `${ep.icon} ${ep.label}`;
    b.onclick = () => {
      subNav.querySelectorAll('.sub-tab').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      loadAndRender(`/api/${id}/${ep.key}/${currentServerId}`, ep.icon, `${section.label} — ${ep.label}`);
    };
    subNav.appendChild(b);
  });
  contentEl.appendChild(subNav);

  const resultsBox = document.createElement('div');
  resultsBox.className = 'results';
  contentEl.appendChild(resultsBox);

  loadAndRender(
    `/api/${id}/${section.endpoints[0].key}/${currentServerId}`,
    section.endpoints[0].icon,
    `${section.label} — ${section.endpoints[0].label}`
  );
}

function skeletonHTML() {
  return `<div class="skeleton glass"></div><div class="skeleton glass"></div><div class="skeleton glass"></div>`;
}

async function loadAndRender(url, icon, title) {
  let box = contentEl.querySelector('.results');
  if (!box) {
    box = document.createElement('div');
    box.className = 'results';
    contentEl.appendChild(box);
  }
  box.innerHTML = `<h2>${icon} ${title}</h2>${skeletonHTML()}`;

  try {
    const res = await fetch(url);
    const payload = await res.json();

    if (!res.ok) {
      box.innerHTML = `<h2>${icon} ${title}</h2><div class="error-box glass">⚠️ ${escapeHtml(payload.error || 'Неизвестная ошибка')}</div>`;
      return;
    }

    if (payload.data?.serverName) {
      knownServerNames[currentServerId] = payload.data.serverName;
      updateServerChipLabel(currentServerId, payload.data.serverName);
    }

    const cacheNote = payload.fromCache
      ? '<span class="badge glass">из кэша</span>'
      : '<span class="badge badge-fresh glass">свежие данные</span>';

    box.innerHTML = `<h2>${icon} ${title} ${cacheNote}</h2>`;
    const dataEl = renderData(payload.data);
    dataEl.classList.add('fade-in');
    box.appendChild(dataEl);
  } catch (err) {
    box.innerHTML = `<h2>${icon} ${title}</h2><div class="error-box glass">⚠️ Сбой сети: ${escapeHtml(err.message)}</div>`;
  }
}

function updateServerChipLabel(serverId, name) {
  const chip = serverBarEl.querySelector(`.server-chip[data-server-id="${serverId}"]`);
  if (chip && !chip.dataset.named) {
    chip.dataset.named = '1';
    chip.innerHTML = `${serverId}<span class="server-chip-name">${escapeHtml(name)}</span>`;
  }
}

function matchesQuery(item, query) {
  return Object.values(item).some((v) => String(v).toLowerCase().includes(query));
}

function renderData(data) {
  const wrapper = document.createElement('div');

  if (Array.isArray(data)) {
    wrapper.appendChild(renderSearchableCards(data));
    return wrapper;
  }

  if (data && typeof data === 'object') {
    const entries = Object.entries(data);
    const arrayEntry = entries.find(([, v]) => Array.isArray(v));
    const scalarEntries = entries.filter(([k]) => !arrayEntry || k !== arrayEntry[0]);

    if (scalarEntries.length) {
      wrapper.appendChild(renderMeta(scalarEntries));
    }

    if (arrayEntry) {
      wrapper.appendChild(renderSearchableCards(arrayEntry[1]));
      return wrapper;
    }
  }

  const pre = document.createElement('pre');
  pre.className = 'glass';
  pre.textContent = JSON.stringify(data, null, 2);
  wrapper.appendChild(pre);
  return wrapper;
}

function renderMeta(scalarEntries) {
  const meta = document.createElement('div');
  meta.className = 'meta-row';
  meta.innerHTML = scalarEntries
    .map(([k, v]) => `<span class="meta-chip glass"><b>${escapeHtml(humanizeKey(k))}:</b> ${escapeHtml(formatValue(k, v))}</span>`)
    .join('');
  return meta;
}

function renderSearchableCards(items) {
  const container = document.createElement('div');

  if (!items || items.length === 0) {
    container.appendChild(renderCards(items));
    return container;
  }

  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap glass';
  searchWrap.innerHTML = `
    <span class="search-icon">🔍</span>
    <input type="text" class="search-input" placeholder="Поиск по названию или модели..." />
    <span class="search-count"></span>
  `;
  const input = searchWrap.querySelector('.search-input');
  const countEl = searchWrap.querySelector('.search-count');
  container.appendChild(searchWrap);

  const gridHolder = document.createElement('div');
  container.appendChild(gridHolder);

  let debounceTimer = null;
  function applyFilter(rawQuery) {
    const query = rawQuery.trim().toLowerCase();
    const filtered = query ? items.filter((it) => matchesQuery(it, query)) : items;
    countEl.textContent = query ? `${filtered.length} из ${items.length}` : '';
    const grid = renderCards(filtered);
    grid.classList.add('fade-in');
    gridHolder.replaceChildren(grid);
  }

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const value = e.target.value;
    debounceTimer = setTimeout(() => applyFilter(value), 150);
  });

  applyFilter('');
  return container;
}

function renderCards(items) {
  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = '📭 Ничего не найдено.';
    return empty;
  }

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  items.forEach((item, i) => {
    const entries = Object.entries(item);
    const titleEntry =
      entries.find(([k]) => TITLE_KEY_PATTERN.test(k)) ||
      entries.find(([k]) => k === 'model') ||
      entries[0];

    const restEntries = entries.filter(([k]) => k !== titleEntry?.[0]).slice(0, 7);
    const priceEntry = restEntries.find(([k]) => PRICE_KEY_PATTERN.test(k) && /^average/i.test(k))
      || restEntries.find(([k]) => PRICE_KEY_PATTERN.test(k));
    const otherEntries = restEntries.filter(([k]) => k !== priceEntry?.[0]);

    const card = document.createElement('div');
    card.className = 'card glass';
    card.style.animationDelay = `${Math.min(i, 12) * 25}ms`;

    const titleHtml = titleEntry
      ? `<div class="card-title">${escapeHtml(formatValue(titleEntry[0], titleEntry[1]))}</div>` : '';
    const priceHtml = priceEntry
      ? `<div class="card-price">${escapeHtml(formatValue(priceEntry[0], priceEntry[1]))}</div>` : '';
    const rowsHtml = otherEntries
      .map(([k, v]) => `
        <div class="card-row">
          <span class="card-key">${escapeHtml(humanizeKey(k))}</span>
          <span class="card-value">${escapeHtml(formatValue(k, v))}</span>
        </div>`)
      .join('');

    card.innerHTML = `
      <div class="card-header">${titleHtml}${priceHtml}</div>
      <div class="card-body">${rowsHtml}</div>
    `;
    grid.appendChild(card);
  });

  return grid;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

renderServerBar();
renderTabs();
