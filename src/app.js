// src/app.js
require('dotenv').config();
const express = require('express');
const path = require('path');

async function main() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Serve static frontend assets from /public
  const publicDir = path.join(__dirname, '..', 'public');
  app.use(express.static(publicDir));

  // Dynamically import the attestation controller to avoid require() -> ESM top-level-await issues.
  // The import may return either:
  // - an ES module namespace (with named exports), or
  // - a CommonJS module exposed as the `default` property.
  let attestationController;
  try {
    const mod = await import('./controllers/attestationController.js');
    // prefer named export, then default, then module itself
    attestationController = mod.attestationController || mod.default || mod;
    // if module itself is an object with router exported via module.exports = router
    // then the router will be the default or the module itself.
  } catch (err) {
    console.error('Failed to dynamically import attestationController:', err);
    process.exit(1);
  }

  // If the imported value is a module namespace object (not a router), try to extract router.
  // Common case: module.exports = router (CJS) -> mod.default is router (when imported).
  // If attestationController is an object with .router property, support that too.
  if (!attestationController || typeof attestationController !== 'function') {
    // try a few fallback shapes
    if (attestationController && attestationController.router) {
      attestationController = attestationController.router;
    } else if (attestationController && attestationController.default && typeof attestationController.default === 'function') {
      attestationController = attestationController.default;
    } else if (attestationController && attestationController.default && attestationController.default.router) {
      attestationController = attestationController.default.router;
    }
  }

  if (!attestationController || typeof attestationController !== 'function') {
    console.error('attestationController not found or not a router. Export your router with `module.exports = router` or as a default export.');
    process.exit(1);
  }

  // Lightweight health endpoint
  app.get('/api', (req, res) => {
    res.json({ ok: true, message: 'FDC Attestation API healthy' });
  });

  app.use('/api', attestationController);
  // Gasless routes
  const gaslessRoutes = require('./routes/gaslessRoutes');
  app.use('/api/gasless', gaslessRoutes);

  // FTSO routes
  const ftsoRoutes = require('./routes/ftsoRoutes');
  app.use('/api/ftso', ftsoRoutes);

  // F-assets routes (demo)
  const fassetsRoutes = require('./routes/fassetsRoutes');
  app.use('/api/fassets', fassetsRoutes);

  // Frontend entry
  app.get('/', (req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server listening on http://localhost:${PORT}`));
}

// run
main().catch(err => {
  console.error('Fatal start error:', err);
  process.exit(1);
});
