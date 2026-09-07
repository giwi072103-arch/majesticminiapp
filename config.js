require('dotenv').config();

module.exports = {
  // Ключ выдаётся на id.majestic-rp.ru → API → "Получить ключ"
  API_KEY: process.env.MAJESTIC_API_KEY || '',
  // Реальный хост API (не id.majestic-rp.ru — тот отдаёт HTML личного кабинета)
  BASE_URL: process.env.MAJESTIC_API_BASE_URL || 'https://api.majestic-files.net/v1/ext',
  // serverId — строковый код сервера, например "RU1", не число
  DEFAULT_SERVER_ID: process.env.MAJESTIC_SERVER_ID || 'RU1',
  PORT: process.env.PORT || 3000,
  // Лимит самого Majestic API: 5 запросов / 60 сек — держим кэш чуть длиннее окна
  CACHE_TTL_MS: 45 * 1000,

  // --- Telegram-бот ---
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  // Публичный URL мини-аппа, который откроется по кнопке в боте.
  // Railway сам прокидывает свой домен в RAILWAY_PUBLIC_DOMAIN — если задан,
  // используем его, иначе берём APP_URL из Variables вручную.
  APP_URL:
    process.env.APP_URL ||
    (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : ''),
};


