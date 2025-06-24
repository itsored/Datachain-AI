const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full Contract Functionality Coverage", function () {
  let marketplace, reputation, incentives, owner, seller, buyer, other;

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();

    const Marketplace = await ethers.getContractFactory("Marketplace");
    marketplace = await Marketplace.deploy();
    await marketplace.waitForDeployment();

    const Reputation = await ethers.getContractFactory("Reputation");
    reputation = await Reputation.deploy();
    await reputation.waitForDeployment();

    const Incentives = await ethers.getContractFactory("Incentives");
    incentives = await Incentives.deploy();
    await incentives.waitForDeployment();
  });

  describe("Marketplace", function () {
    it("should list a dataset and emit event", async function () {
      const price = ethers.parseEther("1");
      await expect(marketplace.connect(seller).listDataset("ipfsHash1", price))
        .to.emit(marketplace, "DatasetListed")
        .withArgs(1, seller.address, price, "ipfsHash1");
      const dataset = await marketplace.datasets(1);
      expect(dataset.seller).to.equal(seller.address);
      expect(dataset.ipfsHash).to.equal("ipfsHash1");
      expect(dataset.price).to.equal(price);
      expect(dataset.buyer).to.equal(ethers.ZeroAddress);
    });

    it("should fail to list dataset with zero price", async function () {
      await expect(marketplace.connect(seller).listDataset("ipfsHash2", 0)).to.be.revertedWith("Price must be > 0");
    });

    it("should purchase a dataset and emit event", async function () {
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).listDataset("ipfsHash3", price);
      await expect(marketplace.connect(buyer).purchaseDataset(1, { value: price }))
        .to.emit(marketplace, "DatasetPurchased")
        .withArgs(1, buyer.address, price);
      const dataset = await marketplace.datasets(1);
      expect(dataset.buyer).to.equal(buyer.address);
    });

    it("should fail to purchase with wrong price", async function () {
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).listDataset("ipfsHash4", price);
      await expect(marketplace.connect(buyer).purchaseDataset(1, { value: ethers.parseEther("0.5") }))
        .to.be.revertedWith("Incorrect price");
    });

    it("should fail to purchase already purchased dataset", async function () {
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).listDataset("ipfsHash5", price);
      await marketplace.connect(buyer).purchaseDataset(1, { value: price });
      await expect(marketplace.connect(other).purchaseDataset(1, { value: price }))
        .to.be.revertedWith("Already purchased");
    });

    it("should allow seller to withdraw funds after sale", async function () {
      const price = ethers.parseEther("1");
      await marketplace.connect(seller).listDataset("ipfsHash6", price);
      await marketplace.connect(buyer).purchaseDataset(1, { value: price });
      const before = await ethers.provider.getBalance(seller.address);
      const tx = await marketplace.connect(seller).withdraw();
      const receipt = await tx.wait();
      const after = await ethers.provider.getBalance(seller.address);
      expect(after).to.be.above(before);
    });

    it("should fail to withdraw if no funds", async function () {
      await expect(marketplace.connect(seller).withdraw()).to.be.revertedWith("No funds");
    });
  });

  describe("Reputation", function () {
    it("should submit a valid rating and emit event", async function () {
      await expect(reputation.connect(buyer).submitRating(seller.address, 5))
        .to.emit(reputation, "RatingSubmitted")
        .withArgs(seller.address, 5);
      expect(await reputation.getReputation(seller.address)).to.equal(500);
    });

    it("should fail to submit invalid rating (0)", async function () {
      await expect(reputation.connect(buyer).submitRating(seller.address, 0)).to.be.revertedWith("Invalid rating");
    });

    it("should fail to submit invalid rating (>5)", async function () {
      await expect(reputation.connect(buyer).submitRating(seller.address, 6)).to.be.revertedWith("Invalid rating");
    });

    it("should return 0 reputation for unrated user", async function () {
      expect(await reputation.getReputation(other.address)).to.equal(0);
    });
  });

  describe("Incentives", function () {
    it("should allow owner to distribute reward and emit event", async function () {
      await expect(incentives.connect(owner).distributeReward(buyer.address, 100))
        .to.emit(incentives, "RewardDistributed")
        .withArgs(buyer.address, 100);
      expect(await incentives.pendingRewards(buyer.address)).to.equal(100);
    });

    it("should fail if non-owner tries to distribute reward", async function () {
      await expect(incentives.connect(buyer).distributeReward(buyer.address, 100)).to.be.revertedWithCustomError(incentives, "OwnableUnauthorizedAccount");
    });

    it("should allow user to claim reward and emit event", async function () {
      await incentives.connect(owner).distributeReward(buyer.address, 100);
      await expect(incentives.connect(buyer).claimReward())
        .to.emit(incentives, "RewardClaimed")
        .withArgs(buyer.address, 100);
      expect(await incentives.balanceOf(buyer.address)).to.equal(100);
      expect(await incentives.pendingRewards(buyer.address)).to.equal(0);
    });

    it("should fail to claim reward if none available", async function () {
      await expect(incentives.connect(buyer).claimReward()).to.be.revertedWith("No rewards");
    });
  });
}); 