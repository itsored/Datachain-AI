// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice 6-decimal pilot stablecoin for testnet marketplace purchases.
 */
contract MockUSDC is ERC20, Ownable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000 * 10 ** 6;
    uint256 public constant FAUCET_AMOUNT = 1_000 * 10 ** 6;
    uint256 public faucetCooldown = 1 days;

    mapping(address => uint256) public lastFaucetAt;

    constructor(address initialOwner) ERC20("DataChain USD Coin", "dcUSDC") Ownable(initialOwner) {
        _mint(initialOwner, INITIAL_SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function faucet() external {
        require(block.timestamp >= lastFaucetAt[msg.sender] + faucetCooldown, "Faucet cooldown active");
        lastFaucetAt[msg.sender] = block.timestamp;
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function setFaucetCooldown(uint256 newCooldown) external onlyOwner {
        faucetCooldown = newCooldown;
    }
}

