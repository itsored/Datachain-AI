const fs = require("fs");
const path = require("path");
const { ethers } = require("ethers");
const { Agent } = require("undici");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: false });

const ROOT_DIR = path.join(__dirname, "..", "..");
const FINAL_DATA_DIR = path.join(ROOT_DIR, "data", "final");
const DEPLOYMENTS_DIR = path.join(__dirname, "..", "deployments");
const FRONTEND_PUBLIC_DIR = path.join(ROOT_DIR, "Datachain-Frontend", "public");
const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL || "http://127.0.0.1:8545";
const PAYMENT_DECIMALS = 6;
const PINATA_DISPATCHER = new Agent({
  headersTimeout: 120_000,
  bodyTimeout: 120_000,
  connectTimeout: 30_000,
});
const SELLER_PRIVATE_KEYS = [
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
];
const MARKETPLACE_ABI = [
  "function listDataset(string ipfsHash, uint256 price)",
  "event DatasetListed(uint256 indexed id, address indexed seller, uint256 price, string ipfsHash)",
];

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function loadSeedRecords(source) {
  const fileName = source === "approved" ? "approved_datasets.json" : "priority_seed_list.json";
  return readJson(path.join(FINAL_DATA_DIR, fileName));
}

function loadSeedState(filePath) {
  if (!fs.existsSync(filePath)) {
    return { seeded: [] };
  }
  return readJson(filePath);
}

function loadSeededCatalogIds(networkName) {
  if (!fs.existsSync(DEPLOYMENTS_DIR)) return new Set();
  const files = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((fileName) => fileName.startsWith(`${networkName}-`) && fileName.endsWith("-seed-state.json"));
  const ids = new Set();
  for (const fileName of files) {
    const state = loadSeedState(path.join(DEPLOYMENTS_DIR, fileName));
    for (const entry of state.seeded || []) {
      ids.add(entry.catalog_id);
    }
  }
  return ids;
}

function buildMarketplaceMetadata(record, sellerAddress) {
  return {
    schema_version: "datachain.marketplace.dataset/v1",
    listing_source: "curated_public_catalog",
    unlock_type: "metadata_and_source_link",
    title: record.title,
    short_description: record.short_description,
    long_description: record.long_description,
    source_platform: record.source_platform,
    source_url: record.source_url,
    repo_url: record.repo_url,
    dataset_homepage: record.dataset_homepage,
    license: record.license,
    license_verified: record.license_verified,
    license_notes: record.license_notes,
    provenance_confidence: record.provenance_confidence,
    redistribution_confidence: record.redistribution_confidence,
    modality: record.modality || [],
    domain_tags: record.domain_tags || [],
    task_tags: record.task_tags || [],
    language_tags: record.language_tags || [],
    size_info: record.size_info,
    file_formats: record.file_formats || [],
    maintainer_name: record.maintainer_name,
    maintainer_org: record.maintainer_org,
    access_type: record.access_type,
    commercial_use_possible: record.commercial_use_possible,
    pii_risk: record.pii_risk,
    quality_signals: record.quality_signals || [],
    seed_priority: record.seed_priority,
    recommended_for_pilot: record.recommended_for_pilot,
    manual_review_required: record.manual_review_required,
    notes: record.notes,
    audit_sources: record.audit_sources || [],
    catalog_id: record.id,
    slug: record.slug,
    seller_wallet: sellerAddress,
    listed_at: new Date().toISOString(),
  };
}

