# Smart Contracts API Documentation

This document provides all the information needed for frontend integration with the deployed smart contracts.

---

## Network & Addresses
- **Network:** `<YOUR_NETWORK>`
- **Marketplace Address:** `0xYourMarketplaceAddressHere`
- **Reputation Address:** `0xYourReputationAddressHere`
- **Incentives Address:** `0xYourIncentivesAddressHere`

---

## Marketplace Contract

### ABI
```json
[
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"seller","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"},{"indexed":false,"internalType":"string","name":"ipfsHash","type":"string"}],"name":"DatasetListed","type":"event"},
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"id","type":"uint256"},{"indexed":true,"internalType":"address","name":"buyer","type":"address"},{"indexed":false,"internalType":"uint256","name":"price","type":"uint256"}],"name":"DatasetPurchased","type":"event"},
  {"inputs":[],"name":"datasetCount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"datasets","outputs":[{"internalType":"address","name":"seller","type":"address"},{"internalType":"string","name":"ipfsHash","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"},{"internalType":"address","name":"buyer","type":"address"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"string","name":"ipfsHash","type":"string"},{"internalType":"uint256","name":"price","type":"uint256"}],"name":"listDataset","outputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},
  {"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingWithdrawals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"uint256","name":"datasetId","type":"uint256"}],"name":"purchaseDataset","outputs":[],"stateMutability":"payable","type":"function"},
  {"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```

### Main Functions
- `listDataset(string ipfsHash, uint256 price)`
- `purchaseDataset(uint256 datasetId)` (payable)
- `withdraw()`
- `datasetCount()`
- `datasets(uint256 id)`
- `pendingWithdrawals(address)`

### Events
- `DatasetListed(uint256 id, address seller, uint256 price, string ipfsHash)`
- `DatasetPurchased(uint256 id, address buyer, uint256 price)`

---

## Reputation Contract

### ABI
```json
[
  {"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint8","name":"rating","type":"uint8"}],"name":"RatingSubmitted","type":"event"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"}],"name":"getReputation","outputs":[{"internalType":"uint256","name":"reputation","type":"uint256"}],"stateMutability":"view","type":"function"},
  {"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint8","name":"rating","type":"uint8"}],"name":"submitRating","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```

### Main Functions
- `submitRating(address user, uint8 rating)`
- `getReputation(address user)`

### Events
- `RatingSubmitted(address user, uint8 rating)`

---

## Incentives Contract

### ABI
```json
[
{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},
{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"allowance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientAllowance","type":"error"},
{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"uint256","name":"balance","type":"uint256"},{"internalType":"uint256","name":"needed","type":"uint256"}],"name":"ERC20InsufficientBalance","type":"error"},
{"inputs":[{"internalType":"address","name":"approver","type":"address"}],"name":"ERC20InvalidApprover","type":"error"},
{"inputs":[{"internalType":"address","name":"receiver","type":"address"}],"name":"ERC20InvalidReceiver","type":"error"},
{"inputs":[{"internalType":"address","name":"sender","type":"address"}],"name":"ERC20InvalidSender","type":"error"},
{"inputs":[{"internalType":"address","name":"spender","type":"address"}],"name":"ERC20InvalidSpender","type":"error"},
{"inputs":[{"internalType":"address","name":"owner","type":"address"}],"name":"OwnableInvalidOwner","type":"error"},
{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"OwnableUnauthorizedAccount","type":"error"},
{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},
{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},
{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardClaimed","type":"event"},
{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"user","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RewardDistributed","type":"event"},
{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},
{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"claimReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint8","name":"","type":"uint8"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"address","name":"user","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"distributeReward","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"pendingRewards","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},
{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},
{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},
{"inputs":[{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
{"inputs":[{"internalType":"address","name":"from","type":"address"},{"internalType":"address","name":"to","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},
{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"}
]
```

### Main Functions
- `distributeReward(address user, uint256 amount)` (onlyOwner)
- `claimReward()`
- `pendingRewards(address)`
- `balanceOf(address)`

### Events
- `RewardDistributed(address user, uint256 amount)`
- `RewardClaimed(address user, uint256 amount)`

---

## Usage Example (ethers.js)

```js
import { ethers } from 'ethers';

const marketplace = new ethers.Contract(
  '0xYourMarketplaceAddressHere',
  <MARKETPLACE_ABI>,
  providerOrSigner
);

// List a dataset
await marketplace.listDataset('Qm...', ethers.parseEther('1'));

// Purchase a dataset
await marketplace.purchaseDataset(1, { value: ethers.parseEther('1') });

// Withdraw funds
await marketplace.withdraw();
```

---

## Error Handling
- All functions revert on invalid input (e.g., zero price, double purchase, unauthorized reward distribution).
- Use try/catch or .catch() in JS to handle errors and display user-friendly messages.

---

## Notes
- Replace placeholder addresses with actual deployed contract addresses.
- Use the ABIs below for contract instantiation.

--- 