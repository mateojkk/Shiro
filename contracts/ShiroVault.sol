// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShiroVault
 * @notice Non-custodial intent vault and session manager on X Layer.
 * Users deposit assets and authorize delegated agents (keepers) with granular limits & expirations.
 */
contract ShiroVault is ReentrancyGuard, Pausable, Ownable {
    using SafeERC20 for IERC20;

    address public constant NATIVE_TOKEN = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;

    struct SessionKey {
        bool isActive;
        uint256 maxSpend;
        uint256 spent;
        uint256 expiresAt;
    }

    // user => token => balance (NATIVE_TOKEN represents native OKB)
    mapping(address => mapping(address => uint256)) public balances;

    // user => keeper => token => SessionKey
    mapping(address => mapping(address => mapping(address => SessionKey))) public sessions;

    // Whitelisted router/module addresses (e.g. ShiroRouter, ShiroDCA)
    mapping(address => bool) public isAuthorizedModule;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event SessionCreated(address indexed user, address indexed keeper, address indexed token, uint256 maxSpend, uint256 expiresAt);
    event SessionRevoked(address indexed user, address indexed keeper, address indexed token);
    event SessionSpent(address indexed user, address indexed keeper, address indexed token, uint256 amount);
    event ModuleStatusUpdated(address indexed module, bool isAuthorized);

    constructor() Ownable(msg.sender) {}

    receive() external payable {
        if (msg.value > 0) {
            balances[msg.sender][NATIVE_TOKEN] += msg.value;
            emit Deposited(msg.sender, NATIVE_TOKEN, msg.value);
        }
    }

    function setModuleAuthorization(address module, bool authorized) external onlyOwner {
        require(module != address(0), "Invalid module");
        isAuthorizedModule[module] = authorized;
        emit ModuleStatusUpdated(module, authorized);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Deposit ERC-20 tokens into the vault.
     */
    function deposit(address token, uint256 amount) external nonReentrant whenNotPaused {
        require(token != address(0) && token != NATIVE_TOKEN, "Use depositNative for OKB");
        require(amount > 0, "Amount must be > 0");

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        balances[msg.sender][token] += amount;

        emit Deposited(msg.sender, token, amount);
    }

    /**
     * @notice Deposit native OKB into the vault.
     */
    function depositNative() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "Amount must be > 0");
        balances[msg.sender][NATIVE_TOKEN] += msg.value;
        emit Deposited(msg.sender, NATIVE_TOKEN, msg.value);
    }

    /**
     * @notice Authorize an autonomous keeper with a spend allowance and expiry timestamp.
     */
    function authorizeSession(
        address keeper,
        address token,
        uint256 maxSpend,
        uint256 durationSeconds
    ) external whenNotPaused {
        require(keeper != address(0), "Invalid keeper address");
        require(token != address(0), "Invalid token");
        require(maxSpend > 0, "Max spend must be > 0");
        require(durationSeconds > 0, "Duration must be > 0");

        uint256 expiresAt = block.timestamp + durationSeconds;
        sessions[msg.sender][keeper][token] = SessionKey({
            isActive: true,
            maxSpend: maxSpend,
            spent: 0,
            expiresAt: expiresAt
        });

        emit SessionCreated(msg.sender, keeper, token, maxSpend, expiresAt);
    }

    /**
     * @notice Revoke a previously authorized session key immediately.
     */
    function revokeSession(address keeper, address token) external {
        delete sessions[msg.sender][keeper][token];
        emit SessionRevoked(msg.sender, keeper, token);
    }

    /**
     * @notice Execute a spend on behalf of a user using an active session key or via an authorized module.
     */
    function executeSpend(
        address user,
        address token,
        uint256 amount,
        address recipient
    ) external nonReentrant whenNotPaused {
        require(amount > 0, "Amount must be > 0");
        require(balances[user][token] >= amount, "Insufficient vault balance");

        if (isAuthorizedModule[msg.sender]) {
            // Authorized modules (ShiroRouter / ShiroDCA) can execute if approved
            balances[user][token] -= amount;
        } else {
            // Validate session key authorization
            SessionKey storage session = sessions[user][msg.sender][token];
            require(session.isActive, "Session not active");
            require(block.timestamp <= session.expiresAt, "Session expired");
            require(session.spent + amount <= session.maxSpend, "Exceeds session max spend");

            session.spent += amount;
            balances[user][token] -= amount;
            emit SessionSpent(user, msg.sender, token, amount);
        }

        if (token == NATIVE_TOKEN) {
            (bool success, ) = payable(recipient).call{value: amount}("");
            require(success, "Native transfer failed");
        } else {
            IERC20(token).safeTransfer(recipient, amount);
        }
    }

    /**
     * @notice User withdraws their deposited tokens at any time (non-custodial guarantee).
     */
    function withdraw(address token, uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be > 0");
        require(balances[msg.sender][token] >= amount, "Insufficient balance");

        balances[msg.sender][token] -= amount;

        require(token != address(0), "Invalid token");

        if (token == NATIVE_TOKEN) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Native OKB withdrawal failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Emergency withdrawal for a user to pull their entire balance of a token even if paused.
     */
    function emergencyWithdraw(address token) external nonReentrant {
        uint256 amount = balances[msg.sender][token];
        require(amount > 0, "Zero balance");

        balances[msg.sender][token] = 0;

        require(token != address(0), "Invalid token");

        if (token == NATIVE_TOKEN) {
            (bool success, ) = payable(msg.sender).call{value: amount}("");
            require(success, "Emergency native withdrawal failed");
        } else {
            IERC20(token).safeTransfer(msg.sender, amount);
        }

        emit Withdrawn(msg.sender, token, amount);
    }

    /**
     * @notice Credit tokens back into a user's vault balance (used by Router after swap).
     */
    function creditBalance(address user, address token, uint256 amount) external payable nonReentrant {
        require(isAuthorizedModule[msg.sender], "Caller not authorized module");
        require(user != address(0), "Invalid user");
        require(amount > 0, "Amount must be > 0");
        require(token != address(0), "Invalid token");
        if (token == NATIVE_TOKEN) {
            require(msg.value == amount, "Mismatched native value");
            balances[user][NATIVE_TOKEN] += amount;
        } else {
            require(msg.value == 0, "Unexpected native value");
            IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
            balances[user][token] += amount;
        }
        emit Deposited(user, token, amount);
    }
}
