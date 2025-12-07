// src/ftsoClient.js
const { ethers } = require('ethers');
require('dotenv').config();

const RPC = process.env.RPC || process.env.INFURA_RPC;
if (!RPC) console.warn('FTSO: RPC not configured in .env');
const provider = new ethers.JsonRpcProvider(RPC);

// Minimal ABI — replace with exact FTSO ABIs from docs if you need historical functions
const FTSO_ABI = [
  "function getCurrentPrice(bytes32 asset) view returns (int256,uint256)", // placeholder; update per actual contract
];

const FTSO_ADDRESS = process.env.FTSO_ADDRESS || '';
const FTSO_DECIMALS = Number(process.env.FTSO_DECIMALS || 8);

let ftsoContract = null;
if (FTSO_ADDRESS) ftsoContract = new ethers.Contract(FTSO_ADDRESS, FTSO_ABI, provider);

async function fetchCurrentPrice(assetId) {
  if (!ftsoContract) throw new Error('FTSO contract not configured');
  const assetHash = ethers.id(assetId);
  // adjust call to actual ABI — this example expects [price, timestamp] as ints
  const resp = await ftsoContract.getCurrentPrice(assetHash);
  const priceRaw = resp[0];
  const ts = Number(resp[1]);
  const price = Number(priceRaw.toString()) / Math.pow(10, FTSO_DECIMALS);
  return { price, timestamp: ts };
}

module.exports = { fetchCurrentPrice };
