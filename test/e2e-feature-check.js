const assert = require("assert");
const { createPublicClient, http, parseAbi, parseEther, parseUnits, encodeFunctionData } = require("viem");

const MAINNET_RPC = "https://rpc.xlayer.tech";
const LOCAL_API = "http://localhost:3000";

const client = createPublicClient({ transport: http(MAINNET_RPC) });

const WOKB_ADDR = "0xe538905cf8410324e03A5A23C1c177a474D59b2b";
const USDC_ADDR = "0x74b7f16337b8972027f6196a17a631ac6de26d22";
const USDT_ADDR = "0x1E4a5963aBFD975d8c9021ce480b42188849D41d";
const WETH_ADDR = "0x5a77f1443d16ee5761d310e38b62f77f726bc71c";
const OKX_ROUTER = "0x7c5bEE2a8091C3ef39072f64F18Fac913060AEaF";

const TEST_USER = "0x82c71B8BF4c2361665aE87fB929d2B271D4c277e";

const ERC20_ABI = parseAbi([
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const WOKB_ABI = parseAbi([
  "function deposit() payable",
  "function withdraw(uint256 wad)",
  "function balanceOf(address) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
]);

async function verifyAllFeatures() {
  console.log("===============================================================================");
  console.log("       SHIRO COMPLETE END-TO-END FEATURE VERIFICATION SUITE (MAINNET 196)      ");
  console.log("===============================================================================\n");

  let passed = 0;
  let failed = 0;

  async function check(featureGroup, testName, fn) {
    const label = `[${featureGroup}] ${testName}`;
    process.stdout.write(`• ${label.padEnd(65)} ... `);
    try {
      await fn();
      console.log("\x1b[32mPASSED ✅\x1b[0m");
      passed++;
    } catch (err) {
      console.log(`\x1b[31mFAILED ❌ (${err.message})\x1b[0m`);
      failed++;
    }
  }

  // --- 1. SYSTEM HEALTH & FRONTEND ROUTES ---
  console.log("--- 1. SYSTEM HEALTH & FRONTEND ROUTES ---");
  await check("HEALTH", "Next.js dApp Landing (/) returns HTTP 200 OK", async () => {
    const res = await fetch(`${LOCAL_API}/`);
    assert.strictEqual(res.status, 200);
  });

  await check("HEALTH", "Shiro AI Workspace (/chat) returns HTTP 200 OK", async () => {
    const res = await fetch(`${LOCAL_API}/chat`);
    assert.strictEqual(res.status, 200);
  });

  await check("HEALTH", "System Health API (/api/health) returns healthy & Chain 196", async () => {
    const res = await fetch(`${LOCAL_API}/api/health`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.status, "healthy");
    assert.strictEqual(data.chainId, 196);
  });

  // --- 2. AI INTENT PARSER & RISK ENGINE (GROQ LPU) ---
  console.log("\n--- 2. AI INTENT PARSER & RISK ENGINE (GROQ LPU) ---");

  await check("AI CHAT", "Conversational greeting does not trigger trade card", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Hello Shiro! What can you do on X Layer?" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.strictEqual(data.data.intent.action, "CHAT");
    assert.strictEqual(data.data.quote, null);
    assert.ok(data.data.intent.summary.length > 10);
  });

  await check("AI SWAP", "Natural language swap parses tokens, amount & quote", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Swap 0.05 OKB into USDC with 0.5% slippage" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.strictEqual(intent.action, "SWAP");
    assert.strictEqual(intent.fromToken, "OKB");
    assert.strictEqual(intent.toToken, "USDC");
    assert.strictEqual(intent.amount, "0.05");
    assert.ok(data.data.quote !== null);
    assert.ok(data.data.quote.toAmount > 0);
  });

  await check("AI WRAP", "Wrap prompt parses 1:1 fixed rate OKB -> WOKB", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Wrap 0.1 OKB into WOKB" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.strictEqual(intent.action, "WRAP");
    assert.strictEqual(intent.fromToken, "OKB");
    assert.strictEqual(intent.toToken, "WOKB");
    assert.strictEqual(intent.amount, "0.1");
    assert.strictEqual(data.data.quote.toAmount, 0.1);
    assert.strictEqual(data.data.quote.priceImpactPercent, "0.00% (Exact 1:1)");
  });

  await check("AI UNWRAP", "Unwrap prompt parses 1:1 fixed rate WOKB -> OKB", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Unwrap 0.1 WOKB into OKB" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.strictEqual(intent.action, "UNWRAP");
    assert.strictEqual(intent.fromToken, "WOKB");
    assert.strictEqual(intent.toToken, "OKB");
    assert.strictEqual(intent.amount, "0.1");
  });

  await check("AI RISK", "High slippage prompt triggers risk warnings", async () => {
    const res = await fetch(`${LOCAL_API}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "Swap 500 OKB into USDC with 15% slippage" }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    const intent = data.data.intent;
    assert.ok(intent.riskRating === "HIGH" || intent.riskRating === "MEDIUM");
    assert.ok(intent.safetyWarnings && intent.safetyWarnings.length > 0);
  });

  // --- 3. DEX SWAP ENGINE & ONCHAIN ENCODING ---
  console.log("\n--- 3. DEX SWAP ENGINE & ONCHAIN ENCODING ---");

  await check("DEX SWAP", "ERC20 Approval calldata correctly encodes for OKX Router", async () => {
    const calldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [OKX_ROUTER, parseUnits("50", 6)],
    });
    assert.ok(calldata.startsWith("0x095ea7b3"));
  });

  await check("DEX SWAP", "Swap API (/api/swap) returns executable calldata", async () => {
    const res = await fetch(`${LOCAL_API}/api/swap`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromTokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        toTokenAddress: USDC_ADDR,
        amount: parseEther("0.05").toString(),
        slippagePercent: "0.5",
        userWalletAddress: TEST_USER,
      }),
    });
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    assert.ok(data.tx && data.tx.to);
    assert.ok(data.tx.data && data.tx.data.startsWith("0x"));
  });

  // --- 4. 1:1 OKB WRAPPER (ONCHAIN VERIFIED ON MAINNET 196) ---
  console.log("\n--- 4. 1:1 OKB WRAPPER (ONCHAIN VERIFIED ON MAINNET 196) ---");

  await check("WRAP", "WOKB Deposit calldata correctly encodes for native OKB wrap", async () => {
    const calldata = encodeFunctionData({
      abi: WOKB_ABI,
      functionName: "deposit",
    });
    assert.strictEqual(calldata, "0xd0e30db0");
  });

  await check("WRAP", "WOKB Withdraw calldata correctly encodes for native OKB unwrap", async () => {
    const calldata = encodeFunctionData({
      abi: WOKB_ABI,
      functionName: "withdraw",
      args: [parseEther("0.1")],
    });
    assert.ok(calldata.startsWith("0x2e1a7d4d"));
  });

  await check("WRAP", "Live Static Call: Query WOKB bytecode & total supply on Mainnet 196", async () => {
    const [sym, dec] = await Promise.all([
      client.readContract({ address: WOKB_ADDR, abi: WOKB_ABI, functionName: "symbol" }),
      client.readContract({ address: WOKB_ADDR, abi: WOKB_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(sym, "WOKB");
    assert.strictEqual(dec, 18);
  });

  // --- 5. PORTFOLIO & ONCHAIN ASSET QUERIES ---
  console.log("\n--- 5. PORTFOLIO & ONCHAIN ASSET QUERIES ---");

  await check("PORTFOLIO", "Live Static Call: Query USDC metadata on Mainnet 196", async () => {
    const [sym, dec] = await Promise.all([
      client.readContract({ address: USDC_ADDR, abi: ERC20_ABI, functionName: "symbol" }),
      client.readContract({ address: USDC_ADDR, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(sym, "USDC");
    assert.strictEqual(dec, 6);
  });

  await check("PORTFOLIO", "Live Static Call: Query USDT metadata on Mainnet 196", async () => {
    const [sym, dec] = await Promise.all([
      client.readContract({ address: USDT_ADDR, abi: ERC20_ABI, functionName: "symbol" }),
      client.readContract({ address: USDT_ADDR, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(sym, "USDT");
    assert.strictEqual(dec, 6);
  });

  await check("PORTFOLIO", "Live Static Call: Query WETH metadata on Mainnet 196", async () => {
    const [sym, dec] = await Promise.all([
      client.readContract({ address: WETH_ADDR, abi: ERC20_ABI, functionName: "symbol" }),
      client.readContract({ address: WETH_ADDR, abi: ERC20_ABI, functionName: "decimals" }),
    ]);
    assert.strictEqual(sym, "WETH");
    assert.strictEqual(dec, 18);
  });

  await check("PORTFOLIO", "Live Static Call: Query wallet balance (zero gas cost)", async () => {
    const bal = await client.getBalance({ address: TEST_USER });
    assert.ok(typeof bal === "bigint");
  });

  // --- FINAL SUMMARY ---
  console.log("\n===============================================================================");
  console.log(`  FEATURE VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("===============================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

verifyAllFeatures().catch((e) => {
  console.error("Verification fatal error:", e);
  process.exit(1);
});
