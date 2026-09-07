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
    const err = new Error('MAJESTIC_API_KEY не задан в .env');
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
    },
  });

  if (!res.ok) {
    const err = new Error(ERROR_MESSAGES[res.status] || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }

  const data = await res.json();
  const result = { data, fromCache: false };
  cache.set(cacheKey, result, CACHE_TTL_MS);
  return result;
}

module.exports = { majesticGet };
