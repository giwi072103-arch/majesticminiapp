require('dotenv').config();

module.exports = {
  // Ключ выдаётся на id.majestic-rp.ru → API → "Получить ключ"
  API_KEY: process.env.MAJESTIC_API_KEY || '',
  BASE_URL: 'https://id.majestic-rp.ru/v1/ext',
  DEFAULT_SERVER_ID: process.env.MAJESTIC_SERVER_ID || '1',
  PORT: process.env.PORT || 3000,
  // Лимит самого Majestic API: 5 запросов / 60 сек — держим кэш чуть длиннее окна
  CACHE_TTL_MS: 45 * 1000,
};
