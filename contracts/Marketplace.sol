// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Marketplace
 * @notice Handles listing and purchasing of datasets identified by IPFS hashes.
 */
contract Marketplace {
    struct Dataset {
        address seller;
        string ipfsHash;
        uint256 price;
        address buyer;
    }

    uint256 public datasetCount;
    mapping(uint256 => Dataset) public datasets;
    mapping(address => uint256) public pendingWithdrawals;

    event DatasetListed(uint256 indexed id, address indexed seller, uint256 price, string ipfsHash);
    event DatasetPurchased(uint256 indexed id, address indexed buyer, uint256 price);

    /**
     * @notice Lists a dataset on the marketplace.
     * @param ipfsHash IPFS hash of the dataset metadata.
     * @param price Price in wei for purchasing the dataset.
     * @return datasetId The id of the newly listed dataset.
     */
    function listDataset(string calldata ipfsHash, uint256 price) external returns (uint256 datasetId) {
        require(price > 0, "Price must be > 0");

        datasetId = ++datasetCount;
        datasets[datasetId] = Dataset({seller: msg.sender, ipfsHash: ipfsHash, price: price, buyer: address(0)});

        emit DatasetListed(datasetId, msg.sender, price, ipfsHash);
    }

    /**
     * @notice Purchases a dataset by id.
     * @param datasetId The id of the dataset to purchase.
     */
    function purchaseDataset(uint256 datasetId) external payable {
        Dataset storage data = datasets[datasetId];
        require(data.seller != address(0), "Dataset does not exist");
        require(data.buyer == address(0), "Already purchased");
        require(msg.value == data.price, "Incorrect price");

        data.buyer = msg.sender;
        pendingWithdrawals[data.seller] += msg.value;

        emit DatasetPurchased(datasetId, msg.sender, data.price);
    }

    /**
     * @notice Withdraw accumulated funds from sales.
     */
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds");
        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }
}
