const fs = require("fs");
const path = require("path");
const hre = require("hardhat");
const { Agent } = require("undici");

const PAYMENT_DECIMALS = 6;
const DEFAULT_LIMIT = 5;
const ROOT_DIR = path.join(__dirname, "..", "..");
const FINAL_DATA_DIR = path.join(ROOT_DIR, "data", "final");
const FRONTEND_PUBLIC_DIR = path.join(ROOT_DIR, "Datachain-Frontend", "public");
const PINATA_DISPATCHER = new Agent({
  headersTimeout: 120_000,
  bodyTimeout: 120_000,
  connectTimeout: 30_000,
});

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }
    args[key] = next;
    i += 1;
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function loadSeedRecords(source) {
  const fileName = source === "priority" ? "priority_seed_list.json" : "approved_datasets.json";
  const records = readJson(path.join(FINAL_DATA_DIR, fileName));
  return Array.isArray(records) ? records : [];
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
      const backoffMs = 1000 * (attempt + 1);
      console.warn(`Pinata upload retry ${attempt + 1}/5 for ${recordId}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
}

function getDeploymentManifest(networkName) {
  const manifestPath = path.join(__dirname, "..", "deployments", `${networkName}.json`);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Deployment manifest not found: ${manifestPath}`);
  }
  return {
    path: manifestPath,
    data: readJson(manifestPath),
  };
}

function getSeedStatePath(networkName, source) {
  return path.join(__dirname, "..", "deployments", `${networkName}-${source}-seed-state.json`);
}

function loadSeedState(filePath, marketplaceAddress) {
  if (!fs.existsSync(filePath)) {
    return {
      marketplace_address: marketplaceAddress,
      seeded: [],
    };
  }

  const state = readJson(filePath);
  if (
    marketplaceAddress &&
    (!state.marketplace_address ||
      state.marketplace_address.toLowerCase() !== marketplaceAddress.toLowerCase())
  ) {
    return {
      marketplace_address: marketplaceAddress,
      seeded: [],
    };
  }

  return {
    marketplace_address: marketplaceAddress,
    seeded: Array.isArray(state.seeded) ? state.seeded : [],
  };
}

function saveSeedState(filePath, state) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
}

function loadSeededCatalogIds(networkName, marketplaceAddress) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    return new Set();
  }

  const files = fs
    .readdirSync(deploymentsDir)
    .filter((fileName) => fileName.startsWith(`${networkName}-`) && fileName.endsWith("-seed-state.json"));

  const ids = new Set();
  for (const fileName of files) {
    const state = loadSeedState(path.join(deploymentsDir, fileName), marketplaceAddress);
    for (const entry of state.seeded || []) {
      ids.add(entry.catalog_id);
    }
  }

  return ids;
}

function writeFrontendSeedManifest(networkName, marketplaceAddress) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  const files = fs
    .readdirSync(deploymentsDir)
    .filter((fileName) => fileName.startsWith(`${networkName}-`) && fileName.endsWith("-seed-state.json"));

  const merged = [];
  for (const fileName of files) {
    const state = loadSeedState(path.join(deploymentsDir, fileName), marketplaceAddress);
    for (const entry of state.seeded || []) {
      merged.push(entry);
    }
  }

  merged.sort((left, right) => (left.listing_id || 0) - (right.listing_id || 0));
  ensureDir(FRONTEND_PUBLIC_DIR);
  const manifestPath = path.join(FRONTEND_PUBLIC_DIR, "local-seed-listings.json");
  fs.writeFileSync(manifestPath, JSON.stringify(merged, null, 2));
  return manifestPath;
}

function selectPrice(record, priorityMode) {
  if (priorityMode && record.seed_priority === "priority") {
    return "5";
  }
  return "3";
}

