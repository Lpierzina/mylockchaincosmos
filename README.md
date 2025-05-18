# 🌌 MyLockChainCosmos

MyLockChainCosmos is your interstellar document vault — a decentralized registration platform that anchors your files into the Cosmos itself. Using CosmWasm smart contracts on Neutron, IPFS via Pinata, and PayPal for fiat payments, MyLockChainCosmos ensures your records live on chain and off-world. Gas fees are sponsored, so you can register proof-of-existence across the stars — no wallet required.

---

## 🚀 Overview

* **Frontend**: `index.html` + `submitUserOps.js`
* **Backend**: `server.js` (Node + Express + CosmJS + Nodemailer)
* **Blockchain**: Rust-based CosmWasm contract deployed on Neutron (Cosmos SDK chain)
* **Storage**: IPFS via Pinata
* **Payment**: PayPal (USD to cover IPFS pinning)
* **Gas**: \~0.012 NTRN per transaction (sponsored)

---

## ✅ Features

* Upload any document (PDF, JPG, PNG, MP4, etc.)
* Hash using SHA-256 (client-side)
* Store file on IPFS via Pinata
* Register hash to a Neutron smart contract (Rust)
* View or email your receipt (includes tx hash, IPFS CID, QR code)

---

## ⚖️ Security Model

* Hash is computed **client-side** before uploading
* Only the hash is sent to the blockchain, ensuring **file privacy**
* Rust smart contract saves the `document_hash`, `registrant`, and `timestamp`
* All timestamps are block-anchored and immutable

---

## 🌠 Base64 Conversion Explained

The CosmWasm smart contract on Neutron requires binary data (like hashes) to be submitted as base64-encoded strings. After the SHA-256 hash is computed as a hex string, we convert it into base64 before storing it on-chain.

Example Conversion:

SHA-256 Hash (Hex): 0x8b0d59e73034a7e2e37dbfd14d5dc79b01f40e9bc037f3d1f42ff01e70ff947f

Remove prefix: 8b0d59e73034a7e2e37dbfd14d5dc79b01f40e9bc037f3d1f42ff01e70ff947f

Convert to binary

Encode as base64: iw1Z5zA0p+Ljfb/RTX3Hmwf0DpvAN/PR9C/wHnD/lH8=

This format ensures compatibility with CosmWasm's binary type schema and guarantees smooth contract execution.

Receipts and emails include both the hex and base64 forms so users, validators, or third parties can verify or re-hash files using either representation.

---

## 🌟 Why Rust + Cosmos Over Solidity + Ethereum

Rust-powered CosmWasm on Neutron offers major advantages over Solidity + Ethereum setups:

🌐 Simpler Architecture

No complex ERC-4337 account abstraction.

No bundlers, paymasters, or signature relays needed.

No wallet setup required: MyLockChainCosmos is fully walletless + fiat-native.

⚖️ Lower Fees, Real Utility

Registering a hash costs just ~0.012 NTRN about $0.015 USD , not $10–$50 USD in gas on Ethereum.

Fees are sponsored by MyLockChain.io so users pay nothing for blockchain registration.

Makes on-chain notarization actually usable by professionals.

🔧 Developer Benefits

Rust offers type safety, compile-time checks, and performance unmatched by Solidity.

CosmWasm contracts are easier to formally verify.

Interoperates with any Cosmos chain (via IBC), enabling cross-chain notarization in the future.

✨ Token Ecosystem

$ATOM secures the Cosmos Hub.

$NTRN powers smart contracts on Neutron.

All MyLockChain activity contributes to growing the Cosmos Interchain.

## 🌠 Becoming a Top-Tier DApp in Cosmos

💫 Version Progression

V1 – Ethereum + MetaMask

Manual wallet flow on Ethereum Mainnet

Smart contract in Solidity (LockChainRegistry.sol)

UI connected to MetaMask/Coinbase Wallet

https://mytitlelock.netlify.app

V2 – Arbitrum + Pimlico + ERC-4337

Fully gasless UX with LightAccount v2 + EntryPoint v0.7

Uses factory/factoryData to deploy ephemeral wallets

Sponsored via Pimlico's pm_getPaymasterData API

Uses viem, permissionless.js, and PayPal integration

Nodemailer for auto-sent receipts

https://mylockchain.io

V3 – Cosmos + Neutron + CosmWasm (Rust)

Walletless, fiat-onboarding flow using PayPal

SHA-256 hashes converted to base64 for CosmWasm

