// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title Marketplace
 * @notice Handles listing and multi-buyer purchasing of datasets identified by IPFS hashes.
 */
contract Marketplace {
    using SafeERC20 for IERC20;

    struct Dataset {
        address seller;
        string ipfsHash;
        uint256 price;
        bool active;
        uint256 purchaseCount;
    }

    uint256 public datasetCount;
    IERC20 public immutable paymentToken;
    mapping(uint256 => Dataset) public datasets;
    mapping(uint256 => mapping(address => bool)) private datasetPurchasers;
    mapping(address => uint256) public pendingWithdrawals;

    event DatasetListed(uint256 indexed id, address indexed seller, uint256 price, string ipfsHash);
    event DatasetPurchased(uint256 indexed id, address indexed buyer, address indexed seller, uint256 price);
    event DatasetStatusUpdated(uint256 indexed id, bool active);
    event DatasetPriceUpdated(uint256 indexed id, uint256 price);

    constructor(address paymentTokenAddress) {
        require(paymentTokenAddress != address(0), "Invalid payment token");
        paymentToken = IERC20(paymentTokenAddress);
    }

    /**
     * @notice Lists a dataset on the marketplace.
     * @param ipfsHash IPFS hash of the dataset metadata.
     * @param price Price in payment-token base units for purchasing the dataset.
     * @return datasetId The id of the newly listed dataset.
     */
    function listDataset(string calldata ipfsHash, uint256 price) external returns (uint256 datasetId) {
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(price > 0, "Price must be > 0");

        datasetId = ++datasetCount;
        datasets[datasetId] = Dataset({
            seller: msg.sender,
            ipfsHash: ipfsHash,
            price: price,
            active: true,
            purchaseCount: 0
        });

        emit DatasetListed(datasetId, msg.sender, price, ipfsHash);
    }

    /**
     * @notice Purchases a dataset by id using the configured payment token.
     * @param datasetId The id of the dataset to purchase.
     */
    function purchaseDataset(uint256 datasetId) external {
        Dataset storage data = datasets[datasetId];
        require(data.seller != address(0), "Dataset does not exist");
        require(data.active, "Dataset not active");
        require(msg.sender != data.seller, "Seller cannot buy own dataset");
        require(!datasetPurchasers[datasetId][msg.sender], "Dataset already purchased by buyer");

        paymentToken.safeTransferFrom(msg.sender, address(this), data.price);
        datasetPurchasers[datasetId][msg.sender] = true;
        data.purchaseCount += 1;
        pendingWithdrawals[data.seller] += data.price;

        emit DatasetPurchased(datasetId, msg.sender, data.seller, data.price);
    }

    /**
     * @notice Returns whether a buyer has purchased a dataset.
     * @param datasetId Dataset identifier.
     * @param buyer Buyer address to check.
     */
    function hasPurchased(uint256 datasetId, address buyer) external view returns (bool) {
        return datasetPurchasers[datasetId][buyer];
    }

    /**
     * @notice Allows the seller to toggle dataset availability.
     * @param datasetId Dataset identifier.
     * @param active New availability flag.
     */
    function setDatasetActive(uint256 datasetId, bool active) external {
        Dataset storage data = datasets[datasetId];
        require(data.seller != address(0), "Dataset does not exist");
        require(data.seller == msg.sender, "Only seller");

        data.active = active;
        emit DatasetStatusUpdated(datasetId, active);
    }

    /**
     * @notice Allows the seller to update the listing price.
     * @param datasetId Dataset identifier.
     * @param price New price in payment-token base units.
     */
    function updateDatasetPrice(uint256 datasetId, uint256 price) external {
        Dataset storage data = datasets[datasetId];
        require(data.seller != address(0), "Dataset does not exist");
        require(data.seller == msg.sender, "Only seller");
        require(price > 0, "Price must be > 0");

        data.price = price;
        emit DatasetPriceUpdated(datasetId, price);
    }

    /**
     * @notice Withdraw accumulated funds from sales.
     */
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds");
        pendingWithdrawals[msg.sender] = 0;
        paymentToken.safeTransfer(msg.sender, amount);
    }
}
