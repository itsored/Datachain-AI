const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Marketplace", function () {
  let marketplace, reputation, incentives, owner, seller, buyer;

  beforeEach(async function () {
    [owner, seller, buyer] = await ethers.getSigners();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();
    console.log("Marketplace address:", await marketplace.getAddress());

    const Reputation = await ethers.getContractFactory("Reputation");
    reputation = await Reputation.deploy();
    await reputation.waitForDeployment();
    console.log("Reputation address:", await reputation.getAddress());

    const Incentives = await ethers.getContractFactory("Incentives");
    incentives = await Incentives.deploy();
    await incentives.waitForDeployment();
    console.log("Incentives address:", await incentives.getAddress());
  });

  it("should list and purchase dataset", async function () {
    const price = ethers.parseEther("1");
    const tx = await marketplace.connect(seller).listDataset("ipfsHash", price);
    const receipt = await tx.wait();
    const event = receipt.logs.find(() => true);
    expect(event).to.not.be.undefined;

    const datasetId = await marketplace.datasetCount();
    await expect(
      marketplace.connect(buyer).purchaseDataset(datasetId, { value: price })
    )
      .to.emit(marketplace, "DatasetPurchased")
      .withArgs(datasetId, buyer.address, price);

    expect((await marketplace.datasets(datasetId)).buyer).to.equal(buyer.address);
  });

  it("should prevent double purchase", async function () {
    const price = ethers.parseEther("1");
    const datasetId = await (await marketplace.connect(seller).listDataset("ipfs", price)).wait()
      .then(() => marketplace.datasetCount());
    await marketplace.connect(buyer).purchaseDataset(datasetId, { value: price });
    await expect(
      marketplace.connect(owner).purchaseDataset(datasetId, { value: price })
    ).to.be.revertedWith("Already purchased");
  });

  it("should update reputation and distribute rewards", async function () {
    await reputation.submitRating(seller.address, 5);
    expect(await reputation.getReputation(seller.address)).to.equal(500);

    await incentives.connect(owner).distributeReward(buyer.address, 100);
    await expect(incentives.connect(buyer).claimReward())
      .to.emit(incentives, "RewardClaimed")
      .withArgs(buyer.address, 100);
    expect(await incentives.balanceOf(buyer.address)).to.equal(100);
  });
});
