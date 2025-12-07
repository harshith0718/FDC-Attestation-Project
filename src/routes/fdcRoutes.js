// Example: in attestationController or new router
const { prepareFdcRequest, submitToFdchub, fetchProofFromDALayer } = require('../fdcClient');

router.post('/prepare', async (req, res) => {
  try {
    const { rootHex } = req.body;
    if (!rootHex) return res.status(400).json({ error: 'rootHex required' });
    const pad32 = s => '0x' + Buffer.from(s).toString('hex').padEnd(64, '0');
    const resp = await prepareFdcRequest(pad32('Web2Json'), pad32('fdc-demo'), { rootHex, snapshotMeta: {} });
    return res.json({ ok: true, resp });
  } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/submit', async (req, res) => {
  try {
    const { abiEncodedRequest, valueEth } = req.body;
    const submitRes = await submitToFdchub(abiEncodedRequest, valueEth || '0.0001');
    return res.json({ ok: true, submitRes });
  } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
});

router.post('/fetch-proof', async (req, res) => {
  try {
    const { roundId, abiEncodedRequest } = req.body;
    const proof = await fetchProofFromDALayer(roundId, abiEncodedRequest);
    return res.json({ ok: true, proof });
  } catch (err) { return res.status(500).json({ ok: false, error: err.message }); }
});
