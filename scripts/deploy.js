const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy Marketplace
  const Marketplace = await hre.ethers.getContractFactory("Marketplace");
  const marketplace = await Marketplace.deploy();
  await marketplace.waitForDeployment();
  console.log("Marketplace deployed to:", await marketplace.getAddress());

  // Deploy Reputation
  const Reputation = await hre.ethers.getContractFactory("Reputation");
  const reputation = await Reputation.deploy();
  await reputation.waitForDeployment();
  console.log("Reputation deployed to:", await reputation.getAddress());

  // Deploy Incentives
  const Incentives = await hre.ethers.getContractFactory("Incentives");
  const incentives = await Incentives.deploy();
  await incentives.waitForDeployment();
  console.log("Incentives deployed to:", await incentives.getAddress());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 