Gas sponsored via backend signer (CosmJS + Express)

Smart contract written entirely in Rust

Deployed to Netlify (frontend) and Heroku (backend)

https://mylockchaincosmos.io
## ✈️ Flow Diagram (Mermaid Sequence)

```mermaid
sequenceDiagram
  participant User (Browser)
  participant Website (index.html + submitUserOps.js)
  participant PayPal
  participant Pinata (IPFS)
  participant Server (server.js)
  participant Contract (Rust Smart Contract on Neutron)
  participant Email (Nodemailer)

  User->>Website: Select and upload document
  Website->>Website: Compute SHA-256 hash
  Website->>PayPal: Trigger PayPal payment
  PayPal-->>Website: Confirm payment

  Website->>Pinata: Upload document to IPFS
  Pinata-->>Website: Return IPFS CID

  Website->>submitUserOp.js: Pass hashHex + IPFS CID
  submitUserOp.js->>Server: POST /cosmosSubmitDocument (hashHex only)
  Server->>Server: Convert hashHex to base64
  Server->>Contract: Register { document_hash (base64) }
  Contract->>Contract: Save registrant & timestamp
  Contract-->>Server: Return txHash

  Server-->>submitUserOp.js: Return txHash
  submitUserOp.js->>Server: POST /checkRegistration (retry loop)
  Server->>Contract: Query IsRegistered
  Contract-->>Server: true

  submitUserOp.js->>Server: POST /getDetails
  Server->>Contract: Query GetDetails
  Contract-->>Server: Return registrant & timestamp

  Server-->>submitUserOp.js: Return registration details
  submitUserOp.js->>Website: Render receipt (CID, hash, txHash, QR)
  Website->>User: Show receipt + email input field

  User->>Website: Enter email + click "Send Receipt"
  Website->>Server: POST /sendReceipt (receipt + email)
  Server->>Email: Send via nodemailer
  Email-->>User: 📩 Receipt delivered to inbox

  Note over Contract: Rust Smart Contract on Neutron\nGas: ~0.012 NTRN per tx\nSponsored by MyLockChainCosmos
```

---

## 🏛 Smart Contract Modules

* `contract.rs` - handles instantiation, execution, and queries
* `msg.rs` - defines `Register`, `GetDetails`, and `IsRegistered` message types
* `state.rs` - stores mappings for document hash to registrant and timestamp
* `helpers.rs` - utility logic for hash encoding
* `error.rs` - custom contract errors
* `lib.rs` - entry point for compilation

---

## ⚖️ Example Receipt (UI or Email)

```
📄 LockChain Registration Receipt

File Name: title_deed.pdf
IPFS CID: QmXYZ...
Document Hash: 0xabc123...
Registered By: neutron1...
Timestamp: 2024-05-16 14:23:00
Contract: https://www.mintscan.io/neutron/account/neutron1...
Transaction: https://www.mintscan.io/neutron/tx/ABCDEF123...
```

---

## ✉️ Email Delivery (Nodemailer)

When the user enters their email, `server.js` sends a structured HTML email using Gmail + App Password:

* Uses `EMAIL_USER` + `EMAIL_PASS` from `.env`
* HTML body matches on-screen receipt
* Delivered to inbox with subject: `Your LockChain Receipt for "filename.pdf"`

---

## 🚪 Privacy

* No documents are stored on-chain
* Hashing is deterministic, privacy-preserving
* Email is stored client-side only (via localStorage) and never persisted

---

## 🌌 Powered By

* [Neutron](https://neutron.org/) - CosmWasm smart contracts on Cosmos
* [Pinata](https://www.pinata.cloud/) - IPFS file pinning
* [PayPal](https://paypal.com) - User-friendly fiat payments
* [CosmJS](https://github.com/cosmos/cosmjs) - JS library for interacting with CosmWasm contracts
* [Nodemailer](https://nodemailer.com/) - Email receipts

---

## 🔧 Setup (Backend)

```bash
# Install dependencies
npm install

# Set up .env file
COSMOS_MNEMONIC=...
COSMOS_RPC=https://...
CONTRACT_ADDRESS=neutron1...
EMAIL_USER=...
EMAIL_PASS=...

# Start the server
node server.js
```

---

## 🌐 Frontend Hosting

The entire `index.html` + assets can be deployed to [Netlify](https://netlify.app), Vercel, or GitHub Pages.

---

## 🏦 Contact

Email: [contact@mylockchain.io](mailto:Luke@mylockchain.io)

