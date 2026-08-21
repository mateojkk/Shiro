import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import {
  MockERC20,
  ShiroVault,
  ShiroRouter,
  ShiroDCA,
  MockDex,
} from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Shiro Protocol on X Layer - Comprehensive Suite", function () {
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let keeper: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;

  let usdc: MockERC20;
  let weth: MockERC20;
  let vault: ShiroVault;
  let router: ShiroRouter;
  let dca: ShiroDCA;
  let mockDex: MockDex;

  const OKX_DEX_ROUTER = "0x7c5bee2a8091c3ef39072f64f18fac913060aeaf";
  const QUICKSWAP_ROUTER = "0x4B9f4d2435Ef65559567e5DbFC1BbB37abC43B57";

  beforeEach(async function () {
    [owner, user, keeper, attacker] = await ethers.getSigners();

    // 1. Deploy Mock Tokens
    const MockFactory = await ethers.getContractFactory("MockERC20");
    usdc = await MockFactory.deploy("Mock USDC", "mUSDC", 6);
    weth = await MockFactory.deploy("Mock WETH", "mWETH", 18);
    await usdc.waitForDeployment();
    await weth.waitForDeployment();

    // 2. Deploy ShiroVault
    const VaultFactory = await ethers.getContractFactory("ShiroVault");
    vault = await VaultFactory.deploy();
    await vault.waitForDeployment();

    // 3. Deploy ShiroRouter
    const RouterFactory = await ethers.getContractFactory("ShiroRouter");
    router = await RouterFactory.deploy(
      await vault.getAddress(),
      OKX_DEX_ROUTER,
      QUICKSWAP_ROUTER
    );
    await router.waitForDeployment();

    // 4. Deploy ShiroDCA
    const DCAFactory = await ethers.getContractFactory("ShiroDCA");
    dca = await DCAFactory.deploy(
      await vault.getAddress(),
      await router.getAddress()
    );
    await dca.waitForDeployment();

    const MockDexFactory = await ethers.getContractFactory("MockDex");
    mockDex = await MockDexFactory.deploy();
    await mockDex.waitForDeployment();

    // 5. Authorize Modules in ShiroVault
    await vault.setModuleAuthorization(await router.getAddress(), true);
    await vault.setModuleAuthorization(await dca.getAddress(), true);
    await router.setExecutorAuthorization(await dca.getAddress(), true);
    await router.setDexTargetAuthorization(await mockDex.getAddress(), true);
    await dca.setKeeperAuthorization(keeper.address, true);

    // 6. Fund user with tokens
    await usdc.mint(user.address, ethers.parseUnits("1000", 6));
    await weth.mint(user.address, ethers.parseUnits("10", 18));
  });

  describe("ShiroVault & Non-Custodial Session Keys", function () {
    it("should allow user to deposit and withdraw ERC20 tokens", async function () {
      const depositAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user).deposit(await usdc.getAddress(), depositAmount);

      expect(
        await vault.balances(user.address, await usdc.getAddress())
      ).to.equal(depositAmount);

      // Withdraw 50
      const withdrawAmount = ethers.parseUnits("50", 6);
      await vault.connect(user).withdraw(await usdc.getAddress(), withdrawAmount);

      expect(
        await vault.balances(user.address, await usdc.getAddress())
      ).to.equal(depositAmount - withdrawAmount);
    });

    it("should allow user to deposit and withdraw native OKB", async function () {
      const depositAmount = ethers.parseEther("1.0");
      await vault.connect(user).depositNative({ value: depositAmount });

      expect(
        await vault.balances(user.address, await vault.NATIVE_TOKEN())
      ).to.equal(depositAmount);

      await vault.connect(user).withdraw(await vault.NATIVE_TOKEN(), ethers.parseEther("0.5"));
      expect(
        await vault.balances(user.address, await vault.NATIVE_TOKEN())
      ).to.equal(ethers.parseEther("0.5"));
    });

    it("should enforce session key spend limits and expirations", async function () {
      const depositAmount = ethers.parseUnits("200", 6);
      await usdc.connect(user).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user).deposit(await usdc.getAddress(), depositAmount);

      // Authorize keeper for max 100 USDC for 1 hour (3600s)
      const maxSpend = ethers.parseUnits("100", 6);
      await vault
        .connect(user)
        .authorizeSession(keeper.address, await usdc.getAddress(), maxSpend, 3600);

      // Keeper spends 40 USDC
      await vault
        .connect(keeper)
        .executeSpend(
          user.address,
          await usdc.getAddress(),
          ethers.parseUnits("40", 6),
          keeper.address
        );

      expect(
        await vault.balances(user.address, await usdc.getAddress())
      ).to.equal(ethers.parseUnits("160", 6));

      // Keeper tries to spend 70 USDC (exceeds remaining 60 allowance)
      await expect(
        vault
          .connect(keeper)
          .executeSpend(
            user.address,
            await usdc.getAddress(),
            ethers.parseUnits("70", 6),
            keeper.address
          )
      ).to.be.revertedWith("Exceeds session max spend");

      // Advance time beyond 1 hour -> Session expired
      await time.increase(3601);
      await expect(
        vault
          .connect(keeper)
          .executeSpend(
            user.address,
            await usdc.getAddress(),
            ethers.parseUnits("10", 6),
            keeper.address
          )
      ).to.be.revertedWith("Session expired");
    });
  });

  describe("ShiroRouter Intent Execution", function () {
    it("should execute a direct swap and deliver tokens to recipient", async function () {
      const fromAmount = ethers.parseUnits("50", 6);
      await usdc.connect(user).approve(await router.getAddress(), fromAmount);

      const intentId = ethers.keccak256(ethers.toUtf8Bytes("swap-intent-1"));

      const toAmount = ethers.parseUnits("0.02", 18);
      await weth.mint(await mockDex.getAddress(), toAmount);
      const dexData = mockDex.interface.encodeFunctionData("swapExactMock", [
        await usdc.getAddress(),
        await weth.getAddress(),
        fromAmount,
        toAmount,
      ]);

      await router
        .connect(user)
        .executeDirectSwap(
          intentId,
          await usdc.getAddress(),
          await weth.getAddress(),
          fromAmount,
          0,
          user.address,
          await mockDex.getAddress(),
          dexData
        );

      expect(await weth.balanceOf(user.address)).to.equal(ethers.parseUnits("10.02", 18));
    });

    it("should reject vault swaps from unauthorized callers", async function () {
      const depositAmount = ethers.parseUnits("100", 6);
      await usdc.connect(user).approve(await vault.getAddress(), depositAmount);
      await vault.connect(user).deposit(await usdc.getAddress(), depositAmount);

      await expect(
        router
          .connect(keeper)
          .executeVaultSwap(
            ethers.keccak256(ethers.toUtf8Bytes("unauthorized")),
            user.address,
            await usdc.getAddress(),
            await weth.getAddress(),
            depositAmount,
            1,
            false,
            await mockDex.getAddress(),
            "0x1234"
          )
      ).to.be.revertedWith("Caller not authorized executor");
    });

    it("should reject unapproved DEX targets", async function () {
      const fromAmount = ethers.parseUnits("50", 6);
      const toAmount = ethers.parseUnits("0.02", 18);
      const UnapprovedDexFactory = await ethers.getContractFactory("MockDex");
      const unapprovedDex = await UnapprovedDexFactory.deploy();
      await unapprovedDex.waitForDeployment();
      await usdc.connect(user).approve(await router.getAddress(), fromAmount);
      await weth.mint(await unapprovedDex.getAddress(), toAmount);
      const dexData = unapprovedDex.interface.encodeFunctionData("swapExactMock", [
        await usdc.getAddress(),
        await weth.getAddress(),
        fromAmount,
        toAmount,
      ]);

      await expect(
        router
          .connect(user)
          .executeDirectSwap(
            ethers.keccak256(ethers.toUtf8Bytes("bad-dex")),
            await usdc.getAddress(),
            await weth.getAddress(),
            fromAmount,
            1,
            user.address,
            await unapprovedDex.getAddress(),
            dexData
          )
      ).to.be.revertedWith("DEX target not allowed");
    });
  });

  describe("ShiroDCA Recurring Intent Automation", function () {
    it("should create, monitor, and execute DCA cycles autonomously", async function () {
      // 1. Deposit 300 USDC into vault
      const totalDeposit = ethers.parseUnits("300", 6);
      await usdc.connect(user).approve(await vault.getAddress(), totalDeposit);
      await vault.connect(user).deposit(await usdc.getAddress(), totalDeposit);

      // 2. Create DCA Order: 100 USDC per cycle, 3 cycles, 60 seconds interval (return to user)
      const cycleAmount = ethers.parseUnits("100", 6);
      const toAmount = ethers.parseUnits("0.04", 18);
      await weth.mint(await mockDex.getAddress(), ethers.parseUnits("1", 18));
      const dexData = mockDex.interface.encodeFunctionData("swapExactMock", [
        await usdc.getAddress(),
        await weth.getAddress(),
        cycleAmount,
        toAmount,
      ]);
      await dca
        .connect(user)
        .createDCAOrder(
          await usdc.getAddress(),
          await weth.getAddress(),
          cycleAmount,
          3, // 3 cycles
          60, // 60s
          50, // 0.5% max slippage
          false // deliver to user
        );

      expect(await dca.getUserOrderCount(user.address)).to.equal(1n);
      expect(await dca.isOrderExecutable(0)).to.be.true;

      await expect(
        dca
          .connect(attacker)
          .executeDCACycle(0, 1, await mockDex.getAddress(), dexData)
      ).to.be.revertedWith("Unauthorized executor");

      // 3. Keeper executes Cycle 1
      await dca
        .connect(keeper)
        .executeDCACycle(0, 1, await mockDex.getAddress(), dexData);

      let order = await dca.orders(0);
      expect(order.executedCycles).to.equal(1n);
      expect(order.isActive).to.be.true;

      // Cycle 2 is not executable immediately before interval passes
      expect(await dca.isOrderExecutable(0)).to.be.false;

      // Advance time by 60 seconds
      await time.increase(60);
      expect(await dca.isOrderExecutable(0)).to.be.true;

      // Keeper executes Cycle 2
      await dca
        .connect(keeper)
        .executeDCACycle(0, 1, await mockDex.getAddress(), dexData);

      order = await dca.orders(0);
      expect(order.executedCycles).to.equal(2n);

      // Advance time and execute final Cycle 3
      await time.increase(60);
      await dca
        .connect(keeper)
        .executeDCACycle(0, 1, await mockDex.getAddress(), dexData);

      order = await dca.orders(0);
      expect(order.executedCycles).to.equal(3n);
      expect(order.isActive).to.be.false; // Completed!
    });
  });
});
