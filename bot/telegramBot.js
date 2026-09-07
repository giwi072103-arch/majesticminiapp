const TelegramBot = require('node-telegram-bot-api');
const { TELEGRAM_BOT_TOKEN, APP_URL } = require('../config');

function startBot() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[WARN] TELEGRAM_BOT_TOKEN не задан — бот не запущен (сайт мини-аппа при этом работает как обычно).');
    return null;
  }
  if (!APP_URL) {
    console.warn('[WARN] APP_URL не задан — кнопка открытия мини-аппа не будет работать. Задай APP_URL в Variables (напр. https://твой-домен.up.railway.app).');
  }

  const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: true });

  const openAppKeyboard = {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🛒 Открыть Majestic RP', web_app: { url: APP_URL } }],
      ],
    },
  };

  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      'Привет! Это клиент публичного API Majestic RP — маркетплейс, особняки, войны семей и всё остальное прямо в Telegram.',
      APP_URL ? openAppKeyboard : undefined
    );
  });

  bot.onText(/\/app/, (msg) => {
    if (!APP_URL) {
      bot.sendMessage(msg.chat.id, 'APP_URL не настроен на сервере.');
      return;
    }
    bot.sendMessage(msg.chat.id, 'Открываю мини-апп:', openAppKeyboard);
  });

  bot.on('polling_error', (err) => {
    console.error('[Telegram polling error]', err.message);
  });

  console.log('Telegram-бот запущен (polling).');
  return bot;
}

module.exports = { startBot };
