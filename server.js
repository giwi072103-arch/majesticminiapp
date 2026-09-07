const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');
const { PORT, API_KEY } = require('./config');

const app = express();

// Railway дёргает / или /healthz для проверки, что контейнер жив —
// сервер должен отвечать 200 даже если ключ ещё не задан в Variables.
app.get('/healthz', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', apiRoutes);

if (!API_KEY) {
  console.warn(
    '[WARN] MAJESTIC_API_KEY не задан — задай его в Railway → Variables. ' +
    'Сервер всё равно запустится, но запросы к API будут возвращать ошибку 500.'
  );
}

app.listen(PORT, () => {
  console.log(`Majestic Mini App запущен на порту ${PORT}`);
});
