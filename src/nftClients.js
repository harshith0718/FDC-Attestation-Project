// src/nftClient.js
const { ethers } = require('ethers');
require('dotenv').config();
const RPC = process.env.RPC;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const NFT_ADDRESS = process.env.SNAPSHOT_NFT_ADDRESS;

const NFT_ABI = [
  "function mintReceipt(address to, string merkleRoot, string attTxn) external returns (uint256)",
  "function owner() view returns (address)"
];

async function mintSnapshot(toAddress, merkleRoot, attTxn) {
  if (!RPC || !PRIVATE_KEY || !NFT_ADDRESS) throw new Error('NFT envs missing');
  const provider = new ethers.JsonRpcProvider(RPC);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(NFT_ADDRESS, NFT_ABI, wallet);
  const tx = await contract.mintReceipt(toAddress, merkleRoot, attTxn);
  const receipt = await tx.wait();
  return { txHash: receipt.transactionHash, receipt };
}

module.exports = { mintSnapshot };
