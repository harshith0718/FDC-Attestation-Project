'use strict';

const $ = (id) => document.getElementById(id);

const sampleTxns = [
  { id: 1, amount: 1200.5, category: 'Salary', note: 'Monthly payout' },
  { id: 2, amount: -80.2, category: 'Food', note: 'Groceries' },
  { id: 3, amount: -35.0, category: 'Transport', note: 'Metro card' },
  { id: 4, amount: -15.5, category: 'Food', note: 'Snacks' },
  { id: 5, amount: 220.0, category: 'Refund', note: 'Tax refund' }
];

function setTextareaSample() {
  const el = $('transactions-input');
  el.value = JSON.stringify(sampleTxns, null, 2);
  el.focus();
}

function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2600);
}

function renderSummary(summary, snapshot) {
  if (!summary) {
    $('summary-content').innerHTML = '<div class="placeholder">No summary computed.</div>';
    return;
  }

  const categories = summary.totalsByCategory || {};
  const chips = Object.entries(categories)
    .map(([cat, value]) => `
      <div class="summary-pill">
        <span class="chip-label">${cat}</span>
        <span class="chip-value">${value.toFixed ? value.toFixed(2) : value}</span>
      </div>
    `)
    .join('');

  $('summary-content').innerHTML = `
    <div class="badge">
      <span class="badge-dot"></span>
      <span>Snapshot created at ${snapshot.createdAt}</span>
    </div>
    <div class="summary-grid">
      <div class="summary-pill">
        <span class="chip-label">Count</span>
        <span class="chip-value">${summary.count}</span>
      </div>
      <div class="summary-pill">
        <span class="chip-label">Total In</span>
        <span class="chip-value">${summary.totalIn.toFixed(2)}</span>
      </div>
      <div class="summary-pill">
        <span class="chip-label">Total Out</span>
        <span class="chip-value">${summary.totalOut.toFixed(2)}</span>
      </div>
      ${chips}
    </div>
  `;
}

function renderRoot(snapshot, proofs, verifierResponse) {
  if (!snapshot) {
    $('root-content').innerHTML = '<div class="placeholder">No root yet.</div>';
    return;
  }

  const shortRoot = snapshot.rootHex
    ? snapshot.rootHex.slice(0, 10) + '...' + snapshot.rootHex.slice(-6)
    : 'N/A';

  const proofPreview = (proofs || []).slice(0, 1)[0];

  $('root-content').innerHTML = `
    <div class="badge" style="margin-bottom: 6px;">
      <span class="badge-dot"></span>
      <span>Merkle Root</span>
    </div>
    <div class="code-block">
      <strong>rootHex</strong>: ${snapshot.rootHex || 'N/A'}<br/>
      <strong>count</strong>: ${snapshot.count}<br/>
      <strong>createdAt</strong>: ${snapshot.createdAt}
    </div>
    <div style="margin-top: 10px; font-size: 0.8rem; color: var(--muted);">
      Short: <strong>${shortRoot}</strong>
    </div>
    ${proofPreview ? `
      <div style="margin-top: 12px;">
        <div class="badge" style="margin-bottom: 4px;">
          <span class="badge-dot"></span>
          <span>Sample proof</span>
        </div>
        <div class="code-block">${escapeHtml(JSON.stringify(proofPreview, null, 2))}</div>
      </div>
    ` : ''}
    ${verifierResponse ? `
      <div style="margin-top: 12px;">
        <div class="badge" style="margin-bottom: 4px;">
          <span class="badge-dot"></span>
          <span>Verifier response</span>
        </div>
        <div class="code-block">${escapeHtml(JSON.stringify(verifierResponse, null, 2))}</div>
      </div>
    ` : ''}
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function handleAttestClick() {
  const input = $('transactions-input').value.trim();
  const errorEl = $('input-error');
  errorEl.textContent = '';

  if (!input) {
    errorEl.textContent = 'Please paste a JSON array of transactions.';
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch (e) {
    errorEl.textContent = 'Invalid JSON. Make sure it is a valid array.';
    return;
  }

  if (!Array.isArray(parsed) || !parsed.length) {
    errorEl.textContent = 'Expected a non-empty array of transactions.';
    return;
  }

  const btn = $('btn-attest');
  btn.disabled = true;
  btn.textContent = 'Generating...';

  try {
    const res = await fetch('/api/attest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactions: parsed })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Request failed');
    }

    const { snapshot, proofs, verifierResponse } = data;
    renderSummary(snapshot.summary, snapshot);
    renderRoot(snapshot, proofs, verifierResponse);
    showToast('Attestation generated successfully');
  } catch (err) {
    console.error(err);
    errorEl.textContent = err.message || 'Failed to generate attestation.';
    showToast('Attestation failed');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Generate attestation';
  }
}

function init() {
  $('btn-sample').addEventListener('click', setTextareaSample);
  $('btn-attest').addEventListener('click', handleAttestClick);

  const gaslessBtn = $('btn-gasless');
  if (gaslessBtn) {
    gaslessBtn.addEventListener('click', handleGaslessClick);
  }

  setTimeout(() => {
    document.querySelectorAll('.card').forEach((card) => {
      card.style.willChange = 'transform, box-shadow';
    });
  }, 600);
}

document.addEventListener('DOMContentLoaded', init);

async function handleGaslessClick() {
  const abi = $('gasless-abi').value.trim();
  const address = $('gasless-address').value.trim();
  const nonceRaw = $('gasless-nonce').value.trim();
  const signature = $('gasless-signature').value.trim();
  const errEl = $('gasless-error');
  const resultEl = $('gasless-result');

  errEl.textContent = '';

  if (!abi || !address || !signature) {
    errEl.textContent = 'ABI, address and signature are required.';
    return;
  }

  const nonce = nonceRaw === '' ? 0 : Number(nonceRaw);
  if (Number.isNaN(nonce) || nonce < 0) {
    errEl.textContent = 'Nonce must be a non-negative number.';
    return;
  }

  const btn = $('btn-gasless');
  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = 'Submitting...';

  try {
    const res = await fetch('/api/gasless/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        abiEncodedRequest: abi,
        userAddress: address,
        signature,
        nonce
      })
    });

    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'Gasless submit failed');
    }

    resultEl.innerHTML = escapeHtml(JSON.stringify(data, null, 2));
    showToast('Gasless transaction submitted');
  } catch (e) {
    console.error(e);
    errEl.textContent = e.message || 'Gasless submit failed';
    showToast('Gasless submit failed');
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}