async function getFeeOverrides(provider, ethersLib) {
  if (hre.network.name === "localhost") {
    return {
      maxPriorityFeePerGas: ethersLib.parseUnits("50", "gwei"),
      maxFeePerGas: ethersLib.parseUnits("300", "gwei"),
    };
  }

  const [feeData, latestBlock] = await Promise.all([provider.getFeeData(), provider.getBlock("latest")]);
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? ethersLib.parseUnits("50", "gwei");
  const baseFeePerGas = latestBlock?.baseFeePerGas ?? feeData.maxFeePerGas ?? ethersLib.parseUnits("120", "gwei");

  return {
    maxPriorityFeePerGas,
    maxFeePerGas: baseFeePerGas * 2n + maxPriorityFeePerGas,
  };
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2));
  const sourceSetting = process.env.SEED_SOURCE || cliArgs.source || "priority";
  const source = sourceSetting === "approved" ? "approved" : "priority";
  const limit = Number.parseInt(process.env.SEED_LIMIT || cliArgs.limit || `${DEFAULT_LIMIT}`, 10);
  const dryRun = process.env.SEED_DRY_RUN === "true" || cliArgs["dry-run"] === true;
  const network = hre.network.name;
  const { data: deployment } = getDeploymentManifest(network);
  const seedStatePath = getSeedStatePath(network, source);
  const seedState = loadSeedState(seedStatePath, deployment.contracts.marketplace);
  const seededCatalogIds = loadSeededCatalogIds(network, deployment.contracts.marketplace);
  const [deployer, sellerOne, sellerTwo, sellerThree] = await hre.ethers.getSigners();
  const sellerSigners = [sellerOne, sellerTwo, sellerThree];
  const feeOverrides = await getFeeOverrides(hre.ethers.provider, hre.ethers);

  const marketplace = await hre.ethers.getContractAt("Marketplace", deployment.contracts.marketplace, deployer);
  const allRecords = loadSeedRecords(source);
  const candidates = allRecords.filter((record) => !seededCatalogIds.has(record.id));
  const toSeed = candidates.slice(0, limit);

  if (toSeed.length === 0) {
    const manifestPath = writeFrontendSeedManifest(network, deployment.contracts.marketplace);
    console.log(`Frontend seed manifest refreshed at ${manifestPath}`);
    console.log(`No ${source} records left to seed.`);
    return;
  }

  console.log(`Preparing to seed ${toSeed.length} ${source} listings on ${network}`);

  for (let index = 0; index < toSeed.length; index += 1) {
    const record = toSeed[index];
    const sellerSigner = sellerSigners[index % sellerSigners.length];
    const metadata = buildMarketplaceMetadata(record, sellerSigner.address);
    const priceText = selectPrice(record, source === "priority");
    const price = hre.ethers.parseUnits(priceText, PAYMENT_DECIMALS);

    if (dryRun) {
      console.log(`[dry-run] ${record.id} -> seller ${sellerSigner.address} @ ${priceText} dcUSDC`);
      continue;
    }

    const cid = await pinJsonToIpfs(metadata, record.id);
    const tx = await marketplace.connect(sellerSigner).listDataset(cid, price, feeOverrides);
    const receipt = await tx.wait();
    const event = receipt.logs
      .map((log) => {
        try {
          return marketplace.interface.parseLog(log);
        } catch (_) {
          return null;
        }
      })
      .find((parsed) => parsed && parsed.name === "DatasetListed");
    const listingId = event ? Number(event.args.id) : null;

    seedState.seeded.push({
      catalog_id: record.id,
      listing_id: listingId,
      seller: sellerSigner.address,
      price: priceText,
      ipfs_cid: cid,
      tx_hash: receipt.hash,
      seeded_at: new Date().toISOString(),
    });

    saveSeedState(seedStatePath, seedState);
    console.log(`Seeded ${record.id} as listing #${listingId} via ${receipt.hash}`);
  }

  const manifestPath = writeFrontendSeedManifest(network, deployment.contracts.marketplace);
  console.log(`Frontend seed manifest written to ${manifestPath}`);
  console.log(`Seed state written to ${seedStatePath}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
