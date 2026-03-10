const fs = require("fs");
const path = require("path");
const hre = require("hardhat");

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function writeDeploymentFile(network, payload) {
  const outputDir = path.join(__dirname, "..", "deployments");
  ensureDir(outputDir);
  const outputPath = path.join(outputDir, `${network}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
  return outputPath;
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
  const network = hre.network.name;
  const [deployer, sellerOne, sellerTwo, sellerThree, buyerOne, buyerTwo] = await hre.ethers.getSigners();
  const feeOverrides = await getFeeOverrides(hre.ethers.provider, hre.ethers);
  console.log(`Deploying contracts on ${network} with the account:`, deployer.address);

  // Deploy MockUSDC first so the marketplace can settle in the pilot token.
  const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
  const mockUSDC = await MockUSDC.deploy(deployer.address, feeOverrides);
  await mockUSDC.waitForDeployment();
  console.log("MockUSDC deployed to:", await mockUSDC.getAddress());

  // Deploy Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy(await mockUSDC.getAddress(), feeOverrides);
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", await marketplace.getAddress());

  // Deploy Reputation
  const Reputation = await hre.ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy(await marketplace.getAddress(), feeOverrides);
  await reputation.waitForDeployment();
  console.log("Reputation deployed to:", await reputation.getAddress());

  // Deploy Incentives
  const Incentives = await hre.ethers.getContractFactory("Incentives");
  const incentives = await Incentives.deploy(feeOverrides);
  await incentives.waitForDeployment();
  console.log("Incentives deployed to:", await incentives.getAddress());

  const fundingAmount = hre.ethers.parseUnits("2500", 6);
  await (await mockUSDC.mint(buyerOne.address, fundingAmount, feeOverrides)).wait();
  await (await mockUSDC.mint(buyerTwo.address, fundingAmount, feeOverrides)).wait();
  console.log("Funded local buyer wallets with dcUSDC for pilot testing");

  const deploymentBlock = await hre.ethers.provider.getBlockNumber();
  const deployment = {
    network,
    chainId: Number((await hre.ethers.provider.getNetwork()).chainId),
    deploymentBlock,
    contracts: {
      mockUSDC: await mockUSDC.getAddress(),
      marketplace: await marketplace.getAddress(),
      reputation: await reputation.getAddress(),
      incentives: await incentives.getAddress(),
    },
    curatedActors: {
      deployer: deployer.address,
      sellers: [sellerOne.address, sellerTwo.address, sellerThree.address],
      buyers: [buyerOne.address, buyerTwo.address],
    },
  };
  const deploymentPath = writeDeploymentFile(network, deployment);

  console.log("Pilot payment token symbol: dcUSDC");
  console.log("Pilot payment token decimals: 6");
  console.log("Deployment manifest written to:", deploymentPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 
