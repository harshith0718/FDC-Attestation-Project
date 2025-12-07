import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

const sampleTxns = [
  { id: 1, amount: 1200.5, category: 'Salary', note: 'Monthly payout' },
  { id: 2, amount: -80.2, category: 'Food', note: 'Groceries' },
  { id: 3, amount: -35.0, category: 'Transport', note: 'Metro card' },
  { id: 4, amount: -15.5, category: 'Food', note: 'Snacks' },
  { id: 5, amount: 220.0, category: 'Refund', note: 'Tax refund' }
];

function App() {
  const [transactionsJson, setTransactionsJson] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [inputError, setInputError] = useState('');
  const [snapshot, setSnapshot] = useState(null);
  const [proofs, setProofs] = useState([]);
  const [verifierResponse, setVerifierResponse] = useState(null);
  const [loadingAttest, setLoadingAttest] = useState(false);

  const [gaslessAbi, setGaslessAbi] = useState('');
  const [gaslessAddress, setGaslessAddress] = useState('');
  const [gaslessNonce, setGaslessNonce] = useState('');
  const [gaslessSignature, setGaslessSignature] = useState('');
  const [gaslessError, setGaslessError] = useState('');
  const [gaslessResult, setGaslessResult] = useState('');
  const [loadingGasless, setLoadingGasless] = useState(false);

  const [toast, setToast] = useState('');

  const [attestationCount, setAttestationCount] = useState(0);
  const [gaslessCount, setGaslessCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);

  const [snapshotHistory, setSnapshotHistory] = useState([]);

  const [backendHealthy, setBackendHealthy] = useState(true);
  const [gaslessConfigured, setGaslessConfigured] = useState(true);
  const [demoMode, setDemoMode] = useState(true);
  const [devView, setDevView] = useState(false);

  const [copiedKey, setCopiedKey] = useState('');

  const [ftsoAsset, setFtsoAsset] = useState('USD');
  const [ftsoPrice, setFtsoPrice] = useState(null);
  const [ftsoLoading, setFtsoLoading] = useState(false);
  const [ftsoError, setFtsoError] = useState('');

  const [fassetsAddress, setFassetsAddress] = useState('0xDemoUserAddress');
  const [fassetsPortfolio, setFassetsPortfolio] = useState(null);
  const [fassetsLoading, setFassetsLoading] = useState(false);
  const [fassetsError, setFassetsError] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const copyToClipboard = async (key, value) => {
    try {
      await navigator.clipboard.writeText(String(value));
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1500);
    } catch {
      showToast('Copy failed');
    }
  };

  const handleFetchFassets = async () => {
    setFassetsError('');
    setFassetsLoading(true);
    try {
      const res = await axios.get('/api/fassets/portfolio', {
        params: { address: fassetsAddress || '0xDemoUserAddress' },
      });
      if (!res.data?.ok) throw new Error(res.data?.error || 'F-assets request failed');
      setFassetsPortfolio(res.data);
      showToast('F-assets portfolio fetched');
    } catch (e) {
      console.error(e);
      setFassetsError(e.message || 'Failed to fetch F-assets portfolio');
      setFassetsPortfolio(null);
      showToast('F-assets request failed');
    } finally {
      setFassetsLoading(false);
    }
  };

  const pushActivity = (entry) => {
    setRecentActivity((prev) => {
      const next = [
        { id: Date.now(), ...entry },
        ...prev,
      ];
      return next.slice(0, 6);
    });
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem('fdc-dashboard-state');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed) {
        setAttestationCount(parsed.attestationCount || 0);
        setGaslessCount(parsed.gaslessCount || 0);
        setRecentActivity(parsed.recentActivity || []);
        if (parsed.snapshot) setSnapshot(parsed.snapshot);
        if (parsed.gaslessResult) setGaslessResult(parsed.gaslessResult);
        setSnapshotHistory(parsed.snapshotHistory || []);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const payload = {
      attestationCount,
      gaslessCount,
      recentActivity,
      snapshot,
      gaslessResult,
      snapshotHistory,
    };
    try {
      window.localStorage.setItem('fdc-dashboard-state', JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [attestationCount, gaslessCount, recentActivity, snapshot, gaslessResult, snapshotHistory]);

  useEffect(() => {
    const ping = async () => {
      try {
        await axios.get('/api');
        setBackendHealthy(true);
      } catch {
        setBackendHealthy(false);
      }
    };
    ping();
  }, []);

  useEffect(() => {
    // lightweight check: if any gasless call ever failed with env error, flag it; otherwise assume ok
    if (!gaslessResult) return;
    try {
      const parsed = JSON.parse(gaslessResult);
      if (parsed?.ok) setGaslessConfigured(true);
    } catch {
      // ignore
    }
  }, [gaslessResult]);

  const handleLoadSample = () => {
    setTransactions(sampleTxns);
    setTransactionsJson(JSON.stringify(sampleTxns, null, 2));
    setInputError('');
  };

  const handleAttest = async () => {
    setInputError('');
    let parsed;

    if (!transactionsJson.trim()) {
      setInputError('Please paste a JSON array of transactions.');
      return;
    }

    try {
      parsed = JSON.parse(transactionsJson);
    } catch {
      setInputError('Invalid JSON. Make sure it is a valid array.');
      return;
    }

    if (!Array.isArray(parsed) || !parsed.length) {
      setInputError('Expected a non-empty array of transactions.');
      return;
    }

    setLoadingAttest(true);

    try {
      const res = await axios.post('/api/attest', { transactions: parsed });
      if (!res.data?.ok) throw new Error(res.data?.error || 'Request failed');

      setSnapshot(res.data.snapshot);
      setProofs(res.data.proofs || []);
      setVerifierResponse(res.data.verifierResponse || null);
      setAttestationCount((c) => c + 1);
      setSnapshotHistory((prev) => {
        const entry = {
          id: Date.now(),
          rootHex: res.data.snapshot?.rootHex,
          count: res.data.snapshot?.count,
          createdAt: res.data.snapshot?.createdAt,
        };
        const existing = prev.filter((h) => h.rootHex !== entry.rootHex);
        return [entry, ...existing].slice(0, 10);
      });
      pushActivity({
        type: 'attest',
        ts: new Date().toISOString(),
        meta: {
          count: res.data.snapshot?.count,
          root: res.data.snapshot?.rootHex,
        },
      });
      showToast('Attestation generated successfully');
    } catch (e) {
      console.error(e);
      setInputError(e.message || 'Failed to generate attestation.');
      showToast('Attestation failed');
    } finally {
      setLoadingAttest(false);
    }
  };

  const syncTransactionsToJson = (txs) => {
    setTransactions(txs);
    try {
      setTransactionsJson(JSON.stringify(txs, null, 2));
    } catch {
      // ignore stringify errors
    }
  };

  const handleGenerateDemoGasless = async () => {
    setGaslessError('');
    try {
      const demoPk = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // demo only
      const wallet = new ethers.Wallet(demoPk);
      const enc = new TextEncoder();
      const bytes = enc.encode('demo-abi-payload');
      const demoAbi = ethers.hexlify(bytes);
      const nonceVal = 1;

      const domain = { name: 'FDC Attestation', version: '1' };
      const types = {
        AttestRequest: [
          { name: 'abi', type: 'bytes' },
          { name: 'nonce', type: 'uint256' },
        ],
      };
      const value = { abi: demoAbi, nonce: nonceVal };

      const signature = await wallet.signTypedData(domain, types, value);

      setGaslessAbi(demoAbi);
      setGaslessAddress(wallet.address);
      setGaslessNonce(String(nonceVal));
      setGaslessSignature(signature);
      showToast('Demo gasless payload generated');
    } catch (e) {
      console.error(e);
      setGaslessError('Failed to generate demo gasless payload');
    }
  };

  const handleGaslessSubmit = async () => {
    setGaslessError('');

    if (!gaslessAbi.trim() || !gaslessAddress.trim() || !gaslessSignature.trim()) {
      setGaslessError('ABI, address and signature are required.');
      return;
    }

    const nonceVal = gaslessNonce.trim() === '' ? 0 : Number(gaslessNonce.trim());
    if (Number.isNaN(nonceVal) || nonceVal < 0) {
      setGaslessError('Nonce must be a non-negative number.');
      return;
    }

    setLoadingGasless(true);

    try {
      const res = await axios.post('/api/gasless/submit', {
        abiEncodedRequest: gaslessAbi.trim(),
        userAddress: gaslessAddress.trim(),
        signature: gaslessSignature.trim(),
        nonce: nonceVal
      });

      if (!res.data?.ok) throw new Error(res.data?.error || 'Gasless submit failed');

      setGaslessResult(JSON.stringify(res.data, null, 2));
      setGaslessCount((c) => c + 1);
      pushActivity({
        type: 'gasless',
        ts: new Date().toISOString(),
        meta: {
          txHash: res.data.txHash,
          blockNumber: res.data.blockNumber,
        },
      });
      showToast('Gasless transaction submitted');
    } catch (e) {
      console.error(e);
      setGaslessError(e.message || 'Gasless submit failed');
      showToast('Gasless submit failed');
    } finally {
      setLoadingGasless(false);
    }
  };

  const summary = snapshot?.summary;
  const categories = summary?.totalsByCategory || {};
  const categoryEntries = Object.entries(categories);
  const maxCategoryAbs = categoryEntries.length
    ? Math.max(...categoryEntries.map(([, v]) => Math.abs(v || 0))) || 1
    : 1;
  const proofPreview = proofs[0];

  const shortRoot = snapshot?.rootHex
    ? `${snapshot.rootHex.slice(0, 10)}...${snapshot.rootHex.slice(-6)}`
    : 'N/A';

  const handleDownloadSnapshot = () => {
    if (!snapshot) return;
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `snapshot-${snapshot.createdAt || 'latest'}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    if (!snapshot) return;
    const summaryText = `Merkle root: ${snapshot.rootHex}\nCount: ${snapshot.count}\nCreated at: ${snapshot.createdAt}`;
    copyToClipboard('summary', summaryText);
  };

  const handleAddTransactionRow = () => {
    const next = [...transactions, { amount: 0, category: 'Misc', note: '' }];
    syncTransactionsToJson(next);
  };

  const handleUpdateTransactionRow = (index, field, value) => {
    const next = transactions.map((tx, i) => (i === index ? { ...tx, [field]: value } : tx));
    syncTransactionsToJson(next);
  };

  const handleRemoveTransactionRow = (index) => {
    const next = transactions.filter((_, i) => i !== index);
    syncTransactionsToJson(next);
  };

  useEffect(() => {
    if (!transactionsJson.trim()) {
      setTransactions([]);
      return;
    }
    try {
      const parsed = JSON.parse(transactionsJson);
      if (Array.isArray(parsed)) {
        setTransactions(parsed);
      }
    } catch {
      // leave transactions as-is on parse error
    }
  }, []);

  const handleFetchFtsoPrice = async () => {
    setFtsoError('');
    setFtsoLoading(true);
    try {
      const res = await axios.get('/api/ftso/price', { params: { asset: ftsoAsset || 'USD' } });
      if (!res.data?.ok) throw new Error(res.data?.error || 'FTSO request failed');
      setFtsoPrice({ price: res.data.price, timestamp: res.data.timestamp, asset: res.data.asset });
      showToast('FTSO price fetched');
    } catch (e) {
      console.error(e);
      setFtsoError(e.message || 'Failed to fetch FTSO price');
      setFtsoPrice(null);
      showToast('FTSO request failed');
    } finally {
      setFtsoLoading(false);
    }
  };

  return (
    <div id="app">
      <div className="top-bar">
        <div className="status-group">
          <span className={`status-pill ${backendHealthy ? 'ok' : 'bad'}`}>
            <span className="status-dot" />
            API {backendHealthy ? 'online' : 'offline'}
          </span>
          <span className={`status-pill ${gaslessConfigured ? 'ok' : 'warn'}`}>
            <span className="status-dot" />
            Gasless {gaslessConfigured ? 'ready' : 'check env'}
          </span>
        </div>
        <div className="toggle-group">
          <button
            type="button"
            className={`chip-toggle ${demoMode ? 'active' : ''}`}
            onClick={() => setDemoMode((v) => !v)}
          >
            Demo mode
          </button>
          <button
            type="button"
            className={`chip-toggle ${devView ? 'active' : ''}`}
            onClick={() => setDevView((v) => !v)}
          >
            Dev view
          </button>
        </div>
      </div>
      <header className="app-header fade-in">
        <div className="logo-orbit">
          <span className="logo-dot" />
        </div>
        <div className="title-block">
          <h1>FDC Attestation</h1>
          <p>Create Merkle-based attestations from your transaction data.</p>
        </div>
      </header>

      <section className="overview-row slide-up">
        <div className="overview-card">
          <div className="overview-label">Total attestations</div>
          <div className="overview-value">{attestationCount}</div>
          <div className="overview-sub">Last count: {snapshot?.count ?? '—'}</div>
        </div>
        <div className="overview-card">
          <div className="overview-label">Gasless submits</div>
          <div className="overview-value">{gaslessCount}</div>
          <div className="overview-sub">
            Last tx: {gaslessResult ? 'seen' : '—'}
          </div>
        </div>
        <div className="overview-card">
          <div className="overview-label">Last Merkle root</div>
          <div className="overview-value small">
            {snapshot?.rootHex ? shortRoot : '—'}
          </div>
          <div className="overview-sub">
            Updated: {snapshot?.createdAt ?? '—'}
          </div>
        </div>
      </section>

      <main className="app-main">
        <section className="card slide-up" id="input-card">
          <h2>1. Transactions JSON</h2>
          <p className="help-text">
            Paste an array of transaction objects. Each object can have <code>amount</code>, <code>category</code>, etc.
          </p>
          <div className="tx-editor">
            <div className="tx-editor-header">
              <span>Transaction editor</span>
              <button type="button" className="chip-link" onClick={handleAddTransactionRow}>
                + Add row
              </button>
            </div>
            {transactions.length === 0 ? (
              <div className="placeholder tx-editor-empty">No rows yet. Add a row or load sample data.</div>
            ) : (
              <div className="tx-table">
                <div className="tx-row tx-row-head">
                  <span>Amount</span>
                  <span>Category</span>
                  <span>Note</span>
                  <span />
                </div>
                {transactions.map((tx, idx) => (
                  <div key={idx} className="tx-row">
                    <input
                      type="number"
                      className="tx-input"
                      value={tx.amount ?? ''}
                      onChange={(e) => handleUpdateTransactionRow(idx, 'amount', e.target.value)}
                    />
                    <input
                      type="text"
                      className="tx-input"
                      value={tx.category ?? ''}
                      onChange={(e) => handleUpdateTransactionRow(idx, 'category', e.target.value)}
                    />
                    <input
                      type="text"
                      className="tx-input"
                      value={tx.note ?? ''}
                      onChange={(e) => handleUpdateTransactionRow(idx, 'note', e.target.value)}
                    />
                    <button
                      type="button"
                      className="chip-link tx-remove"
                      onClick={() => handleRemoveTransactionRow(idx)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <textarea
            spellCheck="false"
            value={transactionsJson}
            onChange={(e) => setTransactionsJson(e.target.value)}
          />
          <div className="card-actions">
            <button className="btn ghost" onClick={handleLoadSample} type="button">
              Load sample
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={handleAttest}
              disabled={loadingAttest}
            >
              {loadingAttest ? 'Generating…' : 'Generate attestation'}
            </button>
          </div>
          <p className="error-text">{inputError}</p>
        </section>

        <section className="card slide-up delay-1" id="summary-card">
          <h2>2. Snapshot summary</h2>
          {!snapshot ? (
            <div className="placeholder">No snapshot yet.</div>
          ) : (
            <>
              <div className="badge">
                <span className="badge-dot" />
                <span>Snapshot created at {snapshot.createdAt}</span>
              </div>
              <div className="summary-grid">
                <div className="summary-pill">
                  <span className="chip-label">Count</span>
                  <span className="chip-value">{summary.count}</span>
                </div>
                <div className="summary-pill">
                  <span className="chip-label">Total In</span>
                  <span className="chip-value">{summary.totalIn.toFixed(2)}</span>
                </div>
                <div className="summary-pill">
                  <span className="chip-label">Total Out</span>
                  <span className="chip-value">{summary.totalOut.toFixed(2)}</span>
                </div>
                {Object.entries(categories).map(([cat, value]) => (
                  <div key={cat} className="summary-pill">
                    <span className="chip-label">{cat}</span>
                    <span className="chip-value">{value.toFixed ? value.toFixed(2) : value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="card slide-up delay-2" id="viz-card">
          <h2>3. Spending breakdown</h2>
          {!snapshot || categoryEntries.length === 0 ? (
            <div className="placeholder">Run an attestation to see the category breakdown.</div>
          ) : (
            <div className="viz-bars">
              {categoryEntries.map(([cat, value]) => {
                const abs = Math.abs(value || 0);
                const width = `${(abs / maxCategoryAbs) * 100}%`;
                const signLabel = value >= 0 ? 'inflow' : 'outflow';
                return (
                  <div key={cat} className="viz-row">
                    <div className="viz-label">
                      <span>{cat}</span>
                      <span className="viz-amount">{value.toFixed ? value.toFixed(2) : value} ({signLabel})</span>
                    </div>
                    <div className="viz-bar-bg">
                      <div className="viz-bar-fill" style={{ width }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card slide-up delay-2" id="root-card">
          <h2>4. Merkle root &amp; proofs</h2>
          {!snapshot ? (
            <div className="placeholder">Run an attestation to see the Merkle root.</div>
          ) : (
            <>
              <div className="badge" style={{ marginBottom: 6 }}>
                <span className="badge-dot" />
                <span>Merkle Root</span>
              </div>
              <div className="code-block">
                <strong>rootHex</strong>: {snapshot.rootHex || 'N/A'}
                <br />
                <strong>count</strong>: {snapshot.count}
                <br />
                <strong>createdAt</strong>: {snapshot.createdAt}
              </div>
              <div style={{ marginTop: 10, fontSize: '0.8rem', color: 'var(--muted)' }}>
                Short: <strong>{shortRoot}</strong>
                <button
                  type="button"
                  className="chip-link"
                  onClick={() => copyToClipboard('root', snapshot.rootHex)}
                >
                  {copiedKey === 'root' ? 'Copied' : 'Copy root'}
                </button>
              </div>
              <div className="root-actions">
                <button
                  type="button"
                  className="chip-link"
                  onClick={handleCopySummary}
                >
                  {copiedKey === 'summary' ? 'Copied summary' : 'Copy summary'}
                </button>
                <button
                  type="button"
                  className="chip-link"
                  onClick={handleDownloadSnapshot}
                >
                  Export JSON
                </button>
              </div>
              {proofPreview && (
                <div style={{ marginTop: 12 }}>
                  <div className="badge" style={{ marginBottom: 4 }}>
                    <span className="badge-dot" />
                    <span>Sample proof</span>
                  </div>
                  <div className="code-block">
                    <pre>{JSON.stringify(proofPreview, null, 2)}</pre>
                  </div>
                </div>
              )}
              {verifierResponse && (
                <div style={{ marginTop: 12 }}>
                  <div className="badge" style={{ marginBottom: 4 }}>
                    <span className="badge-dot" />
                    <span>Verifier response</span>
                  </div>
                  <div className="code-block">
                    <pre>{JSON.stringify(verifierResponse, null, 2)}</pre>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        <section className="card slide-up delay-2" id="gasless-card">
          <h2>4. Gasless attestation (relayed)</h2>
          <p className="help-text">
            Paste the ABI-encoded request and signing details to simulate a gasless submit via the backend relayer.
          </p>

          <label className="field-label" htmlFor="gasless-abi">
            ABI encoded request
          </label>
          <textarea
            className="small"
            id="gasless-abi"
            spellCheck="false"
            placeholder="0x..."
            value={gaslessAbi}
            onChange={(e) => setGaslessAbi(e.target.value)}
          />

          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="gasless-address">
                User address
              </label>
              <input
                id="gasless-address"
                type="text"
                placeholder="0xYourUserAddress"
                value={gaslessAddress}
                onChange={(e) => setGaslessAddress(e.target.value)}
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="gasless-nonce">
                Nonce
              </label>
              <input
                id="gasless-nonce"
                type="number"
                min={0}
                placeholder="0"
                value={gaslessNonce}
                onChange={(e) => setGaslessNonce(e.target.value)}
              />
            </div>
          </div>

          <label className="field-label" htmlFor="gasless-signature">
            Signature
          </label>
          <textarea
            className="small"
            id="gasless-signature"
            spellCheck="false"
            placeholder="0xSignature"
            value={gaslessSignature}
            onChange={(e) => setGaslessSignature(e.target.value)}
          />

          <div className="card-actions">
            <button
              type="button"
              className="btn ghost"
              onClick={handleGenerateDemoGasless}
            >
              Demo payload
            </button>
            <button
              id="btn-gasless"
              className="btn primary"
              type="button"
              onClick={handleGaslessSubmit}
              disabled={loadingGasless}
            >
              {loadingGasless ? 'Submitting…' : 'Submit gasless request'}
            </button>
          </div>
          <p className="error-text">{gaslessError}</p>

          <div id="gasless-result" className="code-block" style={{ marginTop: 8, minHeight: 40 }}>
            {gaslessResult ? (
              <>
                <pre>{gaslessResult}</pre>
                <button
                  type="button"
                  className="chip-link"
                  onClick={() => copyToClipboard('gasless', gaslessResult)}
                >
                  {copiedKey === 'gasless' ? 'Copied' : 'Copy result'}
                </button>
              </>
            ) : (
              <span className="placeholder">No gasless transaction submitted yet.</span>
            )}
          </div>
        </section>

        <section className="card slide-up delay-2" id="fassets-card">
          <h2>7. F-assets portfolio (demo)</h2>
          <p className="help-text">Fetch a demo F-assets portfolio for an address. In a production setup this would query F-asset contracts.</p>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="fassets-address">Address</label>
              <input
                id="fassets-address"
                type="text"
                placeholder="0x..."
                value={fassetsAddress}
                onChange={(e) => setFassetsAddress(e.target.value)}
              />
            </div>
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="btn primary"
                onClick={handleFetchFassets}
                disabled={fassetsLoading}
              >
                {fassetsLoading ? 'Fetching…' : 'Fetch portfolio'}
              </button>
            </div>
          </div>
          <p className="error-text">{fassetsError}</p>
          <div className="code-block" style={{ marginTop: 8, minHeight: 40 }}>
            {fassetsPortfolio ? (
              <pre>{JSON.stringify(fassetsPortfolio, null, 2)}</pre>
            ) : (
              <span className="placeholder">No F-assets portfolio fetched yet.</span>
            )}
          </div>
        </section>

        <section className="card slide-up delay-2" id="activity-card">
          <h2>5. Recent activity</h2>
          {recentActivity.length === 0 ? (
            <div className="placeholder">No activity yet. Run an attestation or gasless submit.</div>
          ) : (
            <ul className="activity-list">
              {recentActivity.map((item) => (
                <li key={item.id} className="activity-item">
                  <div className="activity-main">
                    <span className={`activity-pill activity-pill-${item.type}`}>
                      {item.type === 'attest' ? 'Attestation' : 'Gasless'}
                    </span>
                    <span className="activity-meta">
                      {item.type === 'attest' && item.meta?.count != null && (
                        <>count: {item.meta.count}</>
                      )}
                      {item.type === 'gasless' && item.meta?.txHash && (
                        <>tx: {String(item.meta.txHash).slice(0, 10)}...</>
                      )}
                    </span>
                  </div>
                  <div className="activity-time">{new Date(item.ts).toLocaleTimeString()}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card slide-up delay-2" id="ftso-card">
          <h2>6. Oracle price (FTSO demo)</h2>
          <p className="help-text">Fetch a current price for an asset id via the FTSO client (requires RPC + FTSO_ADDRESS in .env).</p>
          <div className="field-row">
            <div className="field">
              <label className="field-label" htmlFor="ftso-asset">Asset id</label>
              <input
                id="ftso-asset"
                type="text"
                placeholder="e.g. USD, BTC, FLR"
                value={ftsoAsset}
                onChange={(e) => setFtsoAsset(e.target.value)}
              />
            </div>
            <div className="field" style={{ alignSelf: 'flex-end' }}>
              <button
                type="button"
                className="btn primary"
                onClick={handleFetchFtsoPrice}
                disabled={ftsoLoading}
              >
                {ftsoLoading ? 'Fetching…' : 'Fetch price'}
              </button>
            </div>
          </div>
          <p className="error-text">{ftsoError}</p>
          <div className="code-block" style={{ marginTop: 8, minHeight: 40 }}>
            {ftsoPrice ? (
              <pre>{JSON.stringify(ftsoPrice, null, 2)}</pre>
            ) : (
              <span className="placeholder">No FTSO price fetched yet.</span>
            )}
          </div>
        </section>

        <section className="card slide-up delay-2" id="history-card">
          <h2>8. Snapshot history</h2>
          {snapshotHistory.length === 0 ? (
            <div className="placeholder">No snapshots yet. Generate an attestation to start history.</div>
          ) : (
            <ul className="history-list">
              {snapshotHistory.map((h) => (
                <li
                  key={h.id}
                  className="history-item"
                  onClick={() => {
                    if (!h.rootHex) return;
                    setSnapshot((prev) => ({ ...(prev || {}), ...h }));
                    showToast('Loaded snapshot from history');
                  }}
                >
                  <div className="history-main">
                    <span className="history-root">{h.rootHex ? `${h.rootHex.slice(0, 10)}...` : '—'}</span>
                    <span className="history-meta">count: {h.count ?? '—'}</span>
                  </div>
                  <div className="history-time">{h.createdAt || 'unknown time'}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card slide-up delay-2" id="explain-card">
          <h2>9. How this works</h2>
          <ol className="explain-list">
            <li><strong>Step 1:</strong> You provide off-chain data (transactions JSON).</li>
            <li><strong>Step 2:</strong> Backend builds a Merkle tree and returns the <code>rootHex</code> and proofs.</li>
            <li><strong>Step 3:</strong> For FDC, this root can be submitted on-chain (direct or gasless via relayer).</li>
            <li><strong>Step 4:</strong> Later, proofs are used to verify individual records against the committed root.</li>
          </ol>
          {devView && (
            <div className="code-block" style={{ marginTop: 8 }}>
              <pre>{JSON.stringify({
                latestSnapshot: snapshot,
                latestGasless: gaslessResult ? JSON.parse(gaslessResult) : null,
              }, null, 2)}</pre>
            </div>
          )}
        </section>
      </main>

      {toast && (
        <div className="toast show">{toast}</div>
      )}
    </div>
  );
}

export default App;