async function pinJsonToIpfs(payload, recordId) {
  if (!process.env.PINATA_JWT) {
    throw new Error("PINATA_JWT is not configured");
  }

  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
        method: "POST",
        dispatcher: PINATA_DISPATCHER,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.PINATA_JWT}`,
        },
        body: JSON.stringify({
          pinataMetadata: {
            name: `datachain-${recordId}.json`,
          },
          pinataContent: payload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Pinata upload failed: ${await res.text()}`);
      }

      const data = await res.json();
      return data.IpfsHash;
    } catch (error) {
      lastError = error;
      console.warn(`Pinata upload retry ${attempt + 1}/5 for ${recordId}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError;
}

function selectPrice(record, priorityMode) {
  if (priorityMode && record.seed_priority === "priority") return "5";
  return "3";
}

function writeFrontendSeedManifest(networkName) {
  const files = fs
    .readdirSync(DEPLOYMENTS_DIR)
    .filter((fileName) => fileName.startsWith(`${networkName}-`) && fileName.endsWith("-seed-state.json"));
  const merged = [];
  for (const fileName of files) {
    const state = loadSeedState(path.join(DEPLOYMENTS_DIR, fileName));
    for (const entry of state.seeded || []) merged.push(entry);
  }
  merged.sort((left, right) => (left.listing_id || 0) - (right.listing_id || 0));
  ensureDir(FRONTEND_PUBLIC_DIR);
  const manifestPath = path.join(FRONTEND_PUBLIC_DIR, "local-seed-listings.json");
  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2));
  return manifestPath;
}

async function main() {
  const source = process.argv[2] === "priority" ? "priority" : "approved";
  const limitArg = Number.parseInt(process.argv[3] || "25", 10);
  const network = "localhost";
  const deployment = readJson(path.join(DEPLOYMENTS_DIR, `${network}.json`));
  const seedStatePath = path.join(DEPLOYMENTS_DIR, `${network}-${source}-seed-state.json`);
  const seedState = loadSeedState(seedStatePath);
  const seededIds = loadSeededCatalogIds(network);
  const provider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);
  const wallets = SELLER_PRIVATE_KEYS.map((privateKey) => new ethers.Wallet(privateKey, provider));
  const marketplaceInterface = new ethers.Interface(MARKETPLACE_ABI);
  const marketplaceAddress = deployment.contracts.marketplace;
  const allRecords = loadSeedRecords(source);
  const candidates = allRecords.filter((record) => !seededIds.has(record.id));
  const toSeed = candidates.slice(0, limitArg);

  if (toSeed.length === 0) {
    const manifestPath = writeFrontendSeedManifest(network);
    console.log(`Frontend seed manifest refreshed at ${manifestPath}`);
    console.log(`No ${source} records left to seed.`);
    return;
  }

  console.log(`Preparing to seed ${toSeed.length} ${source} listings via direct localhost RPC`);

  for (let index = 0; index < toSeed.length; index += 1) {
    const record = toSeed[index];
    const wallet = wallets[index % wallets.length];
    const metadata = buildMarketplaceMetadata(record, wallet.address);
    const cid = await pinJsonToIpfs(metadata, record.id);
    const priceText = selectPrice(record, source === "priority");
    const price = ethers.parseUnits(priceText, PAYMENT_DECIMALS);

    const tx = await wallet.sendTransaction({
      to: marketplaceAddress,
      data: marketplaceInterface.encodeFunctionData("listDataset", [cid, price]),
      maxPriorityFeePerGas: ethers.parseUnits("50", "gwei"),
      maxFeePerGas: ethers.parseUnits("300", "gwei"),
      gasLimit: 250_000n,
    });
    const receipt = await tx.wait();
    const parsedLog = receipt.logs
      .map((log) => {
        try {
          return marketplaceInterface.parseLog(log);
        } catch (_) {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "DatasetListed");
    const listingId = parsedLog ? Number(parsedLog.args.id) : null;

    seedState.seeded.push({
      catalog_id: record.id,
      listing_id: listingId,
      seller: wallet.address,
      price: priceText,
      ipfs_cid: cid,
      tx_hash: receipt.hash,
      seeded_at: new Date().toISOString(),
    });
    writeJson(seedStatePath, seedState);
    console.log(`Seeded ${record.id} as listing #${listingId} via ${receipt.hash}`);
  }

  const manifestPath = writeFrontendSeedManifest(network);
  console.log(`Frontend seed manifest written to ${manifestPath}`);
  console.log(`Seed state written to ${seedStatePath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
