

# 🧱 DataChain AI – MVP Development Instructions (Milestone 2)

*
**Target:** Functional testnet MVP of a decentralized AI dataset marketplace

---

## ✅ Product Summary

**What is DataChain AI?**
DataChain AI is a decentralized marketplace for high-quality AI training data, built on the Polygon blockchain. It enables data providers to list anonymized datasets and monetize them through smart contract-enforced sales, while AI developers can access diverse, verified datasets at lower cost and with greater transparency.

---

## 🎯 Milestone 2 Objectives & Deliverables

### 1. **Smart Contracts (Polygon Mumbai Testnet)**

You will build and deploy the following smart contracts using **Solidity**:

#### a. **Marketplace Module**

* Enables dataset listing and purchasing
* Key functions:

  * `listDataset(metadataHash, price)`
  * `purchaseDataset(datasetId)`
  * `withdrawFunds()`
* Emit events for listing and purchases (`DatasetListed`, `DatasetPurchased`)

#### b. **Reputation Module**

* Maintains user reputation based on successful transactions and ratings
* Key functions:

  * `submitRating(buyer, datasetId, score, review)`
  * `getReputation(address)`
* Optional: Add modifiers to limit spam reviews (e.g., only purchasers can rate)

#### c. **Incentive Module**

* Rewards early adopters and contributors (using mock tokens or points)
* Key functions:

  * `distributeReward(address user, uint amount)`
  * `claimReward()`
* This can use an in-MVP test token (ERC-20 standard on Mumbai)

### Tools/Standards:

* Solidity (v0.8.x)
* OpenZeppelin contracts
* Hardhat or Foundry for development and testing

---

### 2. **Decentralized Storage Integration (IPFS)**

Use **IPFS (via Pinata, web3.storage, or Infura IPFS gateway)** to store datasets off-chain.

#### Requirements:

* When a dataset is listed, upload metadata and placeholder content to IPFS
* Store only the IPFS content hash (CID) on-chain
* Include:

  * Dataset title, description, preview sample, and schema info in metadata
  * Pointers to actual file location

> Note: Full datasets should be referenced via IPFS links, but not uploaded directly in this MVP (use mock/simulated files).

---

### 3. **Web Portal (Frontend MVP)**

Use **React + Ethers.js/Web3.js** for a basic but functional frontend.

#### UI Screens:

* **Home / Marketplace View** – list of datasets (mock entries and real testnet entries)
* **Dataset Detail Page** – metadata, IPFS link, purchase button
* **List Dataset Page** – form to upload metadata and create listing
* **User Dashboard** – past purchases, reputation, rewards

#### Features:

* Connect Wallet (via MetaMask)
* Fetch data from smart contracts and IPFS
* Trigger smart contract functions for listing and purchasing
* Basic loading states and success/error messages

Optional: Add badge or indicator for verified datasets or high-reputation sellers.

---

### 4. **Data Verification Prototype (ZKP Simulation)**

We will simulate a privacy-preserving **zero-knowledge proof** system.

#### What to Implement:

* A mock ZKP module (can be off-chain or within frontend)
* Simulate dataset quality checks:

  * Add a field like `verified: true/false` in metadata
  * Use mock logic to "simulate" dataset validation (e.g., via hash comparison or arbitrary rules)

Future ZKP implementation will use zk-SNARKs, but for now just simulate flow and UI feedback.

---

## 🔧 Development Flow & Best Practices

* Use GitHub for version control (feature branches per module)
* Write unit tests for all smart contracts (Hardhat or Foundry)
* Use Mumbai testnet (Polygon faucet for test tokens)
* Document all contracts (NatSpec + README)
* Maintain a changelog of deployments and contract addresses

---

## 🧪 Testing Targets

* [ ] Listing datasets on Mumbai with mock metadata
* [ ] Purchasing a dataset and recording ownership
* [ ] Reputation updated after rating
* [ ] Rewards distributed via the incentive module
* [ ] Metadata stored in and fetched from IPFS
* [ ] Web UI can list, browse, and interact with contracts
* [ ] Simulated verification flow functional

---

## 📦 Deliverables Checklist

* [ ] Smart contracts deployed on Mumbai testnet
* [ ] IPFS integration with listing flow
* [ ] Web portal with basic UI
* [ ] Data verification simulation implemented
* [ ] Internal README documentation for testing and usage
* [ ] Test results (unit + integration tests)

---

