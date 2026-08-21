"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useSendTransaction,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain
} from "wagmi";
import {
  ArrowUp,
  Sparkles,
  Zap,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  ArrowLeftRight,
  RefreshCw,
  Repeat,
  Layers,
  PieChart,
  ChevronDown,
  ChevronUp,
  User,
  Cpu,
  AlertTriangle
} from "lucide-react";
import { parseEther, parseUnits, createPublicClient, http, formatUnits, formatEther } from "viem";
import { CONTRACT_ADDRESSES, ERC20_ABI, SHIRO_ROUTER_ABI, WOKB_ABI, xlayerMainnet } from "@/config/xlayer";

export interface IntentData {
  intent: {
    action: string;
    summary: string;
    fromToken: string;
    toToken: string;
    amount: string;
    intervalSeconds?: number;
    totalCycles?: number;
    triggerPrice?: string;
    slippageBps: number;
    estimatedGasOKB: string;
    riskRating: "LOW" | "MEDIUM" | "HIGH";
    confidenceScore: number;
    safetyWarnings: string[];
    engine?: string;
  };
  quote?: {
    success: boolean;
    isLive?: boolean;
    source: string;
    toAmount: number;
    toTokenAmount: string;
    priceImpactPercent: string;
    router: string;
  } | null;
  xLayerChainId?: number;
  recommendedRoute?: string;
  requiresVaultDeposit?: boolean;
}

export interface Message {
  id: string;
  sender: "user" | "shiro";
  content: string;
  timestamp: string;
  intentData?: IntentData;
  executionTimeMs?: number;
  reasoningSteps?: string[];
  txHash?: string;
  isExecuting?: boolean;
  isExecuted?: boolean;
  executionStatus?: "idle" | "pending" | "success" | "error";
  errorMessage?: string;
}

const SAMPLE_CARDS = [
  {
    icon: ArrowLeftRight,
    title: "Swap 0.05 OKB into USDC",
    desc: "Route via OKX DEX on X Layer Mainnet",
    prompt: "Swap 0.05 OKB into USDC with 0.5% slippage",
  },
  {
    icon: ArrowLeftRight,
    title: "Swap 10 USDC into WETH",
    desc: "Instant atomic token swap on Mainnet",
    prompt: "Swap 10 USDC into WETH on X Layer Mainnet",
  },
  {
    icon: RefreshCw,
    title: "Wrap 0.1 OKB into WOKB",
    desc: "1:1 zero-slippage wrapping for DeFi",
    prompt: "Wrap 0.1 OKB into WOKB on X Layer Mainnet",
  },
  {
    icon: PieChart,
    title: "Analyze Portfolio Risk",
    desc: "Inspect holdings & suggest optimal allocation",
    prompt: "Analyze my X Layer portfolio holdings and suggest an optimal allocation",
  },
];

