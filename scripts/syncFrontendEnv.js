const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local"), override: true });
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), override: false });

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function renderEnv(deployment) {
  return [
    "NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545",
    `NEXT_PUBLIC_CHAIN_ID=${deployment.chainId}`,
    "NEXT_PUBLIC_NETWORK_NAME=Local Polygon Fork",
    `NEXT_PUBLIC_MARKETPLACE_ADDRESS=${deployment.contracts.marketplace}`,
    `NEXT_PUBLIC_PAYMENT_TOKEN_ADDRESS=${deployment.contracts.mockUSDC}`,
    `NEXT_PUBLIC_REPUTATION_ADDRESS=${deployment.contracts.reputation}`,
    `NEXT_PUBLIC_INCENTIVES_ADDRESS=${deployment.contracts.incentives}`,
    `NEXT_PUBLIC_MARKETPLACE_DEPLOYMENT_BLOCK=${deployment.deploymentBlock}`,
    `PINATA_JWT=${process.env.PINATA_JWT || ""}`,
    "",
  ].join("\n");
}

function main() {
  const network = process.argv[2] || "localhost";
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment manifest not found: ${deploymentPath}`);
  }

  const deployment = readJson(deploymentPath);
  const frontendEnvPath = path.join(__dirname, "..", "..", "Datachain-Frontend", ".env.local");
  fs.writeFileSync(frontendEnvPath, renderEnv(deployment));
  console.log(`Wrote frontend env to ${frontendEnvPath}`);
}

main();
