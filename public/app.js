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

// --- Человеческие подписи полей ---
const LABELS = {
  model: 'Модель',
  modelName: 'Название',
  itemName: 'Название',
  houseName: 'Название',
  apartmentName: 'Название',
  warehouseName: 'Название',
  officeName: 'Название',
  clothesName: 'Название',
  name: 'Название',
  totalCount: 'Всего лотов',
  soldCount: 'Продано за период',
  averagePrice: 'Средняя цена',
  minPrice: 'Мин. цена',
  maxPrice: 'Макс. цена',
  serverId: 'Сервер',
  serverName: 'Название сервера',
  totalVehicles: 'Всего транспорта',
  totalItems: 'Всего предметов',
  totalHouses: 'Всего домов',
  totalApartments: 'Всего квартир',
  totalWarehouses: 'Всего складов',
  totalOffices: 'Всего офисов',
  totalClothes: 'Всего одежды',
  totalSold: 'Продано всего',
  overallAveragePrice: 'Средняя цена по серверу',
  lastUpdated: 'Обновлено',
  periodDays: 'Период',
};

const TITLE_KEY_PATTERN = /name$/i;
const PRICE_KEY_PATTERN = /price/i;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

function humanizeKey(key) {
  if (LABELS[key]) return LABELS[key];
  // camelCase -> "Camel Case"
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
    loadAndRender(`/api/${id}`, section.icon, section.label);
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
      loadAndRender(`/api/${id}/${ep.key}`, ep.icon, `${section.label} — ${ep.label}`);
    };
    subNav.appendChild(b);
  });
  contentEl.appendChild(subNav);

  const resultsBox = document.createElement('div');
  resultsBox.className = 'results';
  contentEl.appendChild(resultsBox);

  loadAndRender(`/api/${id}/${section.endpoints[0].key}`, section.endpoints[0].icon, `${section.label} — ${section.endpoints[0].label}`);
}

function skeletonHTML() {
  return `<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>`;
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
      box.innerHTML = `<h2>${icon} ${title}</h2><div class="error-box">⚠️ ${escapeHtml(payload.error || 'Неизвестная ошибка')}</div>`;
      return;
    }

    const cacheNote = payload.fromCache
      ? '<span class="badge">из кэша</span>'
      : '<span class="badge badge-fresh">свежие данные</span>';

    box.innerHTML = `<h2>${icon} ${title} ${cacheNote}</h2>`;
    box.appendChild(renderData(payload.data));
  } catch (err) {
    box.innerHTML = `<h2>${icon} ${title}</h2><div class="error-box">⚠️ Сбой сети: ${escapeHtml(err.message)}</div>`;
  }
}

function matchesQuery(item, query) {
  return Object.values(item).some((v) =>
    String(v).toLowerCase().includes(query)
  );
}

// Находит первое поле-массив в объекте -> карточки с поиском, остальные скалярные поля -> чипы сверху
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
  pre.textContent = JSON.stringify(data, null, 2);
  wrapper.appendChild(pre);
  return wrapper;
}

function renderSearchableCards(items) {
  const container = document.createElement('div');

  if (!items || items.length === 0) {
    container.appendChild(renderCards(items));
    return container;
  }

  const searchWrap = document.createElement('div');
  searchWrap.className = 'search-wrap';
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
    gridHolder.replaceChildren(renderCards(filtered));
  }

  input.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const value = e.target.value;
    debounceTimer = setTimeout(() => applyFilter(value), 150);
  });

  applyFilter('');
  return container;
}

function renderMeta(scalarEntries) {
  const meta = document.createElement('div');
  meta.className = 'meta-row';
  meta.innerHTML = scalarEntries
    .map(([k, v]) => `<span class="meta-chip"><b>${escapeHtml(humanizeKey(k))}:</b> ${escapeHtml(formatValue(k, v))}</span>`)
    .join('');
  return meta;
}

function renderCards(items) {
  if (!items || items.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = '📭 Пусто — записей нет.';
    return empty;
  }

  const grid = document.createElement('div');
  grid.className = 'card-grid';

  items.forEach((item) => {
    const entries = Object.entries(item);
    // Заголовок карточки: поле, оканчивающееся на "Name", иначе "model", иначе первое поле
    const titleEntry =
      entries.find(([k]) => TITLE_KEY_PATTERN.test(k)) ||
      entries.find(([k]) => k === 'model') ||
      entries[0];

    const restEntries = entries.filter(([k]) => k !== titleEntry?.[0]).slice(0, 7);
    const priceEntry = restEntries.find(([k]) => PRICE_KEY_PATTERN.test(k) && /^average/i.test(k))
      || restEntries.find(([k]) => PRICE_KEY_PATTERN.test(k));
    const otherEntries = restEntries.filter(([k]) => k !== priceEntry?.[0]);

    const card = document.createElement('div');
    card.className = 'card';

    const titleHtml = titleEntry
      ? `<div class="card-title">${escapeHtml(formatValue(titleEntry[0], titleEntry[1]))}</div>`
      : '';

    const priceHtml = priceEntry
      ? `<div class="card-price">${escapeHtml(formatValue(priceEntry[0], priceEntry[1]))}</div>`
      : '';

    const rowsHtml = otherEntries
      .map(([k, v]) => `
        <div class="card-row">
          <span class="card-key">${escapeHtml(humanizeKey(k))}</span>
          <span class="card-value">${escapeHtml(formatValue(k, v))}</span>
        </div>`)
      .join('');

    card.innerHTML = `
      <div class="card-header">
        ${titleHtml}
        ${priceHtml}
      </div>
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

renderTabs();
