// Простейший in-memory кэш с TTL.
// Обязателен: у Majestic API лимит 5 запросов/60с, без кэша мини-апп
// со второго одновременного пользователя начнёт получать 429.

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

function set(key, value, ttlMs) {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

module.exports = { get, set };
