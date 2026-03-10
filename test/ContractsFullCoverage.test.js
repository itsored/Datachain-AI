const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Full Contract Functionality Coverage", function () {
  let marketplace, reputation, incentives, mockUSDC, owner, seller, buyer, other;

  beforeEach(async function () {
    [owner, seller, buyer, other] = await ethers.getSigners();

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

  describe("Marketplace", function () {
    it("should list a dataset and emit event", async function () {
      const price = ethers.parseUnits("1", 6);
      await expect(marketplace.connect(seller).listDataset("ipfsHash1", price))
        .to.emit(marketplace, "DatasetListed")
        .withArgs(1, seller.address, price, "ipfsHash1");
      const dataset = await marketplace.datasets(1);
      expect(dataset.seller).to.equal(seller.address);
      expect(dataset.ipfsHash).to.equal("ipfsHash1");
      expect(dataset.price).to.equal(price);
      expect(dataset.active).to.equal(true);
      expect(dataset.purchaseCount).to.equal(0);
    });

    it("should fail to list dataset with zero price", async function () {
      await expect(marketplace.connect(seller).listDataset("ipfsHash2", 0)).to.be.revertedWith("Price must be > 0");
    });

    it("should fail to list dataset with an empty IPFS hash", async function () {
      await expect(marketplace.connect(seller).listDataset("", ethers.parseUnits("1", 6))).to.be.revertedWith("IPFS hash required");
    });

    it("should purchase a dataset and emit event", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash3", price);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
      await expect(marketplace.connect(buyer).purchaseDataset(1))
        .to.emit(marketplace, "DatasetPurchased")
        .withArgs(1, buyer.address, seller.address, price);
      const dataset = await marketplace.datasets(1);
      expect(dataset.purchaseCount).to.equal(1);
      expect(await marketplace.hasPurchased(1, buyer.address)).to.equal(true);
    });

    it("should fail to purchase without sufficient allowance", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash4", price);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await expect(marketplace.connect(buyer).purchaseDataset(1))
        .to.be.revertedWithCustomError(mockUSDC, "ERC20InsufficientAllowance");
    });

    it("should fail to purchase the same dataset twice from the same buyer", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash5", price);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
      await marketplace.connect(buyer).purchaseDataset(1);

      await expect(marketplace.connect(buyer).purchaseDataset(1))
        .to.be.revertedWith("Dataset already purchased by buyer");
    });

    it("should allow a second buyer to purchase the same dataset", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash5b", price);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await mockUSDC.connect(owner).mint(other.address, price);
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
      await mockUSDC.connect(other).approve(await marketplace.getAddress(), price);
      await marketplace.connect(buyer).purchaseDataset(1);
      await marketplace.connect(other).purchaseDataset(1);
      expect((await marketplace.datasets(1)).purchaseCount).to.equal(2);
    });

    it("should fail if the seller tries to buy their own dataset", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash5c", price);
      await mockUSDC.connect(owner).mint(seller.address, price);
      await mockUSDC.connect(seller).approve(await marketplace.getAddress(), price);
      await expect(marketplace.connect(seller).purchaseDataset(1)).to.be.revertedWith("Seller cannot buy own dataset");
    });

    it("should fail to purchase an inactive dataset", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash5d", price);
      await marketplace.connect(seller).setDatasetActive(1, false);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
      await expect(marketplace.connect(buyer).purchaseDataset(1)).to.be.revertedWith("Dataset not active");
    });

    it("should allow the seller to update price", async function () {
      const newPrice = ethers.parseUnits("2", 6);
      await marketplace.connect(seller).listDataset("ipfsHash5e", ethers.parseUnits("1", 6));
      await expect(marketplace.connect(seller).updateDatasetPrice(1, newPrice))
        .to.emit(marketplace, "DatasetPriceUpdated")
        .withArgs(1, newPrice);
      expect((await marketplace.datasets(1)).price).to.equal(newPrice);
    });

    it("should prevent non-sellers from changing listing state", async function () {
      await marketplace.connect(seller).listDataset("ipfsHash5f", ethers.parseUnits("1", 6));
      await expect(marketplace.connect(buyer).setDatasetActive(1, false)).to.be.revertedWith("Only seller");
    });

    it("should allow seller to withdraw funds after sale", async function () {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash6", price);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
      await marketplace.connect(buyer).purchaseDataset(1);
      const before = await mockUSDC.balanceOf(seller.address);
      await marketplace.connect(seller).withdraw();
      const after = await mockUSDC.balanceOf(seller.address);
      expect(after - before).to.equal(price);
    });

    it("should fail to withdraw if no funds", async function () {
      await expect(marketplace.connect(seller).withdraw()).to.be.revertedWith("No funds");
    });
  });

  describe("Reputation", function () {
    async function purchaseDatasetForRating() {
      const price = ethers.parseUnits("1", 6);
      await marketplace.connect(seller).listDataset("ipfsHash-rating", price);
      await mockUSDC.connect(owner).mint(buyer.address, price);
      await mockUSDC.connect(buyer).approve(await marketplace.getAddress(), price);
      await marketplace.connect(buyer).purchaseDataset(1);
      return 1;
    }

    it("should submit a verified dataset rating and emit the enhanced event", async function () {
      const datasetId = await purchaseDatasetForRating();

      await expect(reputation.connect(buyer).submitRating(seller.address, datasetId, 5, "Excellent provenance"))
        .to.emit(reputation, "RatingSubmitted")
        .withArgs(seller.address, buyer.address, datasetId, 5, "Excellent provenance");
      expect(await reputation.getReputation(seller.address)).to.equal(500);

      const summary = await reputation.getReputationSummary(seller.address);
      expect(summary.totalRatings).to.equal(1);
      expect(summary.positiveRatings).to.equal(1);
      expect(summary.neutralRatings).to.equal(0);
      expect(summary.negativeRatings).to.equal(0);
      expect(summary.verifiedRatings).to.equal(1);
    });

    it("should fail to submit invalid rating (0)", async function () {
      const datasetId = await purchaseDatasetForRating();
      await expect(reputation.connect(buyer).submitRating(seller.address, datasetId, 0, "")).to.be.revertedWith("Invalid rating");
    });

    it("should fail to submit invalid rating (>5)", async function () {
      const datasetId = await purchaseDatasetForRating();
      await expect(reputation.connect(buyer).submitRating(seller.address, datasetId, 6, "")).to.be.revertedWith("Invalid rating");
    });

    it("should fail if the buyer has not purchased the dataset", async function () {
      await marketplace.connect(seller).listDataset("ipfsHash-rating-2", ethers.parseUnits("1", 6));
      await expect(reputation.connect(buyer).submitRating(seller.address, 1, 4, "Looks good"))
        .to.be.revertedWith("Verified purchase required");
    });

    it("should fail to rate the same seller twice for the same dataset", async function () {
      const datasetId = await purchaseDatasetForRating();
      await reputation.connect(buyer).submitRating(seller.address, datasetId, 4, "Solid listing");

      await expect(reputation.connect(buyer).submitRating(seller.address, datasetId, 5, "Second try"))
        .to.be.revertedWith("Already rated dataset");
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

  describe("MockUSDC", function () {
    it("should mint initial supply to the owner with 6 decimals", async function () {
      expect(await mockUSDC.decimals()).to.equal(6);
      expect(await mockUSDC.balanceOf(owner.address)).to.equal(ethers.parseUnits("1000000", 6));
    });

    it("should allow the owner to mint testnet balances", async function () {
      await mockUSDC.connect(owner).mint(buyer.address, ethers.parseUnits("250", 6));
      expect(await mockUSDC.balanceOf(buyer.address)).to.equal(ethers.parseUnits("250", 6));
    });

    it("should allow users to claim faucet tokens", async function () {
      await mockUSDC.connect(buyer).faucet();
      expect(await mockUSDC.balanceOf(buyer.address)).to.equal(await mockUSDC.FAUCET_AMOUNT());
    });
  });
});
