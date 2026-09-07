const fetch = require('node-fetch');
const cache = require('./cache');
const { API_KEY, BASE_URL, CACHE_TTL_MS } = require('../config');

// --- Простой rate limiter: не больше 5 исходящих запросов за 60 секунд,
// вне зависимости от того, сколько эндпоинтов дёргает мини-апп одновременно.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
let requestTimestamps = [];

function canRequestNow() {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter((t) => now - t < WINDOW_MS);
  return requestTimestamps.length < MAX_REQUESTS_PER_WINDOW;
}

function recordRequest() {
  requestTimestamps.push(Date.now());
}

const ERROR_MESSAGES = {
  401: 'UNAUTHORIZED — неверный или отсутствующий API-ключ',
  403: 'NO_API_ACCESS — доступ к этому методу закрыт для твоего ключа',
  429: 'TOO_MANY_REQUESTS — превышен лимит 5 запросов/60с',
  500: 'INTERNAL_SERVER_ERROR — ошибка на стороне Majestic',
};

/**
 * Запрос к Majestic API с кэшем и локальным rate-limit guard.
 * @param {string} path - например "marketplace/vehicles/1"
 */
async function majesticGet(path) {
  const cacheKey = path;
  const cached = cache.get(cacheKey);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  if (!API_KEY) {
    const err = new Error('MAJESTIC_API_KEY не задан в переменных окружения');
    err.status = 500;
    throw err;
  }

  if (!canRequestNow()) {
    const err = new Error('Локальный лимит запросов исчерпан, попробуй через минуту');
    err.status = 429;
    throw err;
  }

  const url = `${BASE_URL}/${path}`;
  recordRequest();

  const res = await fetch(url, {
    headers: {
      'X-API-KEY': API_KEY,
      'X-LANGUAGE': 'ru',
      'Accept': 'application/json',
      // Некоторые сайты за Cloudflare/анти-ботом блокируют запросы
      // без "браузерного" User-Agent — подставляем реалистичный.
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });

  const contentType = res.headers.get('content-type') || '';
  const rawText = await res.text();

  // Не JSON в ответе — показываем реальный кусок тела, чтобы понять
  // что это: HTML-страница анти-бота, 404, редирект на логин и т.п.
  if (!contentType.includes('application/json')) {
    const snippet = rawText.slice(0, 300).replace(/\s+/g, ' ').trim();
    const err = new Error(
      `Сервер вернул не JSON (${res.status}, content-type: ${contentType || 'нет'}). ` +
      `Начало ответа: ${snippet}`
    );
    err.status = 502;
    throw err;
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch (e) {
    const err = new Error(`Не удалось распарсить JSON: ${rawText.slice(0, 300)}`);
    err.status = 502;
    throw err;
  }

  if (!res.ok) {
    const apiMessage = data?.error || data?.message || ERROR_MESSAGES[res.status] || `HTTP ${res.status}`;
    const err = new Error(apiMessage);
    err.status = res.status;
    throw err;
  }

  // Majestic API оборачивает полезные данные в { code, status, result }.
  // status:false означает ошибку на уровне бизнес-логики API даже при HTTP 200.
  let payload = data;
  if (data && typeof data === 'object' && 'result' in data) {
    if (data.status === false) {
      const err = new Error(data.message || data.error || 'Majestic API вернул status:false');
      err.status = 502;
      throw err;
    }
    payload = data.result;
  }

  const result = { data: payload, fromCache: false };
  cache.set(cacheKey, result, CACHE_TTL_MS);
  return result;
}

module.exports = { majesticGet };
