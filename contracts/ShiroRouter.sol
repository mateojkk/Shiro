// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ShiroVault.sol";

/**
 * @title ShiroRouter
 * @notice Intent-driven trade execution router on X Layer.
 * Supports direct swaps and automated vault-delegated swaps via OKX DEX and DEX protocols.
 */
contract ShiroRouter is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    address public constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    ShiroVault public vault;
    address public okxDexRouter;
    address public quickswapRouter;
    mapping(address => bool) public isAuthorizedExecutor;
    mapping(address => bool) public isAllowedDexTarget;

    event IntentExecuted(
        bytes32 indexed intentId,
        address indexed user,
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 toAmount,
        uint256 timestamp
    );
    event RouterUpdated(address indexed okxRouter, address indexed quickswapRouter);
    event VaultUpdated(address indexed newVault);
    event ExecutorStatusUpdated(address indexed executor, bool isAuthorized);
    event DexTargetStatusUpdated(address indexed target, bool isAllowed);

    constructor(
        address _vault,
        address _okxDexRouter,
        address _quickswapRouter
    ) Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault");
        vault = ShiroVault(payable(_vault));
        okxDexRouter = _okxDexRouter;
        quickswapRouter = _quickswapRouter;
        if (_okxDexRouter != address(0)) {
            isAllowedDexTarget[_okxDexRouter] = true;
            emit DexTargetStatusUpdated(_okxDexRouter, true);
        }
        if (_quickswapRouter != address(0)) {
            isAllowedDexTarget[_quickswapRouter] = true;
            emit DexTargetStatusUpdated(_quickswapRouter, true);
        }
    }

    receive() external payable {}

    function setVault(address _vault) external onlyOwner {
        require(_vault != address(0), "Invalid vault");
        vault = ShiroVault(payable(_vault));
        emit VaultUpdated(_vault);
    }

    function setRouters(address _okxRouter, address _quickswapRouter) external onlyOwner {
        if (okxDexRouter != address(0)) {
            isAllowedDexTarget[okxDexRouter] = false;
            emit DexTargetStatusUpdated(okxDexRouter, false);
        }
        if (quickswapRouter != address(0)) {
            isAllowedDexTarget[quickswapRouter] = false;
            emit DexTargetStatusUpdated(quickswapRouter, false);
        }
        okxDexRouter = _okxRouter;
        quickswapRouter = _quickswapRouter;
        if (_okxRouter != address(0)) {
            isAllowedDexTarget[_okxRouter] = true;
            emit DexTargetStatusUpdated(_okxRouter, true);
        }
        if (_quickswapRouter != address(0)) {
            isAllowedDexTarget[_quickswapRouter] = true;
            emit DexTargetStatusUpdated(_quickswapRouter, true);
        }
        emit RouterUpdated(_okxRouter, _quickswapRouter);
    }

    function setExecutorAuthorization(address executor, bool authorized) external onlyOwner {
        require(executor != address(0), "Invalid executor");
        isAuthorizedExecutor[executor] = authorized;
        emit ExecutorStatusUpdated(executor, authorized);
    }

    function setDexTargetAuthorization(address target, bool allowed) external onlyOwner {
        require(target != address(0), "Invalid DEX target");
        isAllowedDexTarget[target] = allowed;
        emit DexTargetStatusUpdated(target, allowed);
    }

    /**
     * @notice Execute a swap directly with caller's tokens and deliver output tokens to recipient.
     */
    function executeDirectSwap(
        bytes32 intentId,
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount,
        address recipient,
        address dexTarget,
        bytes calldata dexData
    ) external payable nonReentrant returns (uint256 amountOut) {
        require(fromAmount > 0, "From amount must be > 0");
        require(recipient != address(0), "Invalid recipient");

        // 1. Pull input tokens
        if (fromToken == NATIVE_TOKEN) {
            require(msg.value == fromAmount, "Invalid native OKB sent");
        } else {
            require(msg.value == 0, "Unexpected native OKB");
            IERC20(fromToken).safeTransferFrom(msg.sender, address(this), fromAmount);
        }

        // 2. Perform Swap
        amountOut = _performDexCall(fromToken, toToken, fromAmount, dexTarget, dexData);
        require(amountOut >= minToAmount, "Slippage limit exceeded");

        // 3. Deliver output tokens to recipient
        _deliverTokens(toToken, recipient, amountOut);

        emit IntentExecuted(intentId, msg.sender, fromToken, toToken, fromAmount, amountOut, block.timestamp);
    }

    /**
     * @notice Execute an intent on behalf of a vault user (called by authorized Keeper / ShiroDCA).
     */
    function executeVaultSwap(
        bytes32 intentId,
        address user,
        address fromToken,
        address toToken,
        uint256 fromAmount,
        uint256 minToAmount,
        bool returnToVault,
        address dexTarget,
        bytes calldata dexData
    ) external nonReentrant returns (uint256 amountOut) {
        require(isAuthorizedExecutor[msg.sender] || msg.sender == owner(), "Caller not authorized executor");
        require(fromAmount > 0, "From amount must be > 0");

        // 1. Pull tokens from ShiroVault
        vault.executeSpend(user, fromToken, fromAmount, address(this));

        // 2. Perform Swap
        amountOut = _performDexCall(fromToken, toToken, fromAmount, dexTarget, dexData);
        require(amountOut >= minToAmount, "Slippage limit exceeded");

        // 3. Route output back to vault or directly to user
        if (returnToVault) {
            if (toToken == NATIVE_TOKEN) {
                vault.creditBalance{value: amountOut}(user, NATIVE_TOKEN, amountOut);
            } else {
                IERC20(toToken).forceApprove(address(vault), amountOut);
                vault.creditBalance(user, toToken, amountOut);
            }
        } else {
            _deliverTokens(toToken, user, amountOut);
        }

        emit IntentExecuted(intentId, user, fromToken, toToken, fromAmount, amountOut, block.timestamp);
    }

    function _performDexCall(
        address fromToken,
        address toToken,
        uint256 fromAmount,
        address dexTarget,
        bytes calldata dexData
    ) internal returns (uint256 amountOut) {
        require(dexTarget != address(0), "DEX target required");
        require(isAllowedDexTarget[dexTarget], "DEX target not allowed");
        require(dexData.length > 0, "DEX calldata required");

        uint256 balanceBefore = _getBalance(toToken, address(this));
        if (fromToken != NATIVE_TOKEN) {
            IERC20(fromToken).forceApprove(dexTarget, fromAmount);
        }
        uint256 valueToSend = (fromToken == NATIVE_TOKEN) ? fromAmount : 0;
        (bool success, ) = dexTarget.call{value: valueToSend}(dexData);
        require(success, "DEX swap execution failed");
        uint256 balanceAfter = _getBalance(toToken, address(this));
        require(balanceAfter >= balanceBefore, "Invalid output balance");
        amountOut = balanceAfter - balanceBefore;
    }

    function _deliverTokens(address token, address recipient, uint256 amount) internal {
        if (token == NATIVE_TOKEN) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Failed to deliver native OKB");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    function _getBalance(address token, address account) internal view returns (uint256) {
        if (token == NATIVE_TOKEN) {
            return account.balance;
        } else {
            return IERC20(token).balanceOf(account);
        }
    }
}
