const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let marketplace, reputation, incentives, mockUSDC, owner, seller, buyer, secondBuyer;

  beforeEach(async function () {
    [owner, seller, buyer, secondBuyer] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    mockUSDC = await MockUSDC.deploy(owner.address);
    await mockUSDC.waitForDeployment();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy(await mockUSDC.getAddress());
    await marketplace.waitForDeployment();

    const Reputation = await ethers.getContractFactory("Reputation");
    reputation = await Reputation.deploy(await marketplace.getAddress());
    await reputation.waitForDeployment();

    const Incentives = await ethers.getContractFactory("Incentives");
    incentives = await Incentives.deploy();
    await incentives.waitForDeployment();
  });

  it("should list and purchase dataset using mock USDC", async function () {
    const price = ethers.parseUnits("1", 6);
    const tx = await marketplace.connect(seller).listDataset("ipfsHash", price);
    const receipt = await tx.wait();
    const event = receipt.logs.find(() => true);
    expect(event).to.not.be.undefined;

    const datasetId = await marketplace.datasetCount();
    await mockUSDC.connect(owner).mint(buyer.address, price);
    await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);

    await expect(marketplace.connect(buyer).purchaseDataset(datasetId))
      .to.emit(marketplace, "DatasetPurchased")
      .withArgs(datasetId, buyer.address, seller.address, price);

    expect(await marketplace.hasPurchased(datasetId, buyer.address)).to.equal(true);
    expect((await marketplace.datasets(datasetId)).purchaseCount).to.equal(1);
  });

  it("should allow multiple buyers but prevent duplicate purchase by the same buyer", async function () {
    const price = ethers.parseUnits("1", 6);
    const datasetId = await (await marketplace.connect(seller).listDataset("ipfs", price)).wait()
      .then(() => marketplace.datasetCount());

    await mockUSDC.connect(owner).mint(buyer.address, price * 2n);
    await mockUSDC.connect(owner).mint(secondBuyer.address, price * 2n);
    await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price * 2n);
    await mockUSDC.connect(secondBuyer).approve(await marketplace.getAddress(), price * 2n);
    await marketplace.connect(buyer).purchaseDataset(datasetId);
    await marketplace.connect(secondBuyer).purchaseDataset(datasetId);

    await expect(marketplace.connect(buyer).purchaseDataset(datasetId)).to.be.revertedWith("Dataset already purchased by buyer");
    expect((await marketplace.datasets(datasetId)).purchaseCount).to.equal(2);
  });

  it("should allow sellers to deactivate a listing", async function () {
    const price = ethers.parseUnits("1", 6);
    const datasetId = await (await marketplace.connect(seller).listDataset("ipfs", price)).wait()
      .then(() => marketplace.datasetCount());

    await expect(marketplace.connect(seller).setDatasetActive(datasetId, false))
      .to.emit(marketplace, "DatasetStatusUpdated")
      .withArgs(datasetId, false);

    expect((await marketplace.datasets(datasetId)).active).to.equal(false);
  });

  it("should update reputation and distribute rewards", async function () {
    const price = ethers.parseUnits("1", 6);
    const datasetId = await (await marketplace.connect(seller).listDataset("ipfs-rating", price)).wait()
      .then(() => marketplace.datasetCount());
    await mockUSDC.connect(owner).mint(buyer.address, price);
    await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
    await marketplace.connect(buyer).purchaseDataset(datasetId);

    await reputation.connect(buyer).submitRating(seller.address, datasetId, 5, "Great documentation");
    expect(await reputation.getReputation(seller.address)).to.equal(500);

    await incentives.connect(owner).distributeReward(buyer.address, 100);
    await expect(incentives.connect(buyer).claimReward())
      .to.emit(incentives, "RewardClaimed")
      .withArgs(buyer.address, 100);
    expect(await incentives.balanceOf(buyer.address)).to.equal(100);
  });
});
