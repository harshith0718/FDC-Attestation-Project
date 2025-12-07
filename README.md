# FDC Attestation Dashboard

JSON-based attestation and visualization service for FDC-style Merkle roots, with:

- Express backend for building Merkle trees and exposing REST APIs.
- React + Vite frontend dashboard with visualizations and demo data.
- Gasless attestation demo flow (EIP-712 signature + optional on-chain submit).
- Optional FTSO price lookup integration for asset data.

This is designed as a hackathon-friendly, end-to-end MVP.

## Features

- JSON transactions → Merkle tree snapshot (`rootHex`, proofs, summary).
- Snapshot summary (totals, per-category breakdown).
- Visual spending breakdown chart (category bars).
- Gasless request demo using EIP-712 typed data.
- Snapshot history, export as JSON, and copyable human summary.
- Status bar (API + gasless status, demo/dev toggles).
- Optional FTSO price card fetching oracle prices from a configured FTSO.

## Prerequisites

- Node.js (v16 or higher recommended).
- npm.

For FTSO + real gasless on-chain mode:

- RPC endpoint (e.g. FLR/Coston).
- FTSO contract address and ABI compatibility.
- FDCHub contract address and relayer private key.

## Installation

Clone and install backend dependencies:

```bash
git clone <repository-url>
cd fdc-attestation
npm install
```

Set up environment in `.env` at the project root (minimal demo):

```ini
PORT=3000

# Demo gasless mode (no real transaction is sent when true)
DEMO_GASLESS=true

# Optional: configure for real gasless submissions
# RELAYER_PRIVATE_KEY=0x...
# RPC=https://...
# FDCHUB_ADDRESS=0x...

# Optional FTSO integration
# RPC can be shared with above
# FTSO_ADDRESS=0x...
# FTSO_DECIMALS=8
```

## Running the backend

From the project root:

```bash
npm run dev   # or: npm start
```

This starts the Express API on `http://localhost:3000`.

### Key API endpoints

- `GET /api` – health check.
- `POST /api/attest` – build Merkle tree from `{ transactions: [...] }`.
- `POST /api/proof` – get proof for a transaction.
- `POST /api/gasless/submit` – verify EIP-712 and (optionally) submit to FDCHub.
- `GET /api/ftso/price?asset=USD` – fetch current price for an asset via FTSO (requires RPC + FTSO_ADDRESS).

## Frontend (React + Vite dashboard)

The dashboard lives in `frontend/` and runs as a separate dev server, proxied to the backend.

Install and run:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

The Vite dev server proxies `/api` requests to `http://localhost:3000`.

## Demo walkthrough

1. **Status and overview**
   - Check top status bar: `API online`, gasless status, and toggles for `Demo mode` and `Dev view`.
   - Overview cards show total attestations, gasless submits, and last Merkle root.

2. **Attestation flow (with demo data)**
   - In the "Transactions JSON" card, click **Load sample**.
   - Click **Generate attestation**.
   - The dashboard updates with:
     - Snapshot summary chips (count, total in/out, per-category totals).
     - Spending breakdown chart (animated bars by category).
     - Merkle root & proofs card with:
       - Full `rootHex`, short root, and metadata.
       - **Copy root** and **Copy summary** actions.
       - **Export JSON** to download the snapshot file.

3. **Gasless flow (demo mode)**
   - Scroll to "Gasless attestation (relayed)".
   - Click **Demo payload** to generate an EIP-712 signature and auto-fill the form.
   - Click **Submit gasless request**.
   - In demo mode, the backend returns a mocked tx (with `demo: true`), and the dashboard:
     - Shows the tx hash and block number.
     - Updates gasless counters and recent activity.

4. **History and explainability**
   - **Recent activity**: view recent attestation and gasless actions.
   - **Snapshot history**: see a list of previous snapshots (root, count, timestamp). Click an item to load it back into the main view.
   - **How this works** card: a short explanation of the pipeline. Enable **Dev view** to see raw JSON for the last snapshot and gasless result.

5. **FTSO price card (optional)**
   - Configure `RPC`, `FTSO_ADDRESS`, and `FTSO_DECIMALS` in `.env` to point at a valid FTSO.
   - In the "Oracle price (FTSO demo)" card on the dashboard:
     - Enter an asset id (e.g. `USD`, `BTC`, `FLR`).
     - Click **Fetch price**.
     - The card will display `{ asset, price, timestamp }` from `GET /api/ftso/price`.

## Testing

From the project root:

```bash
npm test
```

## License

MIT
