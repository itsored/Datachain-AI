// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Incentives
 * @notice Reward token with claim functionality.
 */
contract Incentives is ERC20, Ownable {
    mapping(address => uint256) public pendingRewards;

    event RewardDistributed(address indexed user, uint256 amount);
    event RewardClaimed(address indexed user, uint256 amount);

    constructor() ERC20("RewardToken", "RWD") Ownable(msg.sender) {}

    /**
     * @notice Distribute rewards to a user. Only owner can call.
     * @param user Recipient of rewards.
     * @param amount Amount of tokens to grant.
     */
    function distributeReward(address user, uint256 amount) external onlyOwner {
        pendingRewards[user] += amount;
        emit RewardDistributed(user, amount);
    }

    /**
     * @notice Claim accumulated rewards.
     */
    function claimReward() external {
        uint256 amount = pendingRewards[msg.sender];
        require(amount > 0, "No rewards");
        pendingRewards[msg.sender] = 0;
        _mint(msg.sender, amount);
        emit RewardClaimed(msg.sender, amount);
    }
}
