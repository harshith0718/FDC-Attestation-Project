// src/routes/gaslessRoutes.js
const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');

require('dotenv').config();

router.post('/submit', async (req, res) => {
  try {
    const { abiEncodedRequest, userAddress, signature, nonce } = req.body;

    if (!abiEncodedRequest || !userAddress || !signature || nonce == null) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    // Step 1 — verify user signature
    const domain = { name: 'FDC Attestation', version: '1' };
    const types = {
      AttestRequest: [
        { name: 'abi', type: 'bytes' },
        { name: 'nonce', type: 'uint256' }
      ]
    };
    const value = { abi: abiEncodedRequest, nonce: Number(nonce) };

    const recovered = ethers.verifyTypedData(domain, types, value, signature);
    if (recovered.toLowerCase() !== userAddress.toLowerCase()) {
      return res.status(400).json({ ok: false, error: 'Invalid signature' });
    }

    // Step 2 — relayer submits FDCHub transaction
    const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY;
    const RPC = process.env.RPC;
    const FDCHUB = process.env.FDCHUB_ADDRESS;
    const DEMO_GASLESS = process.env.DEMO_GASLESS === 'true';

    if (!RELAYER_PK || !RPC || !FDCHUB || DEMO_GASLESS) {
      // Demo mode: return a mocked transaction so UI can be showcased without live on-chain config
      const fakeHash = ethers.hexlify(ethers.randomBytes(32));
      return res.json({
        ok: true,
        txHash: fakeHash,
        blockNumber: 1234567,
        demo: true,
      });
    }

    const provider = new ethers.JsonRpcProvider(RPC);
    const wallet = new ethers.Wallet(RELAYER_PK, provider);

    const iface = new ethers.Interface([
      "function requestAttestation(bytes abiEncodedRequest) payable returns (uint256)"
    ]);
    const data = iface.encodeFunctionData("requestAttestation", [abiEncodedRequest]);

    const tx = await wallet.sendTransaction({
      to: FDCHUB,
      data,
      value: ethers.parseEther("0.0001")
    });

    const receipt = await tx.wait();

    return res.json({
      ok: true,
      txHash: receipt.transactionHash,
      blockNumber: receipt.blockNumber
    });

  } catch (err) {
    console.error("Gasless error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