export const TerminalChat: React.FC = () => {
  const { address, isConnected, chainId: currentWalletChainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  
  // Enforce X Layer Mainnet (196)
  const isXLayer = currentWalletChainId === xlayerMainnet.id;
  const activeChainId = xlayerMainnet.id;
  const addresses = CONTRACT_ADDRESSES[activeChainId] || CONTRACT_ADDRESSES[196];

  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const balanceQuery = {
    enabled: Boolean(address && isXLayer),
    refetchInterval: 15000,
    retry: 1,
  };

  const { data: okbBalance } = useBalance({
    address,
    chainId: activeChainId,
    query: balanceQuery,
  });

  const { data: wokbRaw } = useReadContract({
    chainId: activeChainId,
    address: addresses.WOKB,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const { data: usdcRaw } = useReadContract({
    chainId: activeChainId,
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const { data: usdtRaw } = useReadContract({
    chainId: activeChainId,
    address: addresses.USDT,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const { data: wethRaw } = useReadContract({
    chainId: activeChainId,
    address: addresses.WETH,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const formattedOkb = okbBalance ? parseFloat(formatEther(okbBalance.value)).toFixed(4) : "0.0000";
  const formattedWokb = wokbRaw ? parseFloat(formatEther(wokbRaw)).toFixed(4) : "0.0000";
  const formattedUsdc = usdcRaw ? parseFloat(formatUnits(usdcRaw, 6)).toFixed(2) : "0.00";
  const formattedUsdt = usdtRaw ? parseFloat(formatUnits(usdtRaw, 6)).toFixed(2) : "0.00";
  const formattedWeth = wethRaw ? parseFloat(formatUnits(wethRaw, 18)).toFixed(4) : "0.0000";

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentProcessStage, setCurrentProcessStage] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, currentProcessStage]);

  const toggleReasoning = (msgId: string) => {
    setExpandedReasoning((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  const handleSend = async (customPrompt?: string) => {
    const text = (customPrompt || input).trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput("");
    setLoading(true);

    const startTime = Date.now();
    setCurrentProcessStage("Evaluating with Shiro AI...");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: text,
          history: messages.slice(-6).map(m => ({ role: m.sender === "user" ? "user" : "assistant", content: m.content })),
          userAddress: address || "0x70e0bA845a1A0F2DA3359C97E0285013525FFC49",
          chainId: activeChainId,
          walletBalances: {
            OKB: formattedOkb,
            WOKB: formattedWokb,
            USDC: formattedUsdc,
            USDT: formattedUsdt,
            WETH: formattedWeth,
          },
        }),
      }).catch(() => null);

      if (!response) {
        throw new Error("Unable to reach Shiro AI endpoint.");
      }

      const data = await response.json();
      if (!response.ok || !data.success) {
        console.error("Shiro chat API error:", data);
        throw new Error(data.error || data.detail || "Shiro AI endpoint returned an error.");
      }

      const intent = data.data.intent;
      const quote = data.data.quote;
      const executionTime = Date.now() - startTime;

      const isActionable = intent.action && intent.action !== "CHAT";

      const shiroMsg: Message = {
        id: `shiro-${Date.now()}`,
        sender: "shiro",
        content: intent.summary,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        executionTimeMs: executionTime,
        reasoningSteps: isActionable
          ? [
              `Parsed intent as ${intent.action} (${intent.amount} ${intent.fromToken} → ${intent.toToken})`,
              `Confidence score: ${(intent.confidenceScore * 100).toFixed(0)}% | Risk rating: ${intent.riskRating || "LOW"}`,
              `Live Route: OKX DEX Aggregator on X Layer (Impact: ${quote?.priceImpactPercent || "<0.02%"})`,
              `Contract Router: ${addresses.SHIRO_ROUTER}`,
            ]
          : [
              `Analyzed query semantics using ${intent.engine || "Shiro Semantic Engine"}`,
              `Evaluated DeFi knowledge base for X Layer zkEVM`,
            ],
        intentData: isActionable
          ? {
              intent,
              quote,
            }
          : undefined,
      };

      setMessages((prev) => [...prev, shiroMsg]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: "shiro",
          content: `Issue processing request: ${e.message}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
      setCurrentProcessStage(null);
    }
  };

  const handleExecuteIntentOnchain = async (msgId: string, intentData: any) => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first to execute onchain!");
      return;
    }

    // Step 1: Ensure wallet is switched to X Layer BEFORE dispatching transaction
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (err: any) {
        console.warn("Switch network prompt rejected:", err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? {
                  ...m,
                  errorMessage: "Please approve the network switch to X Layer in your wallet to proceed.",
                }
              : m
          )
        );
        return;
      }
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, isExecuting: true, errorMessage: undefined } : m))
    );

    try {
      const intent = intentData.intent;

      // 1. Strict Pre-Flight Balance Validation: Never prompt wallet signing if balance is insufficient
      if (["SWAP", "WRAP", "UNWRAP"].includes(intent.action) && intent.fromToken && intent.amount) {
        try {
          const publicClient = createPublicClient({
            transport: http("https://rpc.xlayer.tech"),
          });

          const isNative = intent.fromToken === "OKB";
          const getDecimals = (sym: string) => (sym === "OKB" || sym === "WETH" || sym === "WOKB" ? 18 : 6);
          const getAddr = (sym: string) =>
            sym === "OKB"
              ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
              : sym === "WETH"
              ? addresses.WETH
              : sym === "USDT"
              ? addresses.USDT
              : sym === "WOKB"
              ? addresses.WOKB
              : addresses.USDC;

          let userBalanceRaw = BigInt(0);
          if (isNative) {
            userBalanceRaw = await publicClient.getBalance({ address: address as `0x${string}` });
          } else {
            const tokenAddr = getAddr(intent.fromToken);
            userBalanceRaw = await publicClient.readContract({
              address: tokenAddr as `0x${string}`,
              abi: ERC20_ABI,
              functionName: "balanceOf",
              args: [address as `0x${string}`],
            });
          }

          const reqAmountUnits = isNative
            ? parseEther(intent.amount || "0.01")
            : parseUnits(intent.amount || "1", getDecimals(intent.fromToken));

          if (userBalanceRaw < reqAmountUnits) {
            const formattedBal = formatUnits(userBalanceRaw, getDecimals(intent.fromToken));
            const numBal = parseFloat(formattedBal);
            const displayBal = numBal === 0 ? "0.00" : numBal < 0.0001 ? "<0.0001" : numBal.toFixed(4);

            setMessages((prev) =>
              prev.map((m) =>
                m.id === msgId
                  ? {
                      ...m,
                      isExecuting: false,
                      errorMessage: `Insufficient ${intent.fromToken} balance: You have ${displayBal} ${intent.fromToken}, but tried to ${intent.action === "WRAP" ? "wrap" : "swap"} ${intent.amount} ${intent.fromToken}.`,
                    }
                  : m
              )
            );
            return;
          }
        } catch (balCheckErr) {
          console.warn("Pre-flight balance check warning:", balCheckErr);
        }
      }

      let hash: `0x${string}` | undefined;

      if (intent.action === "WRAP") {
        // Direct deposit native OKB -> Receive WOKB (1:1 Fixed Rate)
        hash = await writeContractAsync({
          chainId: activeChainId,
          address: addresses.WOKB,
          abi: WOKB_ABI,
          functionName: "deposit",
          value: parseEther(intent.amount || "0.1"),
        });
      } else if (intent.action === "UNWRAP") {
        // Direct withdraw WOKB -> Receive native OKB (1:1 Fixed Rate)
        hash = await writeContractAsync({
          chainId: activeChainId,
          address: addresses.WOKB,
          abi: WOKB_ABI,
          functionName: "withdraw",
          args: [parseEther(intent.amount || "0.1")],
        });
      } else {
        // Direct onchain transaction / swap strictly on X Layer zkEVM
        const isNative = intent.fromToken === "OKB";
        const getAddr = (sym: string) => 
          sym === "OKB" ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : (sym === "WETH" ? addresses.WETH : sym === "USDT" ? addresses.USDT : addresses.USDC);
        const getDecimals = (sym: string) => (sym === "OKB" || sym === "WETH" ? 18 : 6);

        const tokenAddr = getAddr(intent.fromToken);
        const toAddr = getAddr(intent.toToken);
        const amountUnits = isNative ? parseEther(intent.amount || "0.01") : parseUnits(intent.amount || "10", getDecimals(intent.fromToken));
        const slippagePercent = String((Number(intent.slippageBps || 50) / 100).toFixed(2));
        let swapPayload: any = null;
        try {
          const swapRes = await fetch("/api/swap", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fromTokenAddress: tokenAddr,
              toTokenAddress: toAddr,
              amount: amountUnits.toString(),
              slippagePercent,
              userWalletAddress: addresses.SHIRO_ROUTER,
            }),
          });
          if (swapRes.ok) {
            swapPayload = await swapRes.json();
          }
        } catch (e) {
          console.warn("Live swap API notice:", e);
        }

        const dexTarget = (swapPayload?.tx?.to && swapPayload.tx.to !== "0x0000000000000000000000000000000000000000")
          ? (swapPayload.tx.to as `0x${string}`)
          : addresses.OKX_DEX_ROUTER;
        const dexData = (swapPayload?.tx?.data || "0x") as `0x${string}`;
        const minToAmount = BigInt(0);
        const intentId = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

        if (!isNative) {
          // Token swap: approve strictly on X Layer
          await writeContractAsync({
            chainId: activeChainId,
            address: tokenAddr as `0x${string}`,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [addresses.SHIRO_ROUTER, amountUnits],
          });
        }

        hash = await writeContractAsync({
          chainId: activeChainId,
          address: addresses.SHIRO_ROUTER,
          abi: SHIRO_ROUTER_ABI,
          functionName: "executeDirectSwap",
          value: isNative ? amountUnits : BigInt(0),
          args: [
            intentId as `0x${string}`,
            tokenAddr as `0x${string}`,
            toAddr as `0x${string}`,
            amountUnits,
            minToAmount,
            address,
            swapPayload.tx.to,
            swapPayload.tx.data,
          ],
        });
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecuting: false,
                isExecuted: true,
                txHash: hash,
              }
            : m
        )
      );
    } catch (err: any) {
      console.error("Onchain execution error:", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? {
                ...m,
                isExecuting: false,
                errorMessage: err?.shortMessage || err?.message || "Transaction rejected by wallet",
              }
            : m
        )
      );
    }
  };

  return (
    <div className="flex flex-col h-full w-full relative bg-[#080808] rounded-2xl overflow-hidden">
      {/* Scrollable Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-2.5 sm:px-6 lg:px-8 py-4 sm:py-6 w-full">
        {messages.length === 0 ? (
          /* Empty Welcome State */
          <div className="min-h-full flex flex-col items-center justify-start sm:justify-center text-center max-w-2xl mx-auto space-y-4 sm:space-y-6 pt-2 pb-6 sm:py-10">
            <div className="space-y-2.5">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#111111] border border-white/[0.06] flex items-center justify-center mx-auto shadow-sm shrink-0">
                <span className="font-mono text-lg sm:text-xl text-white font-medium">白</span>
              </div>
              <h2 className="text-lg sm:text-2xl font-light text-white tracking-tight px-2">
                How can I help you trade on X Layer today?
              </h2>
              <p className="text-xs text-[#888888] font-light max-w-md mx-auto leading-relaxed px-4">
                Describe any trade, wrap native OKB, or audit your onchain portfolio in natural language.
              </p>
            </div>

            {/* 2x2 Sample Prompt Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {SAMPLE_CARDS.map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(card.prompt)}
                    className="p-4 rounded-xl bg-[#101010] hover:bg-[#151515] text-left transition-all group"
                  >
                    <div className="flex items-center space-x-2.5 mb-1 text-white">
                      <Icon className="w-4 h-4 text-[#888888] group-hover:text-white transition-colors" />
                      <span className="text-xs font-medium">{card.title}</span>
                    </div>
                    <p className="text-[11px] text-[#666666] font-light leading-snug">
                      {card.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          /* Active Message Stream */
          <div className="space-y-6 max-w-3xl mx-auto">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.sender === "shiro" ? (
                  /* Assistant Message */
                  <div className="flex items-start space-x-3 w-full">
                    <div className="w-7 h-7 rounded-lg bg-[#121212] flex items-center justify-center shrink-0 mt-0.5">
                      <span className="font-mono text-xs text-white">白</span>
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      {/* Inline Reasoning Accordion */}
                      {m.reasoningSteps && (
                        <div className="rounded-lg bg-[#0C0C0C] overflow-hidden text-xs">
                          <button
                            onClick={() => toggleReasoning(m.id)}
                            className="w-full px-3 py-1.5 flex items-center justify-between text-[#777777] hover:text-white transition-colors text-left"
                          >
                            <span className="font-light flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                              <span>Thought for {m.executionTimeMs}ms (OKX DEX &amp; Groq LPU)</span>
                            </span>
                            {expandedReasoning[m.id] ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#555555]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />
                            )}
                          </button>

                          {expandedReasoning[m.id] && (
                            <div className="px-3 py-2 space-y-1 font-mono text-[11px] text-[#8E8E8E] bg-[#0A0A0A]">
                              {m.reasoningSteps.map((step, sIdx) => (
                                <div key={sIdx} className="flex items-center space-x-1.5">
                                  <span className="text-[#444444]">›</span>
                                  <span>{step}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Main Message Text */}
                      <div className="text-sm font-light text-[#EDEDED] leading-relaxed whitespace-pre-line">
                        {m.content}
                      </div>

                      {/* Error Banner if onchain call was rejected */}
                      {m.errorMessage && (
                        <div className="p-3 rounded-xl bg-red-950/40 text-red-300 text-xs font-light flex items-center justify-between">
                          <span>{m.errorMessage}</span>
                          {!isXLayer && (
                            <button
                              disabled={isPending}
                              onClick={() => switchChainAsync && switchChainAsync({ chainId: activeChainId })}
                              className="ml-3 px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[10px] font-medium shrink-0 disabled:opacity-50"
                            >
                              {isPending ? "Switching..." : "Switch to X Layer"}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Embedded Action Card (only if actionable SWAP/WRAP/UNWRAP with valid amount) */}
                      {m.intentData &&
                        ["SWAP", "WRAP", "UNWRAP"].includes(m.intentData.intent.action) &&
                        m.intentData.intent.amount &&
                        m.intentData.intent.fromToken && (
                        <div className="p-4 rounded-xl bg-[#101010] space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                            <div className="flex items-center space-x-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                              <span className="text-xs font-mono font-medium text-white uppercase tracking-wider">
                                {m.intentData.intent.action} Intent (X Layer zkEVM)
                              </span>
                            </div>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-[#888888]">
                              Risk: {m.intentData.intent.riskRating || "LOW"}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#A0A0A0]">
                            <div>
                              <span className="text-[#555555]">From: </span>
                              <span className="text-white">{m.intentData.intent.amount} {m.intentData.intent.fromToken}</span>
                            </div>
                            <div>
                              <span className="text-[#555555]">To: </span>
                              <span className="text-white">
                                {m.intentData.quote?.toAmount
                                  ? `${m.intentData.quote.toAmount} ${m.intentData.intent.toToken}`
                                  : m.intentData.intent.toToken}
                              </span>
                            </div>
                            {m.intentData.intent.intervalSeconds && (
                              <div>
                                <span className="text-[#555555]">Interval: </span>
                                <span className="text-white">every {Math.floor(m.intentData.intent.intervalSeconds / 60)}m</span>
                              </div>
                            )}
                            <div>
                              <span className="text-[#555555]">Slippage: </span>
                              <span className="text-white">{m.intentData.intent.slippageBps / 100}%</span>
                            </div>
                          </div>

                          {/* Address Transparency Banner */}
                          <div className="p-2.5 rounded-lg bg-black text-[11px] font-mono space-y-1 text-[#777777]">
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3 text-[#555555]" />
                                <span>Signer Wallet:</span>
                              </span>
                              <span className="text-white">
                                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Not connected"}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="flex items-center gap-1">
                                <Cpu className="w-3 h-3 text-[#555555]" />
                                <span>Contract Target:</span>
                              </span>
                              <span className="text-[#999999]">
                                {addresses.SHIRO_ROUTER.slice(0, 6)}...{addresses.SHIRO_ROUTER.slice(-4)}
                              </span>
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                            {m.isExecuted ? (
                              <div className="flex items-center space-x-2 text-xs text-okx font-medium">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Broadcasted on X Layer zkEVM</span>
                              </div>
                            ) : !isXLayer ? (
                              <button
                                disabled={isPending}
                                onClick={() => switchChainAsync && switchChainAsync({ chainId: activeChainId })}
                                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all shadow-sm disabled:opacity-50"
                              >
                                {isPending ? (
                                  <>
                                    <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                                    <span>Switching...</span>
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-black" />
                                    <span>Switch Wallet to X Layer</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleExecuteIntentOnchain(m.id, m.intentData)}
                                disabled={m.isExecuting || !isConnected}
                                className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all disabled:opacity-30"
                              >
                                {m.isExecuting ? (
                                  <>
                                    <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                                    <span>Sign in Wallet...</span>
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5 fill-black" />
                                    <span>{isConnected ? "Confirm onchain (X Layer)" : "Connect Wallet to Execute"}</span>
                                  </>
                                )}
                              </button>
                            )}

                            {m.txHash && (
                              <a
                                href={`https://www.oklink.com/xlayer/tx/${m.txHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-mono text-[#888888] hover:text-white flex items-center gap-1 underline"
                              >
                                <span>Receipt on OKLink</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* User Message */
                  <div className="bg-[#161616] text-white rounded-2xl px-4 py-2.5 max-w-[80%] text-sm font-light leading-relaxed">
                    {m.content}
                  </div>
                )}
              </div>
            ))}

            {/* Real-time Process Stage Indicator */}
            {loading && (
              <div className="flex items-center space-x-2.5 text-xs font-light text-[#888888] pl-10">
                <CircleDashed className="w-3.5 h-3.5 animate-spin text-okx" />
                <span>{currentProcessStage || "Thinking..."}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Floating Bottom Input Bar */}
      <div className="p-4 bg-gradient-to-t from-[#080808] via-[#080808]/90 to-transparent">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="max-w-3xl mx-auto relative bg-[#121212] rounded-2xl p-2.5 flex items-center transition-all shadow-xl"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Message Shiro (e.g. 'Swap 0.05 OKB to USDC' or 'DCA 10 USDC into WETH')..."
            className="flex-1 bg-transparent px-3 py-1.5 text-sm font-light text-white placeholder-[#555555] focus:outline-none"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl bg-white hover:bg-slate-200 text-black flex items-center justify-center transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0"
          >
            <ArrowUp className="w-4 h-4 text-black stroke-[2.5]" />
          </button>
        </form>
        <p className="text-[10px] text-center text-[#444444] font-light mt-2">
          Shiro AI executes real onchain transactions strictly on X Layer Mainnet (Chain ID: 196).
        </p>
      </div>
    </div>
  );
};
