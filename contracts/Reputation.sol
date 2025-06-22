// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Reputation
 * @notice Tracks user reputation scores based on submitted ratings.
 */
contract Reputation {
    struct Rep {
        uint256 total;
        uint256 count;
    }

    mapping(address => Rep) private reputations;

    event RatingSubmitted(address indexed user, uint8 rating);

    /**
     * @notice Submit a rating for a user.
     * @param user The address being rated.
     * @param rating Score between 1 and 5.
     */
    function submitRating(address user, uint8 rating) external {
        require(rating > 0 && rating <= 5, "Invalid rating");
        Rep storage r = reputations[user];
        r.total += rating;
        r.count += 1;
        emit RatingSubmitted(user, rating);
    }

    /**
     * @notice Get the average reputation score for a user.
     * @param user The address to query.
     * @return reputation Average rating with two decimals precision (rating*100/count).
     */
    function getReputation(address user) external view returns (uint256 reputation) {
        Rep storage r = reputations[user];
        if (r.count == 0) return 0;
        reputation = (r.total * 100) / r.count;
    }
}
