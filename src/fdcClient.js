// src/fdcClient.js
const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const VERIFIER_BASE = process.env.VERIFIER_BASE || '';
const VERIFIER_API_KEY = process.env.VERIFIER_API_KEY || '';
const FDCHUB_ADDRESS = process.env.FDCHUB_ADDRESS || '';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const RPC = process.env.RPC || process.env.INFURA_RPC || '';
const DA_LAYER_URL = process.env.DA_LAYER_URL || '';

async function prepareFdcRequest(attestationTypeHex, sourceIdHex, requestBody) {
  if (!VERIFIER_BASE || !VERIFIER_API_KEY) {
    // mocked response for demo
    return { mocked: true, abiEncodedRequest: '0x' + Buffer.from(JSON.stringify({ attestationTypeHex, sourceIdHex, requestBody })).toString('hex') };
  }
  const url = `${VERIFIER_BASE.replace(/\/$/, '')}/verifier/prepareRequest`;
  const headers = { 'x-api-key': VERIFIER_API_KEY, 'Content-Type': 'application/json' };
  const resp = await axios.post(url, { attestationType: attestationTypeHex, sourceId: sourceIdHex, requestBody }, { headers, timeout: 20000 });
  return resp.data;
}

async function submitToFdchub(abiEncodedRequest, valueEth = '0.0001') {
  if (!RPC || !PRIVATE_KEY || !FDCHUB_ADDRESS) throw new Error('RPC/PRIVATE_KEY/FDCHUB_ADDRESS required for on-chain submit');
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  // Minimal ABI to call requestAttestation
  const iface = new ethers.Interface(["function requestAttestation(bytes calldata abiEncodedRequest) payable returns (uint256)"]);
  const data = iface.encodeFunctionData('requestAttestation', [abiEncodedRequest]);

  const tx = await wallet.sendTransaction({ to: FDCHUB_ADDRESS, data, value: ethers.parseEther(valueEth) });
  const receipt = await tx.wait();

  // compute roundId per docs: need firstVotingRoundStartTs & epoch duration from network docs; can be configured via env
  const block = await provider.getBlock(receipt.blockNumber);
  const firstVotingRoundStartTs = Number(process.env.FDC_FIRST_ROUND_TS || 1658429955);
  const votingEpochSeconds = Number(process.env.FDC_EPOCH_SECONDS || 90);
  const roundId = Math.floor((block.timestamp - firstVotingRoundStartTs) / votingEpochSeconds);
  return { txHash: receipt.transactionHash, blockNumber: receipt.blockNumber, roundId };
}

async function fetchProofFromDALayer(roundId, abiEncodedRequest) {
  if (!DA_LAYER_URL) throw new Error('DA_LAYER_URL not configured');
  const resp = await axios.post(DA_LAYER_URL, { roundId, requestBytes: abiEncodedRequest }, { timeout: 30000 });
  return resp.data;
}

module.exports = { prepareFdcRequest, submitToFdchub, fetchProofFromDALayer };
