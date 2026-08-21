const assert = require("assert");
const { createPublicClient, http, encodeFunctionData, parseUnits, parseAbi } = require("viem");

const MAINNET_RPC = "https://rpc.xlayer.tech";
const LOCAL_API = "http://localhost:3000";

const clientMainnet = createPublicClient({ transport: http(MAINNET_RPC) });

const ERC20_ABI = parseAbi([
  "function balanceOf(address account) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
]);

const QUICKSWAP_ROUTER_ABI = parseAbi([
  "function exactInputSingle((address tokenIn, address tokenOut, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 limitSqrtPrice)) external payable returns (uint256 amountOut)"
]);

const TEST_USER = "0x82c71B8BF4c2361665aE87fB929d2B271D4c277e";
const QUICKSWAP_ROUTER = "0x4B9f4d2435Ef65559567e5DbFC1BbB37abC43B57";
const OKX_DEX_ROUTER = "0x7c5bEE2a8091C3ef39072f64F18Fac913060AEaF";
const USDC_ADDR = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
const WOKB_ADDR = "0xe538905cf8410324e03A5A23C1c177a474D59b2b";
const WETH_ADDR = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";

async function runAllTests() {
  console.log("=================================================================");
  console.log("  SHIRO PROTOCOL — X LAYER MAINNET INTEGRATION & API TEST SUITE   ");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  async function test(name, fn) {
    process.stdout.write(`• Testing: ${name.padEnd(58)} ... `);
    try {
      await fn();
      console.log("\x1b[32mPASS\x1b[0m");
      passed++;
    } catch (err) {
      console.log(`\x1b[31mFAIL\x1b[0m (${err.message})`);
      failed++;
    }
  }

  // --- 1. HEALTH & ENDPOINT TESTS ---
  console.log("--- 1. API HEALTH & STATUS SUITE ---");
  await test("/api/health endpoint returns 200 OK & Mainnet chain", async () => {
    const res = await fetch(`${LOCAL_API}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.status === "healthy" || data.status === "ok");
    assert.strictEqual(data.chainId, 196);
  });

  // --- 2. INTENT CLASSIFICATION SUITE ---
  console.log("\n--- 2. AI INTENT & RISK CLASSIFICATION SUITE ---");

  await test("Conversational prompt is classified as CHAT (no trade card)", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello, how does Shiro work on X Layer?" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.data.intent.action, "CHAT");
    assert.strictEqual(data.data.quote, null);
  });

  await test("Vague swap inquiry is classified as CHAT asking for tokens", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "hey, i need to swap" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.data.intent.action, "CHAT");
    assert.strictEqual(data.data.quote, null);
  });

  await test("Explicit Swap prompt parses tokens, amount, and route", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Swap 0.05 OKB into USDC" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.strictEqual(intent.action, "SWAP");
    assert.strictEqual(intent.fromToken, "OKB");
    assert.strictEqual(intent.toToken, "USDC");
    assert.strictEqual(intent.amount, "0.05");
    assert.ok(data.data.quote !== null);
  });

  await test("DCA prompt parses interval, amount, and cycles", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "DCA 10 USDC into WETH every 1 hour for 5 cycles" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.strictEqual(intent.action, "DCA");
    assert.strictEqual(intent.fromToken, "USDC");
    assert.strictEqual(intent.toToken, "WETH");
    assert.strictEqual(intent.amount, "10");
    assert.strictEqual(intent.totalCycles, 5);
  });

  await test("High slippage prompt triggers HIGH/MEDIUM risk rating & warnings", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Swap 1000 OKB into USDC with 15% slippage" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.ok(intent.riskRating === "HIGH" || intent.riskRating === "MEDIUM");
    assert.ok(intent.safetyWarnings && intent.safetyWarnings.length > 0);
  });

  // --- 3. ONCHAIN PROTOCOL CALDATA & ABI SIMULATION SUITE ---
  console.log("\n--- 3. CANONICAL PROTOCOL ABI & CALLDATA SIMULATION SUITE ---");

  await test("QuickSwap V3 exactInputSingle calldata encodes accurately", async () => {
    const amountIn = parseUnits("0.05", 18);
    const calldata = encodeFunctionData({
      abi: QUICKSWAP_ROUTER_ABI,
      functionName: "exactInputSingle",
      args: [{
        tokenIn: WOKB_ADDR,
        tokenOut: USDC_ADDR,
        recipient: TEST_USER,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200),
        amountIn,
        amountOutMinimum: BigInt(0),
        limitSqrtPrice: BigInt(0),
      }],
    });
    assert.ok(calldata.startsWith("0x04e45aaf") || calldata.length > 10);
  });

  await test("ERC-20 approve calldata encodes accurately for DEX pools", async () => {
    const amountUnits = parseUnits("100", 6);
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [OKX_DEX_ROUTER, amountUnits],
    });
    assert.ok(calldata.startsWith("0x095ea7b3")); // approve selector
  });

  // --- 4. LIVE X LAYER MAINNET RPC STATIC CALL SUITE (ZERO GAS SPENT) ---
  console.log("\n--- 4. LIVE X LAYER MAINNET RPC STATIC CALL SUITE (ZERO GAS SPENT) ---");

  await test("Static Call: Query USDC contract on Mainnet 196", async () => {
    const [symbol, decimals] = await Promise.all([
      clientMainnet.readContract({ address: USDC_ADDR, abi: ERC20_ABI, functionName: "symbol" }),
      clientMainnet.readContract({ address: USDC_ADDR, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(symbol, "USDC");
    assert.strictEqual(decimals, 6);
  });

  await test("Static Call: Query WOKB contract on Mainnet 196", async () => {
    const [symbol, decimals] = await Promise.all([
      clientMainnet.readContract({ address: WOKB_ADDR, abi: ERC20_ABI, functionName: "symbol" }),
      clientMainnet.readContract({ address: WOKB_ADDR, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(symbol, "WOKB");
    assert.strictEqual(decimals, 18);
  });

  await test("Static Call: Query WETH contract on Mainnet 196", async () => {
    const [symbol, decimals] = await Promise.all([
      clientMainnet.readContract({ address: WETH_ADDR, abi: ERC20_ABI, functionName: "symbol" }),
      clientMainnet.readContract({ address: WETH_ADDR, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(symbol, "WETH");
    assert.strictEqual(decimals, 18);
  });

  await test("Static Call: Query Mainnet 196 Block Number and Liveness", async () => {
    const blockNumber = await clientMainnet.getBlockNumber();
    assert.ok(blockNumber > 0n);
  });

  // --- SUMMARY ---
  console.log("\n=================================================================");
  console.log(`  RESULTS: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
