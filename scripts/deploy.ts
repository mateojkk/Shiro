import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  if (!["hardhat", "localhost"].includes(network.name) && !process.env.PRIVATE_KEY) {
    throw new Error("PRIVATE_KEY is required for live network deployments");
  }

  const [deployer] = await ethers.getSigners();
  console.log("==================================================");
  console.log(`Deploying Shiro Protocol to Network: ${network.name} (Chain ID: ${network.config.chainId})`);
  console.log(`Deployer Address: ${deployer.address}`);
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer Balance: ${ethers.formatEther(balance)} OKB`);
  console.log("==================================================");

  const requiredAddress = (name: string, defaultAddress?: string) => {
    const value = process.env[name] || defaultAddress;
    if (!value || !ethers.isAddress(value)) {
      throw new Error(`${name} must be set to a valid address`);
    }
    return ethers.getAddress(value);
  };

  const okxDexRouter = requiredAddress("OKX_DEX_ROUTER", "0x7c5bee2a8091c3ef39072f64f18fac913060aeaf");
  const quickswapRouter = requiredAddress("QUICKSWAP_ROUTER", "0x4B9f4d2435Ef65559567e5DbFC1BbB37abC43B57");
  const keeperAddress = process.env.KEEPER_ADDRESS ? requiredAddress("KEEPER_ADDRESS") : deployer.address;

  let usdcAddress = requiredAddress("USDC_ADDRESS", "0x74b7f16337b8972027f6196a17a631ac6de26d22");
  let wethAddress = requiredAddress("WETH_ADDRESS", "0x5a77f1443d16ee5761d310e38b62f77f726bc71c");
  let usdtAddress = requiredAddress("USDT_ADDRESS", "0x1E4a5963aBFD975d8c9021ce480b42188849D41d");

  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Deploying local mock tokens...");
    const MockFactory = await ethers.getContractFactory("MockERC20");

    const mUSDC = await MockFactory.deploy("Mock USDC", "mUSDC", 6);
    await mUSDC.waitForDeployment();
    usdcAddress = await mUSDC.getAddress();
    console.log(`mUSDC deployed to: ${usdcAddress}`);

    const mWETH = await MockFactory.deploy("Mock WETH", "mWETH", 18);
    await mWETH.waitForDeployment();
    wethAddress = await mWETH.getAddress();
    console.log(`mWETH deployed to: ${wethAddress}`);

    const mUSDT = await MockFactory.deploy("Mock USDT", "mUSDT", 6);
    await mUSDT.waitForDeployment();
    usdtAddress = await mUSDT.getAddress();
    console.log(`mUSDT deployed to: ${usdtAddress}`);
  }

  // 1. Deploy ShiroVault
  console.log("\nDeploying ShiroVault...");
  const VaultFactory = await ethers.getContractFactory("ShiroVault");
  const vault = await VaultFactory.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log(`ShiroVault deployed to: ${vaultAddress}`);

  // 2. Deploy ShiroRouter
  console.log("\nDeploying ShiroRouter...");
  const RouterFactory = await ethers.getContractFactory("ShiroRouter");
  const router = await RouterFactory.deploy(
    vaultAddress,
    okxDexRouter,
    quickswapRouter
  );
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log(`ShiroRouter deployed to: ${routerAddress}`);

  // 3. Deploy ShiroDCA
  console.log("\nDeploying ShiroDCA...");
  const DCAFactory = await ethers.getContractFactory("ShiroDCA");
  const dca = await DCAFactory.deploy(vaultAddress, routerAddress);
  await dca.waitForDeployment();
  const dcaAddress = await dca.getAddress();
  console.log(`ShiroDCA deployed to: ${dcaAddress}`);

  // 4. Authorize modules in ShiroVault
  console.log("\nAuthorizing ShiroRouter and ShiroDCA in ShiroVault...");
  let tx = await vault.setModuleAuthorization(routerAddress, true);
  await tx.wait();
  tx = await vault.setModuleAuthorization(dcaAddress, true);
  await tx.wait();
  tx = await router.setExecutorAuthorization(dcaAddress, true);
  await tx.wait();
  tx = await router.setExecutorAuthorization(keeperAddress, true);
  await tx.wait();
  tx = await dca.setKeeperAuthorization(keeperAddress, true);
  await tx.wait();
  console.log("Modules authorized successfully!");
  
  if (network.name === "hardhat" || network.name === "localhost") {
    console.log("Minting liquidity to ShiroRouter...");
    const mUSDC = await ethers.getContractAt("MockERC20", usdcAddress);
    await mUSDC.mint(routerAddress, ethers.parseUnits("1000000", 6));
    const mUSDT = await ethers.getContractAt("MockERC20", usdtAddress);
    await mUSDT.mint(routerAddress, ethers.parseUnits("1000000", 6));
    const mWETH = await ethers.getContractAt("MockERC20", wethAddress);
    await mWETH.mint(routerAddress, ethers.parseUnits("1000", 18));
    await deployer.sendTransaction({ to: routerAddress, value: ethers.parseEther("0.05") });
    console.log("Liquidity minted!");
  }


  // Save deployment deployment artifacts
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      ShiroVault: vaultAddress,
      ShiroRouter: routerAddress,
      ShiroDCA: dcaAddress,
      USDC: usdcAddress,
      WETH: wethAddress,
      USDT: usdtAddress,
      OKXDEXRouter: okxDexRouter,
      QuickSwapRouter: quickswapRouter,
      KeeperExecutor: keeperAddress,
    },
  };

  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const filePath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(filePath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment saved to: ${filePath}`);
  console.log("==================================================");
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
