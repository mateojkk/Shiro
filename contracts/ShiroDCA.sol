// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ShiroVault.sol";
import "./ShiroRouter.sol";

/**
 * @title ShiroDCA
 * @notice Autonomous Dollar Cost Averaging & Conditional Limit Registry on X Layer.
 * Allows users to set recurring DeFi intents that are trustlessly executed by Shiro keepers.
 */
contract ShiroDCA is ReentrancyGuard, Ownable {
    struct DCAOrder {
        uint256 id;
        address user;
        address fromToken;
        address toToken;
        uint256 amountPerCycle;
        uint256 totalCycles;
        uint256 executedCycles;
        uint256 intervalSeconds;
        uint256 nextExecutionTime;
        uint256 maxSlippageBps; // Basis points (e.g. 50 = 0.5%)
        bool isActive;
        bool returnToVault;
    }

    ShiroVault public vault;
    ShiroRouter public router;
    uint256 public nextOrderId;

    mapping(uint256 => DCAOrder) public orders;
    mapping(address => uint256[]) public userOrders;
    mapping(address => bool) public isAuthorizedKeeper;

    event DCAOrderCreated(
        uint256 indexed orderId,
        address indexed user,
        address fromToken,
        address toToken,
        uint256 amountPerCycle,
        uint256 totalCycles,
        uint256 intervalSeconds
    );
    event DCACycleExecuted(
        uint256 indexed orderId,
        uint256 cycleIndex,
        uint256 totalCycles,
        uint256 amountOut,
        address keeper
    );
    event DCAOrderCancelled(uint256 indexed orderId, address indexed user);
    event KeeperStatusUpdated(address indexed keeper, bool isAuthorized);

    constructor(address _vault, address _router) Ownable(msg.sender) {
        require(_vault != address(0), "Invalid vault");
        require(_router != address(0), "Invalid router");
        vault = ShiroVault(payable(_vault));
        router = ShiroRouter(payable(_router));
    }

    function setVaultAndRouter(address _vault, address _router) external onlyOwner {
        require(_vault != address(0), "Invalid vault");
        require(_router != address(0), "Invalid router");
        vault = ShiroVault(payable(_vault));
        router = ShiroRouter(payable(_router));
    }

    function setKeeperAuthorization(address keeper, bool authorized) external onlyOwner {
        require(keeper != address(0), "Invalid keeper");
        isAuthorizedKeeper[keeper] = authorized;
        emit KeeperStatusUpdated(keeper, authorized);
    }

    /**
     * @notice Create a recurring DCA intent.
     */
    function createDCAOrder(
        address fromToken,
        address toToken,
        uint256 amountPerCycle,
        uint256 totalCycles,
        uint256 intervalSeconds,
        uint256 maxSlippageBps,
        bool returnToVault
    ) external returns (uint256 orderId) {
        require(fromToken != address(0), "Invalid from token");
        require(toToken != address(0), "Invalid to token");
        require(amountPerCycle > 0, "Amount per cycle must be > 0");
        require(totalCycles > 0, "Total cycles must be > 0");
        require(intervalSeconds >= 10, "Interval must be >= 10s");
        require(maxSlippageBps <= 5_000, "Slippage too high");

        orderId = nextOrderId++;
        orders[orderId] = DCAOrder({
            id: orderId,
            user: msg.sender,
            fromToken: fromToken,
            toToken: toToken,
            amountPerCycle: amountPerCycle,
            totalCycles: totalCycles,
            executedCycles: 0,
            intervalSeconds: intervalSeconds,
            nextExecutionTime: block.timestamp, // First cycle executable immediately
            maxSlippageBps: maxSlippageBps,
            isActive: true,
            returnToVault: returnToVault
        });

        userOrders[msg.sender].push(orderId);

        emit DCAOrderCreated(
            orderId,
            msg.sender,
            fromToken,
            toToken,
            amountPerCycle,
            totalCycles,
            intervalSeconds
        );
    }

    /**
     * @notice Execute a due DCA cycle. Can be called by the Shiro autonomous keeper bot or anyone.
     */
    function executeDCACycle(
        uint256 orderId,
        uint256 minToAmount,
        address dexTarget,
        bytes calldata dexData
    ) external nonReentrant returns (uint256 amountOut) {
        DCAOrder storage order = orders[orderId];
        require(order.isActive, "Order is not active");
        require(msg.sender == order.user || msg.sender == owner() || isAuthorizedKeeper[msg.sender], "Unauthorized executor");
        require(block.timestamp >= order.nextExecutionTime, "Cycle not yet due");
        require(order.executedCycles < order.totalCycles, "Order already completed");
        require(minToAmount > 0, "Min output required");

        bytes32 intentId = keccak256(
            abi.encodePacked(orderId, order.executedCycles, block.timestamp)
        );

        // Advance schedule
        order.executedCycles += 1;
        order.nextExecutionTime = block.timestamp + order.intervalSeconds;

        if (order.executedCycles >= order.totalCycles) {
            order.isActive = false;
        }

        // Execute via ShiroRouter
        amountOut = router.executeVaultSwap(
            intentId,
            order.user,
            order.fromToken,
            order.toToken,
            order.amountPerCycle,
            minToAmount,
            order.returnToVault,
            dexTarget,
            dexData
        );

        emit DCACycleExecuted(orderId, order.executedCycles, order.totalCycles, amountOut, msg.sender);
    }

    /**
     * @notice Cancel an active DCA order.
     */
    function cancelDCAOrder(uint256 orderId) external {
        DCAOrder storage order = orders[orderId];
        require(order.user == msg.sender || msg.sender == owner(), "Unauthorized");
        require(order.isActive, "Order not active");

        order.isActive = false;
        emit DCAOrderCancelled(orderId, msg.sender);
    }

    function getUserOrderCount(address user) external view returns (uint256) {
        return userOrders[user].length;
    }

    function isOrderExecutable(uint256 orderId) external view returns (bool) {
        DCAOrder storage order = orders[orderId];
        return (order.isActive &&
            block.timestamp >= order.nextExecutionTime &&
            order.executedCycles < order.totalCycles);
    }
}
