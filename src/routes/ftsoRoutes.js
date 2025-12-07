// src/routes/ftsoRoutes.js
const express = require('express');
const router = express.Router();
const { fetchCurrentPrice } = require('../ftsoClient');

router.get('/price', async (req, res) => {
  try {
    const asset = req.query.asset || 'USD';
    const data = await fetchCurrentPrice(asset);
    return res.json({ ok: true, asset, ...data });
  } catch (err) {
    console.error('FTSO price error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
