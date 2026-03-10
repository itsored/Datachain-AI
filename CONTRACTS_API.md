# Smart Contracts API

This document describes the current pilot contract surface for the local Polygon-mainnet fork workflow.

## Current localhost deployment

Source of truth: [deployments/localhost.json](/Users/vicgunga/Gunga/DataChain/Datachain-AI/deployments/localhost.json)

- Network: `localhost` (`chainId=31337`, forked from Polygon mainnet)
- MockUSDC: `0x6b768469249a0b317887e9B2740F501142b44E54`
- Marketplace: `0x6b46156f4E26CF8a95ffB7af01dD6F91f4e4830A`
- Reputation: `0xeaeBEb9b37C231B9c5f09f4B756D9dc5ECC2433A`
- Incentives: `0x004D87f83e6B13052A7a08C0C5a8Cc7d9C1450E3`

## Marketplace

Pilot model:

- Listings are priced in `dcUSDC` with 6 decimals.
- A listing can be purchased by many buyers.
- Each buyer can purchase a given listing once.
- Purchases unlock metadata and source-link access for seeded public datasets.
- Sellers accrue `pendingWithdrawals` in `dcUSDC`.

### Key functions

- `paymentToken() view returns (address)`
- `datasetCount() view returns (uint256)`
- `datasets(uint256 id) view returns (address seller, string ipfsHash, uint256 price, bool active, uint256 purchaseCount)`
- `hasPurchased(uint256 id, address buyer) view returns (bool)`
- `listDataset(string ipfsHash, uint256 price)`
- `purchaseDataset(uint256 datasetId)`
- `setDatasetActive(uint256 datasetId, bool active)`
- `updateDatasetPrice(uint256 datasetId, uint256 price)`
- `pendingWithdrawals(address seller) view returns (uint256)`
- `withdraw()`

### Events

- `DatasetListed(uint256 indexed id, address indexed seller, uint256 price, string ipfsHash)`
- `DatasetPurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint256 price)`
- `DatasetStatusUpdated(uint256 indexed id, bool active)`
- `DatasetPriceUpdated(uint256 indexed id, uint256 price)`

### Minimal ABI for frontend integration

```json
[
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"},{"indexed":false,"internalType":"string","name":"ipfsHash","type":"string"}],"name":"DatasetListed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"}],"name":"DatasetPurchased","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"bool","name":"active","type":"bool"}],"name":"DatasetStatusUpdated","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"}],"name":"DatasetPriceUpdated","type":"event"},
  {"inputs":[],"name":"paymentToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"datasetCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"datasets","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"string","name":"ipfsHash","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"},{"internalType":"uint256","name":"purchaseCount","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"},{"internalType":"address","name":"buyer","type":"address"}],"name":"hasPurchased","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"ipfsHash","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"}],"name":"listDataset","outputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"}],"name":"purchaseDataset","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"},{"internalType":"bool","name":"active","type":"bool"}],"name":"setDatasetActive","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"},{"internalType":"uint256","name":"price","type":"uint256"}],"name":"updateDatasetPrice","outputs":[],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingWithdrawals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```

## MockUSDC

Purpose:

- pilot payment token for seeded/public listings
- 6 decimals
- owner minting for bootstrap
- faucet for local testing

### Key functions

- `decimals() view returns (uint8)` -> `6`
- `mint(address to, uint256 amount)`
- `faucet()`
- `balanceOf(address user) view returns (uint256)`
- `approve(address spender, uint256 amount)`
- `allowance(address owner, address spender) view returns (uint256)`

## Reputation

### Key functions

- `marketplace() view returns (address)`
- `submitRating(address seller, uint256 datasetId, uint8 rating, string review)`
- `getReputation(address seller) view returns (uint256)`
- `getReputationSummary(address seller) view returns (uint256 reputation, uint256 totalRatings, uint256 positiveRatings, uint256 neutralRatings, uint256 negativeRatings, uint256 verifiedRatings, uint256 lastUpdatedAt)`
- `hasRated(address seller, uint256 datasetId, address reviewer) view returns (bool)`

Behavior:

- ratings require a verified purchase on the linked marketplace contract
- one buyer can rate a seller once per dataset
- seller summaries include positive / neutral / negative counts plus verified review totals

## Incentives

### Key functions

- `distributeReward(address user, uint256 amount)` (`onlyOwner`)
- `claimReward()`
- `pendingRewards(address user) view returns (uint256)`
- `balanceOf(address user) view returns (uint256)`
