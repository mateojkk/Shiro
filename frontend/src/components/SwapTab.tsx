"use client";

import React, { useState } from "react";
import { useAccount, useBalance, useSendTransaction, useWriteContract, useSwitchChain } from "wagmi";
import { formatEther, parseEther, parseUnits, createPublicClient, http, formatUnits } from "viem";
import { ArrowDown, Zap, RefreshCw, CheckCircle2, CircleDashed, ExternalLink, AlertTriangle } from "lucide-react";
import { CONTRACT_ADDRESSES, ERC20_ABI, SHIRO_ROUTER_ABI, xlayerMainnet } from "@/config/xlayer";

const TOKENS = [
  { symbol: "OKB", name: "OKB Native Gas", decimals: 18, isNative: true, priceUsd: 48.5 },
  { symbol: "USDC", name: "USD Coin", decimals: 6, isNative: false, priceUsd: 1.0 },
  { symbol: "WETH", name: "Wrapped Ether", decimals: 18, isNative: false, priceUsd: 2650.0 },
  { symbol: "USDT", name: "Tether USD", decimals: 6, isNative: false, priceUsd: 1.0 },
];

export const SwapTab: React.FC = () => {
  const { address, isConnected, chainId: currentWalletChainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();
  
  // Enforce X Layer Mainnet (196)
  const isXLayer = currentWalletChainId === xlayerMainnet.id;
  const activeChainId = xlayerMainnet.id;
  const addresses = CONTRACT_ADDRESSES[activeChainId] || CONTRACT_ADDRESSES[196];

  const { data: okbBalance } = useBalance({ address, chainId: activeChainId });
  const { sendTransactionAsync } = useSendTransaction();
  const { writeContractAsync } = useWriteContract();

  const [fromToken, setFromToken] = useState(TOKENS[0]);
  const [toToken, setToToken] = useState(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("0.05");
  const [slippage, setSlippage] = useState("0.5");
  const [isSwapping, setIsSwapping] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Compute estimated output using token relative prices
  const parsedFrom = parseFloat(fromAmount) || 0;
  const rawTo = parsedFrom > 0 ? (parsedFrom * fromToken.priceUsd) / toToken.priceUsd : 0;
  const estimatedToAmount = rawTo > 0
    ? (rawTo < 0.01 ? rawTo.toFixed(6) : rawTo.toFixed(4))
    : "0.00";

  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
  };

  const handleExecuteSwap = async () => {
    if (!parsedFrom || !isConnected || !address) return;
    
    // Strict Network Lock: Switch BEFORE dispatching transaction
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (err) {
        setErrorMessage("Please approve the network switch to X Layer in your wallet to proceed.");
        return;
      }
    }

    setIsSwapping(true);
    setTxHash(null);
    setErrorMessage(null);

    // Strict Pre-Flight Balance Validation: Don't prompt wallet signing if balance is insufficient
    try {
      const publicClient = createPublicClient({
        transport: http("https://rpc.xlayer.tech"),
      });

      let userBalanceRaw = BigInt(0);
      if (fromToken.isNative) {
        userBalanceRaw = await publicClient.getBalance({ address: address as `0x${string}` });
      } else {
        const getAddr = (sym: string) => (sym === "WETH" ? addresses.WETH : sym === "USDT" ? addresses.USDT : addresses.USDC);
        const tokenAddr = getAddr(fromToken.symbol);
        userBalanceRaw = await publicClient.readContract({
          address: tokenAddr as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [address as `0x${string}`],
        });
      }

      const reqAmountUnits = parseUnits(fromAmount, fromToken.decimals);
      if (userBalanceRaw < reqAmountUnits) {
        const formattedBal = formatUnits(userBalanceRaw, fromToken.decimals);
        const numBal = parseFloat(formattedBal);
        const displayBal = numBal === 0 ? "0.00" : numBal < 0.0001 ? "<0.0001" : numBal.toFixed(4);
        setErrorMessage(`Insufficient ${fromToken.symbol} balance: You have ${displayBal} ${fromToken.symbol}, but tried to swap ${fromAmount} ${fromToken.symbol}.`);
        setIsSwapping(false);
        return;
      }
    } catch (balCheckErr) {
      console.warn("Swap pre-flight balance check warning:", balCheckErr);
    }

    try {
      let hash: `0x${string}` | undefined;

      const getAddr = (sym: string, isNat: boolean) => 
        isNat ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : (sym === "WETH" ? addresses.WETH : sym === "USDT" ? addresses.USDT : addresses.USDC);

      const tokenAddr = getAddr(fromToken.symbol, fromToken.isNative);
      const toAddr = getAddr(toToken.symbol, toToken.isNative);
      const amountUnits = parseUnits(fromAmount, fromToken.decimals);
      
      let swapPayload: any = null;
      try {
        const swapRes = await fetch("/api/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromTokenAddress: tokenAddr,
            toTokenAddress: toAddr,
            amount: amountUnits.toString(),
            slippagePercent: slippage,
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

      if (!fromToken.isNative) {
        // Approve ERC20 strictly on X Layer
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
        value: fromToken.isNative ? amountUnits : BigInt(0),
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

      setTxHash(hash);
    } catch (err: any) {
      console.error("Swap transaction error:", err);
      setErrorMessage(err?.shortMessage || err?.message || "Swap rejected or failed");
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-4 space-y-6">
      <div className="bg-[#101010] rounded-2xl p-6 shadow-xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
          <div>
            <h2 className="text-sm font-medium text-white tracking-wide">Instant Swap</h2>
            <p className="text-xs text-shiro-muted font-light">Real onchain execution strictly on X Layer zkEVM</p>
          </div>
          <div className="flex items-center space-x-1.5 text-xs text-shiro-muted font-light">
            <span>Slippage:</span>
            {["0.1", "0.5", "1.0"].map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                  slippage === s
                    ? "bg-white text-black font-medium"
                    : "bg-black text-shiro-muted hover:text-white"
                }`}
              >
                {s}%
              </button>
            ))}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 text-red-300 text-xs font-light">
            {errorMessage}
          </div>
        )}

        {/* From Token Box */}
        <div className="bg-black rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-light">You Pay</span>
            <span className="font-mono text-[11px]">
              Balance: {fromToken.symbol === "OKB" && okbBalance ? parseFloat(formatEther(okbBalance.value)).toFixed(4) : "0.00"} {fromToken.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              value={fromAmount}
              onChange={(e) => setFromAmount(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-2xl font-mono text-white font-medium focus:outline-none w-full"
            />

            <select
              value={fromToken.symbol}
              onChange={(e) => {
                const found = TOKENS.find((t) => t.symbol === e.target.value);
                if (found) setFromToken(found);
              }}
              className="bg-[#161616] hover:bg-[#202020] rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-white focus:outline-none cursor-pointer"
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-black text-white">
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] font-mono text-shiro-subtle">
            ≈ ${(parsedFrom * fromToken.priceUsd).toFixed(2)} USD
          </div>
        </div>

        {/* Switch Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleSwapTokens}
            className="w-8 h-8 rounded-full bg-[#161616] flex items-center justify-center text-shiro-muted hover:text-white transition-all shadow-md"
            title="Switch tokens"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* To Token Box */}
        <div className="bg-black rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-light">You Receive</span>
            <span className="font-mono text-[11px]">
              Rate: 1 {fromToken.symbol} ≈ {(fromToken.priceUsd / toToken.priceUsd).toFixed(4)} {toToken.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-mono text-white font-medium">
              {estimatedToAmount}
            </div>

            <select
              value={toToken.symbol}
              onChange={(e) => {
                const found = TOKENS.find((t) => t.symbol === e.target.value);
                if (found) setToToken(found);
              }}
              className="bg-[#161616] hover:bg-[#202020] rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-white focus:outline-none cursor-pointer"
            >
              {TOKENS.map((t) => (
                <option key={t.symbol} value={t.symbol} className="bg-black text-white">
                  {t.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="text-[11px] font-mono text-shiro-subtle">
            ≈ ${(parseFloat(estimatedToAmount) * toToken.priceUsd).toFixed(2)} USD
          </div>
        </div>

        {/* Routing Specs */}
        <div className="p-3.5 rounded-xl bg-black space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-shiro-muted">
            <span className="font-light">Aggregator Route</span>
            <span className="text-white">OKX DEX → X Layer zkEVM</span>
          </div>
          <div className="flex justify-between text-shiro-muted">
            <span className="font-light">Target Router</span>
            <span className="text-slate-300">{addresses.SHIRO_ROUTER.slice(0, 6)}...{addresses.SHIRO_ROUTER.slice(-4)}</span>
          </div>
        </div>

        {/* Swap Action Button */}
        {!isXLayer ? (
          <button
            disabled={isPending}
            onClick={() => switchChainAsync && switchChainAsync({ chainId: activeChainId })}
            className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isPending ? (
              <>
                <CircleDashed className="w-4 h-4 animate-spin" />
                <span>Switching Network...</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-black" />
                <span>Switch Wallet to X Layer</span>
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleExecuteSwap}
            disabled={!isConnected || !parsedFrom || isSwapping}
            className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSwapping ? (
              <>
                <CircleDashed className="w-4 h-4 animate-spin text-black" />
                <span>Confirm in Wallet...</span>
              </>
            ) : !isConnected ? (
              <span>Connect Wallet to Swap</span>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-black" />
                <span>Swap on X Layer ({fromToken.symbol} → {toToken.symbol})</span>
              </>
            )}
          </button>
        )}

        {/* Confirmation Toast */}
        {txHash && (
          <div className="p-3.5 rounded-xl bg-black flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-okx font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Swap Broadcasted on X Layer zkEVM</span>
            </div>
            <a
              href={`https://web3.okx.com/explorer/x-layer-testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white hover:underline font-mono text-[11px] flex items-center gap-1"
            >
              <span>OKLink Receipt</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
