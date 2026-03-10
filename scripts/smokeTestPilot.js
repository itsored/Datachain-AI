const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");

require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: false });

const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
const HARDHAT_MNEMONIC = "test test test test test test test test test test test junk";
const PAYMENT_DECIMALS = 6;
const REWARD_AMOUNT = 250n;
const BUYER_COUNT = 2;
const RPC_TIMEOUT_MS = 10_000;

const DEPLOYMENT_PATH = path.join(__dirname, "..", "deployments", "localhost.json");
const SEED_STATE_PATH = path.join(__dirname, "..", "deployments", "localhost-priority-seed-state.json");
const REPORT_PATH = path.join(__dirname, "..", "reports", "localhost-smoke-test.md");
const ARTIFACTS_DIR = path.join(__dirname, "..", "artifacts", "contracts");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function formatUsdc(amount) {
  return ethers.formatUnits(amount, PAYMENT_DECIMALS);
}

function deriveWallet(index, provider) {
  const derivationPath = `m/44'/60'/0'/0/${index}`;
  return ethers.HDNodeWallet.fromPhrase(HARDHAT_MNEMONIC, undefined, derivationPath).connect(provider);
}

function withTimeout(promise, label, timeoutMs = RPC_TIMEOUT_MS) {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeout,
  ]);
}

