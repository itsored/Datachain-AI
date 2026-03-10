// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IMarketplaceReputation {
    function hasPurchased(uint256 datasetId, address buyer) external view returns (bool);

    function datasets(
        uint256 datasetId
    ) external view returns (address seller, string memory ipfsHash, uint256 price, bool active, uint256 purchaseCount);
}

contract Reputation {
    struct Rep {
        uint256 total;
        uint256 count;
        uint256 positiveCount;
        uint256 neutralCount;
        uint256 negativeCount;
        uint256 verifiedCount;
        uint256 lastUpdatedAt;
    }

    uint256 public constant MAX_REVIEW_LENGTH = 280;

    address public immutable marketplace;

    mapping(address => Rep) private reputations;
    mapping(address => mapping(uint256 => mapping(address => bool))) private submittedRatings;

    event RatingSubmitted(
        address indexed seller,
        address indexed reviewer,
        uint256 indexed datasetId,
        uint8 rating,
        string review
    );

    constructor(address marketplaceAddress) {
        require(marketplaceAddress != address(0), "Invalid marketplace");
        marketplace = marketplaceAddress;
    }

    function submitRating(address seller, uint256 datasetId, uint8 rating, string calldata review) external {
        require(seller != address(0), "Invalid seller");
        require(rating > 0 && rating <= 5, "Invalid rating");
        require(bytes(review).length <= MAX_REVIEW_LENGTH, "Review too long");

        (address datasetSeller, , , , ) = IMarketplaceReputation(marketplace).datasets(datasetId);
        require(datasetSeller != address(0), "Dataset does not exist");
        require(datasetSeller == seller, "Seller mismatch");
        require(IMarketplaceReputation(marketplace).hasPurchased(datasetId, msg.sender), "Verified purchase required");
        require(!submittedRatings[seller][datasetId][msg.sender], "Already rated dataset");

        submittedRatings[seller][datasetId][msg.sender] = true;

        Rep storage rep = reputations[seller];
        rep.total += rating;
        rep.count += 1;
        rep.verifiedCount += 1;
        rep.lastUpdatedAt = block.timestamp;

        if (rating >= 4) {
            rep.positiveCount += 1;
        } else if (rating == 3) {
            rep.neutralCount += 1;
        } else {
            rep.negativeCount += 1;
        }

        emit RatingSubmitted(seller, msg.sender, datasetId, rating, review);
    }

    function getReputation(address seller) external view returns (uint256 reputation) {
        Rep storage rep = reputations[seller];
        if (rep.count == 0) return 0;
        reputation = (rep.total * 100) / rep.count;
    }

    function getReputationSummary(
        address seller
    )
        external
        view
        returns (
            uint256 reputation,
            uint256 totalRatings,
            uint256 positiveRatings,
            uint256 neutralRatings,
            uint256 negativeRatings,
            uint256 verifiedRatings,
            uint256 lastUpdatedAt
        )
    {
        Rep storage rep = reputations[seller];
        if (rep.count > 0) {
            reputation = (rep.total * 100) / rep.count;
        }
        totalRatings = rep.count;
        positiveRatings = rep.positiveCount;
        neutralRatings = rep.neutralCount;
        negativeRatings = rep.negativeCount;
        verifiedRatings = rep.verifiedCount;
        lastUpdatedAt = rep.lastUpdatedAt;
    }

    function hasRated(address seller, uint256 datasetId, address reviewer) external view returns (bool) {
        return submittedRatings[seller][datasetId][reviewer];
    }
}
