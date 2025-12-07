// src/routes/fassetsRoutes.js
const express = require('express');
const router = express.Router();
const { fetchCurrentPrice } = require('../ftsoClient');

// Demo F-assets portfolio endpoint. In a real setup, this would query
// F-asset contracts for balances and collateralization data.
router.get('/portfolio', async (req, res) => {
  try {
    const address = (req.query.address || '').toLowerCase() || '0xDemoUserAddress';

    // Try to enrich with FTSO prices, but keep it best-effort for demo
    let usdPrice = null;
    let btcPrice = null;
    try {
      const usd = await fetchCurrentPrice('USD');
      usdPrice = usd.price;
    } catch (_) {}
    try {
      const btc = await fetchCurrentPrice('BTC');
      btcPrice = btc.price;
    } catch (_) {}

    const positions = [
      {
        symbol: 'fUSD',
        underlying: 'USD',
        balance: 1234.56,
        collateralSymbol: 'FLR',
        collateralLocked: 5000,
        collateralRatio: 1.8,
        liquidationRatio: 1.5,
        price: usdPrice,
      },
      {
        symbol: 'fBTC',
        underlying: 'BTC',
        balance: 0.42,
        collateralSymbol: 'FLR',
        collateralLocked: 25000,
        collateralRatio: 2.1,
        liquidationRatio: 1.7,
        price: btcPrice,
      },
    ];

    return res.json({ ok: true, address, positions });
  } catch (err) {
    console.error('F-assets portfolio error:', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
