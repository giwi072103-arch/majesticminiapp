const express = require('express');
const router = express.Router();
const { majesticGet } = require('../lib/majesticClient');
const { DEFAULT_SERVER_ID } = require('../config');

// Обёртка, чтобы не дублировать try/catch в каждом роуте
function wrap(pathBuilder) {
  return async (req, res) => {
    const serverId = req.params.serverId || DEFAULT_SERVER_ID;
    try {
      const result = await majesticGet(pathBuilder(serverId, req));
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// --- МАРКЕТПЛЕЙС (7 категорий) ---
const marketplaceCategories = [
  'vehicles', 'items', 'houses', 'apartments', 'warehouses', 'offices', 'clothes',
];
marketplaceCategories.forEach((cat) => {
  router.get(
    `/marketplace/${cat}/:serverId?`,
    wrap((serverId) => `marketplace/${cat}/${serverId}`)
  );
});

// --- ОСОБНЯКИ ---
router.get('/mansions/:serverId?', wrap((serverId) => `mansions/${serverId}`));

// --- ПСН — отдельный эндпоинт multipurpose
router.get('/psn/:serverId?', wrap((serverId) => `multipurpose/${serverId}`));

// --- КАПТЫ — свой собственный эндпоинт
router.get('/captures/:serverId?', wrap((serverId) => `captures/${serverId}`));

// --- ВОЙНЫ СЕМЕЙ ---
router.get('/family-wars/:serverId?', wrap((serverId) => `family-wars/${serverId}`));

// --- АРЕНА ---
router.get('/arena/:serverId?', wrap((serverId) => `arena/${serverId}`));

// --- РЕЙТИНГ ОРГАНИЗАЦИЙ ---
router.get(
  '/rating-organizations/:serverId?',
  wrap((serverId) => `rating-organizations/${serverId}`)
);

module.exports = router;