async function rpcHealthcheck() {
  const response = await fetch(LOCAL_RPC_URL, {
    method: "POST",
    signal: AbortSignal.timeout(RPC_TIMEOUT_MS),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_blockNumber",
      params: [],
    }),
  });

  if (!response.ok) {
    throw new Error(`Local RPC healthcheck failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload.result) {
    throw new Error(`Local RPC healthcheck returned invalid payload: ${JSON.stringify(payload)}`);
  }

  return Number.parseInt(payload.result, 16);
}

function loadArtifact(contractName) {
  return readJson(path.join(ARTIFACTS_DIR, `${contractName}.sol`, `${contractName}.json`));
}

async function getListingForBuyer(marketplace, seededListings, buyerAddress) {
  for (const entry of seededListings) {
    const purchased = await withTimeout(
      marketplace.hasPurchased(entry.listing_id, buyerAddress),
      `hasPurchased(${entry.listing_id}, ${buyerAddress})`,
    );
    if (!purchased && entry.seller.toLowerCase() !== buyerAddress.toLowerCase()) {
      return entry;
    }
  }

  throw new Error(`No available seeded listing found for buyer ${buyerAddress}`);
}

async function ensureBuyerHasUsdc(mockUsdc, buyerAddress, price) {
  const balance = await withTimeout(mockUsdc.balanceOf(buyerAddress), `balanceOf(${buyerAddress})`);
  if (balance >= price) {
    return { before: balance, usedFaucet: false };
  }

  const faucetTx = await withTimeout(mockUsdc.faucet(), "mockUSDC.faucet()");
  await withTimeout(faucetTx.wait(), "wait faucet tx");
  const refreshedBalance = await withTimeout(mockUsdc.balanceOf(buyerAddress), `balanceOf(${buyerAddress}) after faucet`);
  if (refreshedBalance < price) {
    throw new Error(`Buyer balance ${formatUsdc(refreshedBalance)} is still below price ${formatUsdc(price)}`);
  }

  return { before: balance, usedFaucet: true, after: refreshedBalance };
}

function createMarkdownReport(summary) {
  return [
    "# Local Pilot Smoke Test",
    "",
    `- Timestamp: ${summary.timestamp}`,
    `- RPC URL: ${LOCAL_RPC_URL}`,
    `- Chain ID: ${summary.chainId}`,
    `- Deployment block: ${summary.deploymentBlock}`,
    `- Healthcheck block: ${summary.healthcheckBlock}`,
    `- Buyer: ${summary.buyer}`,
    `- Seller: ${summary.seller}`,
    `- Listing ID: ${summary.listingId}`,
    `- Listing price (dcUSDC): ${summary.price}`,
    `- Faucet used: ${summary.usedFaucet ? "yes" : "no"}`,
    `- Buyer balance before purchase (dcUSDC): ${summary.buyerBalanceBefore}`,
    `- Buyer balance after purchase (dcUSDC): ${summary.buyerBalanceAfter}`,
    `- Seller pending before withdrawal (dcUSDC): ${summary.pendingBefore}`,
    `- Seller pending after purchase (dcUSDC): ${summary.pendingAfter}`,
    `- Seller balance delta after withdrawal (dcUSDC): ${summary.sellerBalanceDelta}`,
    `- Purchase count after test: ${summary.purchaseCount}`,
    `- Reward distributed (RWD): ${summary.rewardAmount}`,
    `- Buyer RWD balance after claim: ${summary.rewardBalance}`,
    `- Seller reputation after rating: ${summary.reputation}`,
    "",
    "## Transactions",
    "",
    `- Purchase: ${summary.purchaseTx}`,
    `- Withdraw: ${summary.withdrawTx}`,
    `- Reward distribute: ${summary.rewardDistributeTx}`,
    `- Reward claim: ${summary.rewardClaimTx}`,
    `- Rating: ${summary.ratingTx}`,
    "",
    "## Result",
    "",
    "Pilot smoke test passed: buyer funded, approved dcUSDC, purchased a seeded dataset, seller withdrew proceeds, reward was distributed and claimed, and seller reputation was updated.",
    "",
  ].join("\n");
}

async function main() {
  const deployment = readJson(DEPLOYMENT_PATH);
  const seedState = readJson(SEED_STATE_PATH);
  const provider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);
  const healthcheckBlock = await rpcHealthcheck();
  const chainId = Number((await withTimeout(provider.getNetwork(), "provider.getNetwork()")).chainId);

  const owner = deriveWallet(0, provider);
  const buyers = Array.from({ length: BUYER_COUNT }, (_, offset) => deriveWallet(4 + offset, provider));

  const marketplaceArtifact = loadArtifact("Marketplace");
  const mockUsdcArtifact = loadArtifact("MockUSDC");
  const reputationArtifact = loadArtifact("Reputation");
  const incentivesArtifact = loadArtifact("Incentives");
  const marketplaceReader = new ethers.Contract(deployment.contracts.marketplace, marketplaceArtifact.abi, provider);

  let selectedBuyer = null;
  let selectedListing = null;
  for (const buyer of buyers) {
    try {
      selectedListing = await getListingForBuyer(marketplaceReader, seedState.seeded, buyer.address);
      selectedBuyer = buyer;
      break;
    } catch (_) {
      continue;
    }
  }

  if (!selectedBuyer || !selectedListing) {
    throw new Error("No eligible buyer/listing pair available for smoke test");
  }

  const sellerIndex = deployment.curatedActors.sellers.findIndex(
    (address) => address.toLowerCase() === selectedListing.seller.toLowerCase(),
  );
  if (sellerIndex === -1) {
    throw new Error(`Seed listing seller ${selectedListing.seller} is not in the curated seller set`);
  }
  const seller = deriveWallet(sellerIndex + 1, provider);
  const ownerSigner = new ethers.NonceManager(owner);
  const buyerSigner = new ethers.NonceManager(selectedBuyer);
  const sellerSigner = new ethers.NonceManager(seller);

  const mockUsdc = new ethers.Contract(deployment.contracts.mockUSDC, mockUsdcArtifact.abi, buyerSigner);
  const marketplaceBuyer = new ethers.Contract(deployment.contracts.marketplace, marketplaceArtifact.abi, buyerSigner);
  const marketplaceSeller = new ethers.Contract(deployment.contracts.marketplace, marketplaceArtifact.abi, sellerSigner);
  const reputation = new ethers.Contract(deployment.contracts.reputation, reputationArtifact.abi, buyerSigner);
  const incentivesOwner = new ethers.Contract(deployment.contracts.incentives, incentivesArtifact.abi, ownerSigner);
  const incentivesBuyer = new ethers.Contract(deployment.contracts.incentives, incentivesArtifact.abi, buyerSigner);
  const sellerToken = new ethers.Contract(deployment.contracts.mockUSDC, mockUsdcArtifact.abi, sellerSigner);

  const dataset = await withTimeout(marketplaceReader.datasets(selectedListing.listing_id), `datasets(${selectedListing.listing_id})`);
  const price = dataset.price;

  const fundingState = await ensureBuyerHasUsdc(mockUsdc, selectedBuyer.address, price);
  const buyerBalanceBefore = await withTimeout(mockUsdc.balanceOf(selectedBuyer.address), `balanceOf(${selectedBuyer.address})`);
  const sellerPendingBefore = await withTimeout(
    marketplaceReader.pendingWithdrawals(selectedListing.seller),
    `pendingWithdrawals(${selectedListing.seller}) before purchase`,
  );

  const approvalTx = await withTimeout(mockUsdc.approve(deployment.contracts.marketplace, price), "mockUSDC.approve()");
  await withTimeout(approvalTx.wait(), "wait approve tx");

  const purchaseTx = await withTimeout(marketplaceBuyer.purchaseDataset(selectedListing.listing_id), "marketplace.purchaseDataset()");
  const purchaseReceipt = await withTimeout(purchaseTx.wait(), "wait purchase tx");

  const hasPurchased = await withTimeout(
    marketplaceReader.hasPurchased(selectedListing.listing_id, selectedBuyer.address),
    `hasPurchased(${selectedListing.listing_id}, ${selectedBuyer.address}) after purchase`,
  );
  if (!hasPurchased) {
    throw new Error("Purchase did not mark buyer access");
  }

  const buyerBalanceAfter = await withTimeout(mockUsdc.balanceOf(selectedBuyer.address), `balanceOf(${selectedBuyer.address}) after purchase`);
  const sellerPendingAfter = await withTimeout(
    marketplaceReader.pendingWithdrawals(selectedListing.seller),
    `pendingWithdrawals(${selectedListing.seller}) after purchase`,
  );
  if (sellerPendingAfter - sellerPendingBefore !== price) {
    throw new Error("Seller pending withdrawal delta does not match purchase price");
  }

  const sellerBalanceBefore = await withTimeout(sellerToken.balanceOf(selectedListing.seller), `seller balance before withdraw`);
  const withdrawTx = await withTimeout(marketplaceSeller.withdraw(), "marketplace.withdraw()");
  await withTimeout(withdrawTx.wait(), "wait withdraw tx");
  const sellerBalanceAfter = await withTimeout(sellerToken.balanceOf(selectedListing.seller), `seller balance after withdraw`);
  const pendingAfterWithdraw = await withTimeout(
    marketplaceReader.pendingWithdrawals(selectedListing.seller),
    `pendingWithdrawals(${selectedListing.seller}) after withdraw`,
  );
  if (pendingAfterWithdraw !== 0n) {
    throw new Error("Seller pending withdrawals were not cleared");
  }

  const rewardDistributeTx = await withTimeout(
    incentivesOwner.distributeReward(selectedBuyer.address, REWARD_AMOUNT),
    "incentives.distributeReward()",
  );
  await withTimeout(rewardDistributeTx.wait(), "wait reward distribute tx");
  const rewardClaimTx = await withTimeout(incentivesBuyer.claimReward(), "incentives.claimReward()");
  await withTimeout(rewardClaimTx.wait(), "wait reward claim tx");
  const rewardBalance = await withTimeout(incentivesBuyer.balanceOf(selectedBuyer.address), `incentives.balanceOf(${selectedBuyer.address})`);

  const ratingTx = await withTimeout(
    reputation.submitRating(selectedListing.seller, selectedListing.listing_id, 5, "Verified pilot purchase"),
    "reputation.submitRating()",
  );
  await withTimeout(ratingTx.wait(), "wait rating tx");
  const reputationValue = await withTimeout(reputation.getReputation(selectedListing.seller), `reputation.getReputation(${selectedListing.seller})`);
  const updatedDataset = await withTimeout(marketplaceReader.datasets(selectedListing.listing_id), `datasets(${selectedListing.listing_id}) after purchase`);

  const summary = {
    timestamp: new Date().toISOString(),
    chainId,
    deploymentBlock: deployment.deploymentBlock,
    healthcheckBlock,
    buyer: selectedBuyer.address,
    seller: selectedListing.seller,
    listingId: selectedListing.listing_id,
    price: formatUsdc(price),
    usedFaucet: fundingState.usedFaucet,
    buyerBalanceBefore: formatUsdc(buyerBalanceBefore),
    buyerBalanceAfter: formatUsdc(buyerBalanceAfter),
    pendingBefore: formatUsdc(sellerPendingBefore),
    pendingAfter: formatUsdc(sellerPendingAfter),
    sellerBalanceDelta: formatUsdc(sellerBalanceAfter - sellerBalanceBefore),
    purchaseCount: updatedDataset.purchaseCount.toString(),
    rewardAmount: REWARD_AMOUNT.toString(),
    rewardBalance: rewardBalance.toString(),
    reputation: (Number(reputationValue) / 100).toFixed(2),
    purchaseTx: purchaseReceipt.hash,
    withdrawTx: withdrawTx.hash,
    rewardDistributeTx: rewardDistributeTx.hash,
    rewardClaimTx: rewardClaimTx.hash,
    ratingTx: ratingTx.hash,
  };

  ensureDir(path.dirname(REPORT_PATH));
  fs.writeFileSync(REPORT_PATH, createMarkdownReport(summary));

  console.log(JSON.stringify(summary, null, 2));
  console.log(`Smoke test report written to ${REPORT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
