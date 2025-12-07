// src/controllers/attestationController.js
const express = require('express');
const router = express.Router();
const { buildMerkleFromObjects, getProofForObject } = require('../utils/merkleUtils');

// build summary
function buildSummaryFromTxns(txns = []) {
  const summary = { count: txns.length, totalIn: 0, totalOut: 0, totalsByCategory: {} };
  for (const t of txns) {
    const amt = Number(t.amount) || 0;
    if (amt >= 0) summary.totalIn += amt; else summary.totalOut += Math.abs(amt);
    const cat = t.category || 'Other';
    summary.totalsByCategory[cat] = (summary.totalsByCategory[cat] || 0) + amt;
  }
  return summary;
}

/**
 * POST /api/attest
 * Body: { transactions: [...] }  => returns merkle root and proofs for each tx if requested
 */
router.post('/attest', async (req, res) => {
  try {
    const { transactions = [] } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ ok: false, error: 'transactions array required' });
    }

    // compute summary
    const summary = buildSummaryFromTxns(transactions);

    // Build tree from transactions (one leaf per tx)
    const { tree, rootHex, leavesHex } = buildMerkleFromObjects(transactions);

    // snapshot metadata includes root and summary
    const snapshot = { rootHex, summary, createdAt: new Date().toISOString(), count: transactions.length };

    // get proof for all transactions (optional: front-end can request one proof only)
    const proofs = transactions.map(tx => {
      const p = getProofForObject(tree, tx);
      return { tx, proof: p.proof, leaf: p.leaf, verified: p.verified };
    });

    // attempt to prepare verifier request dynamically (safe)
    let verifierResponse = null;
    try {
      const fdcModule = await import('../fdcClient.js');
      const prepareFdcRequest = fdcModule.prepareFdcRequest || fdcModule.default?.prepareFdcRequest || fdcModule.default;
      if (typeof prepareFdcRequest === 'function') {
        const pad32 = s => '0x' + Buffer.from(s).toString('hex').padEnd(64, '0');
        const requestBody = { rootHex, snapshotMeta: { createdAt: snapshot.createdAt, recordCount: snapshot.count } };
        verifierResponse = await prepareFdcRequest(pad32('Web2Json'), pad32('fdc-demo'), requestBody).catch(()=>null);
      }
    } catch(e) { verifierResponse = null; }

    return res.json({ ok: true, snapshot, proofs, verifierResponse });
  } catch (err) {
    console.error('attest error', err);
    return res.status(500).json({ ok: false, error: err.message || 'internal error' });
  }
});

/**
 * POST /api/proof
 * Body: { transactions: [...], txIndex: 0 } OR { txObject: {...}, transactions: [...] }
 * Returns proof for requested transaction (recomputes tree deterministically)
 */
router.post('/proof', (req, res) => {
  try {
    const { transactions = [], txIndex, txObject } = req.body || {};
    if (!Array.isArray(transactions) || transactions.length === 0) return res.status(400).json({ ok: false, error: 'transactions required' });

    const { tree, rootHex } = buildMerkleFromObjects(transactions);
    let obj;
    if (typeof txIndex === 'number') obj = transactions[txIndex];
    else obj = txObject;
    if (!obj) return res.status(400).json({ ok: false, error: 'txIndex or txObject required' });

    const { proof, verified, leaf } = getProofForObject(tree, obj);
    return res.json({ ok: true, rootHex, proof, leaf, verified });
  } catch (err) {
    console.error('proof error', err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
