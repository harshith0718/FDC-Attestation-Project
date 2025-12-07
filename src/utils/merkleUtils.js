// src/utils/merkleUtils.js
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

/**
 * Stable-hash a JS object by sorting keys before stringifying.
 * Returns Buffer (merkletreejs expects Buffer/Uint8Array)
 */
function stableHashObject(obj) {
  const sorted = sortObject(obj);
  const s = JSON.stringify(sorted);
  return keccak256(Buffer.from(s));
}

function sortObject(o) {
  if (Array.isArray(o)) return o.map(sortObject);
  if (o && typeof o === 'object') {
    return Object.keys(o).sort().reduce((r, k) => {
      r[k] = sortObject(o[k]);
      return r;
    }, {});
  }
  return o;
}

/**
 * Build a merkle tree from an array of JS objects.
 * Each object will be hashed with stableHashObject.
 * Returns { tree, rootHex, leavesHex }
 */
function buildMerkleFromObjects(objs) {
  const leaves = objs.map(o => stableHashObject(o));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getRoot(); // Buffer
  const rootHex = '0x' + root.toString('hex');
  const leavesHex = leaves.map(l => '0x' + l.toString('hex'));
  return { tree, rootHex, leavesHex };
}

/**
 * Get proof for a single object (same hashing)
 * Returns proof array (hex strings) and a boolean verification result
 */
function getProofForObject(tree, obj) {
  const leaf = stableHashObject(obj);
  const proof = tree.getProof(leaf).map(p => '0x' + p.data.toString('hex'));
  const root = tree.getRoot();
  const verified = tree.verify(tree.getProof(leaf), leaf, root);
  return { proof, verified, leaf: '0x' + leaf.toString('hex'), root: '0x' + root.toString('hex') };
}

module.exports = { stableHashObject, buildMerkleFromObjects, getProofForObject };
