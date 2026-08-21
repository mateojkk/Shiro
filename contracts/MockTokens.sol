// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MockERC20
 * @dev Local/test helper token with faucet capability.
 */
contract MockERC20 is ERC20, Ownable {
    uint8 private _decimals;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _decimals = decimals_;
        // Mint initial supply to deployer
        _mint(msg.sender, 1_000_000 * (10 ** decimals_));
    }

    function decimals() public view virtual override returns (uint8) {
        return _decimals;
    }

    /**
     * @notice Public faucet for testnet users / hackathon judges.
     * @param amount Amount to mint (in wei / smallest unit). Capped at 5,000 tokens per call.
     */
    function faucet(uint256 amount) external {
        uint256 maxAmount = 5_000 * (10 ** _decimals);
        require(amount <= maxAmount, "Faucet amount exceeds max 5000 tokens");
        _mint(msg.sender, amount);
    }

    /**
     * @notice Mint arbitrary amount (owner only).
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}

contract MockDex {
    using SafeERC20 for IERC20;

    function swapExactMock(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 toAmount
    ) external {
        IERC20(fromToken).safeTransferFrom(msg.sender, address(this), fromAmount);
        IERC20(toToken).safeTransfer(msg.sender, toAmount);
    }
}
