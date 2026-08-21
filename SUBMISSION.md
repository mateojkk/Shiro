# 📋 X Layer Build XHackathon (AI Season) — Official Submission Package

> **Submission Form**: [Google Form Link](https://docs.google.com/forms/d/e/1FAIpQLSfgU_3zcXdxK0GJQxj33QeUWdEcAaYnieVe9p5cFDb2JFQa4Q/viewform?usp=publish-editor)  
> **Deadline**: August 21, 2026 at 23:59 UTC  
> **Project Name**: Shiro (白)  
> **Tagline**: Autonomous Intent-Driven AI DeFi Copilot on X Layer  

---

## 📌 1. Project Information for Submission Form

### Project Name
`Shiro`

### Short Description (1-2 sentences)
`Shiro is an autonomous, non-custodial AI DeFi copilot on X Layer that translates natural language intents into atomic DEX swaps, 1:1 OKB wrapping, and portfolio risk diagnostics routed through the OKX DEX aggregator on X Layer Mainnet.`

### Detailed Project Description
```markdown
### Problem
DeFi execution on Layer 2 networks remains fragmented and daunting. Users are forced to manually research liquidity pools, compare slippage across DEXs, calculate wrapping conversions, and monitor gas costs.

### Solution: Shiro
Shiro eliminates DeFi friction on X Layer by introducing a conversational, intent-based execution agent powered by Groq LPU inference (Llama-3.3-70B) and integrated directly with the OKX DEX Aggregator on X Layer Mainnet.

### Core Architectural Pillars:
1. Groq Ultra-Fast AI Intent Engine: Decomposes conversational commands into validated onchain intent payloads in sub-300ms.
2. OKX DEX Aggregator Routing: Queries X Layer liquidity routes (chainIndex: 196) for optimal price impact and execution, unlocking eligible volume toward the Launch Grant.
3. Canonical 1:1 OKB Wrapper: Integrates directly with X Layer's official WOKB contract (0xe538...9b2b) for zero-slippage native gas wrapping and unwrapping.
4. Built-in AI Risk & Safety Matrix: Automatically assesses slippage, liquidity depth, contract verification, and L2 gas spikes before every transaction.
5. 100% Non-Custodial: Users retain full custody of their assets with direct MetaMask transaction signing.
```

### Target Track & Grant Categories
- [x] **Hackathon Grant (1st, 2nd, 3rd Prize)**
- [x] **Launch Grant (Trading Volume via OKX DEX Aggregator on X Layer Mainnet)**

---

## 🔗 2. Canonical Contracts & Network Specifications

* **Network**: X Layer Mainnet (Chain ID `196`)
* **RPC Endpoint**: `https://rpc.xlayer.tech`
* **Explorer**: [OKLink X Layer Explorer](https://www.oklink.com/xlayer)

| Component | Contract Address (Mainnet 196) | Description |
| :--- | :--- | :--- |
| **OKX DEX Router** | `0x7c5bEE2a8091C3ef39072f64F18Fac913060AEaF` | Official OKX Multi-Chain Aggregator |
| **QuickSwap V3 Router** | `0x4B9f4d2435Ef65559567e5DbFC1BbB37abC43B57` | Canonical Algebra V3 Swap Router |
| **WOKB (Wrapped OKB)** | `0xe538905cf8410324e03A5A23C1c177a474D59b2b` | Official 18-dec Wrapped OKB Gas Contract |
| **USDC** | `0x74b7f16337b8972027f6196a17a631ac6de26d22` | Canonical 6-dec USDC |
| **USDT** | `0x1E4a5963aBFD975d8c9021ce480b42188849D41d` | Canonical 6-dec USDT |
| **WETH** | `0x5a77f1443d16ee5761d310e38b62f77f726bc71c` | Canonical 18-dec WETH |

---

## 🐦 3. Dedicated X (Twitter) Post Template

> **Requirement**: When submitting, the official project X account must publish a post mentioning `@XLayerOfficial`.

### Tweet Copy:
```text
🚀 Excited to unveil Shiro (@useshiro) for the @XLayerOfficial Build XHackathon AI Season!

Shiro is an autonomous, intent-based DeFi agent on X Layer zkEVM powered by @GroqInc AI inference & routed via @OKX DEX aggregator.

✨ Natural Language Swaps on X Layer Mainnet
✨ 1:1 Fixed-Rate OKB <-> WOKB Wrapper
✨ Sub-300ms Intent Engine with Built-in Risk Matrix

Try the live dApp on X Layer: https://github.com/mateo/Shiro

#XLayer #DeFAI #OKX #OKXDEX #Web3AI #BuildXHackathon
```

---

## 🎬 4. Demo Video Script (2-Minute Walkthrough)

* **[0:00 - 0:25] Introduction**:
  * "Welcome to Shiro, the autonomous intent-driven DeFi copilot built natively on X Layer zkEVM for the Build XHackathon AI Season."
  * Show the sleek terminal UI and live wallet connection on X Layer Mainnet (Chain ID 196).
* **[0:25 - 0:55] Groq AI Intent Parsing & OKX DEX Swapping**:
  * Type: *"Swap 0.05 OKB into USDC with 0.5% slippage"*.
  * Show sub-300ms Groq LPU intent extraction, live OKX DEX quote, and safety matrix.
  * Click "Broadcast on X Layer" and show 1-click confirmation.
* **[0:55 - 1:25] Canonical 1:1 OKB Wrapper (`WOKB`)**:
  * Navigate to "Wrap OKB" tab or type *"Wrap 0.1 OKB into WOKB"*.
  * Demonstrate instant 1:1 wrapping with zero slippage and direct OKLink verification.
* **[1:25 - 1:45] Portfolio Doctor & Diagnostics**:
  * Navigate to "Portfolio" tab and demonstrate live token balance scanning, asset allocation breakdown, and 1-click MetaMask token watch.
* **[1:45 - 2:00] Conclusion & X Layer Impact**:
  * "Shiro makes DeFi on X Layer as simple as natural language. Fast, non-custodial, and ready for production."
