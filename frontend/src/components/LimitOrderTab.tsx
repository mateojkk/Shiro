"use client";

import React, { useState } from "react";
import { useAccount, useWriteContract, useSwitchChain, useBalance } from "wagmi";
import { Clock, CheckCircle2, AlertTriangle, ArrowDown, TrendingUp, ShieldCheck, Zap } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { CONTRACT_ADDRESSES, ERC20_ABI, xlayerMainnet } from "@/config/xlayer";

const TOKENS = [
  { symbol: "OKB", name: "OKB Native", decimals: 18, isNative: true, priceUsd: 48.5 },
  { symbol: "USDC", name: "USD Coin", decimals: 6, isNative: false, priceUsd: 1.0 },
  { symbol: "WETH", name: "Wrapped Ether", decimals: 18, isNative: false, priceUsd: 2650.0 },
  { symbol: "USDT", name: "Tether USD", decimals: 6, isNative: false, priceUsd: 1.0 },
];

interface LimitOrder {
  id: string;
  fromToken: string;
  toToken: string;
  amount: string;
  targetPrice: string;
  currentPrice: string;
  condition: "ABOVE" | "BELOW";
  status: "ACTIVE" | "FILLED" | "CANCELLED";
  timestamp: string;
}

export const LimitOrderTab: React.FC = () => {
  const { address, isConnected, chainId: currentWalletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const isMainnet = currentWalletChainId === xlayerMainnet.id;
  const addresses = CONTRACT_ADDRESSES[196];

  const [fromToken, setFromToken] = useState(TOKENS[1]); // USDC
  const [toToken, setToToken] = useState(TOKENS[2]); // WETH
  const [amount, setAmount] = useState("100");
  const [targetPrice, setTargetPrice] = useState("2500");
  const [condition, setCondition] = useState<"BELOW" | "ABOVE">("BELOW");
  const [isPlacing, setIsPlacing] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<LimitOrder[]>([
    {
      id: "ord-1",
      fromToken: "USDC",
      toToken: "WETH",
      amount: "250.00",
      targetPrice: "2500.00",
      currentPrice: "2650.00",
      condition: "BELOW",
      status: "ACTIVE",
      timestamp: "Today, 08:30 AM",
    },
    {
      id: "ord-2",
      fromToken: "OKB",
      toToken: "USDC",
      amount: "10.00",
      targetPrice: "55.00",
      currentPrice: "48.50",
      condition: "ABOVE",
      status: "ACTIVE",
      timestamp: "Today, 07:15 AM",
    },
  ]);

  const { writeContractAsync } = useWriteContract();

  const handlePlaceOrder = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isMainnet) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: xlayerMainnet.id });
        }
      } catch (err) {
        alert("Please switch your wallet to X Layer Mainnet (196).");
        return;
      }
    }

    setIsPlacing(true);
    setSuccessMsg(null);

    try {
      if (!fromToken.isNative) {
        const tokenAddr = fromToken.symbol === "WETH" ? addresses.WETH : fromToken.symbol === "USDT" ? addresses.USDT : addresses.USDC;
        const amountUnits = parseUnits(amount || "10", fromToken.decimals);
        // Approve token allowance on Mainnet
        await writeContractAsync({
          chainId: xlayerMainnet.id,
          address: tokenAddr as `0x${string}`,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [addresses.OKX_DEX_ROUTER, amountUnits],
        });
      }

      const newOrder: LimitOrder = {
        id: `ord-${Date.now()}`,
        fromToken: fromToken.symbol,
        toToken: toToken.symbol,
        amount,
        targetPrice,
        currentPrice: String(toToken.priceUsd),
        condition,
        status: "ACTIVE",
        timestamp: "Just now",
      };

      setOrders([newOrder, ...orders]);
      setSuccessMsg(`Limit order created: Buy ${toToken.symbol} when price is ${condition.toLowerCase()} $${targetPrice}`);
    } catch (err: any) {
      console.error("Limit order error:", err);
      alert(err.message || "Failed to place limit order.");
    } finally {
      setIsPlacing(false);
    }
  };

  const handleCancelOrder = (id: string) => {
    setOrders(orders.map((o) => (o.id === id ? { ...o, status: "CANCELLED" } : o)));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pt-2">
      {/* Header Banner */}
      <div className="bg-[#111111] border border-white/[0.04] rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-medium text-white tracking-tight">OKX DEX Limit Orders</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-okx/10 text-okx border border-okx/20">
              Non-Custodial
            </span>
          </div>
          <p className="text-xs text-[#888888] font-light mt-1">
            Execute conditional buy and sell orders on X Layer Mainnet with zero upfront gas costs until triggered.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs text-[#666666] font-mono">
          <ShieldCheck className="w-4 h-4 text-okx" />
          <span>Protocol: OKX DEX Engine</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Place Limit Order Form */}
        <div className="lg:col-span-5 bg-[#111111] border border-white/[0.04] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <span className="text-xs font-medium text-white">Create Limit Order</span>
            <div className="flex items-center space-x-1 bg-[#161616] p-0.5 rounded-lg text-[11px] font-mono">
              <button
                onClick={() => setCondition("BELOW")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  condition === "BELOW" ? "bg-[#222222] text-white font-medium" : "text-[#666666]"
                }`}
              >
                Buy Dip (≤)
              </button>
              <button
                onClick={() => setCondition("ABOVE")}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  condition === "ABOVE" ? "bg-[#222222] text-white font-medium" : "text-[#666666]"
                }`}
              >
                Take Profit (≥)
              </button>
            </div>
          </div>

          {/* Pay Input */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-[#666666] uppercase">You Pay</label>
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-lg font-mono font-medium text-white focus:outline-none w-1/2"
              />
              <select
                value={fromToken.symbol}
                onChange={(e) => setFromToken(TOKENS.find((t) => t.symbol === e.target.value) || TOKENS[1])}
                className="bg-[#222222] text-white text-xs font-mono px-3 py-1.5 rounded-lg focus:outline-none border border-white/[0.06]"
              >
                {TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Price */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-mono text-[#666666] uppercase">Target Trigger Price (USD)</label>
              <span className="text-[10px] text-[#666666] font-mono">
                Current: ${toToken.priceUsd}
              </span>
            </div>
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-mono text-[#666666]">$</span>
              <input
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="0.00"
                className="bg-transparent text-lg font-mono font-medium text-white focus:outline-none w-full ml-2"
              />
            </div>
          </div>

          {/* Receive Asset */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-[#666666] uppercase">Receive Asset</label>
            <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs font-light text-[#888888]">
                Est. {((parseFloat(amount || "0") * fromToken.priceUsd) / parseFloat(targetPrice || "1")).toFixed(4)} {toToken.symbol}
              </span>
              <select
                value={toToken.symbol}
                onChange={(e) => setToToken(TOKENS.find((t) => t.symbol === e.target.value) || TOKENS[2])}
                className="bg-[#222222] text-white text-xs font-mono px-3 py-1.5 rounded-lg focus:outline-none border border-white/[0.06]"
              >
                {TOKENS.map((t) => (
                  <option key={t.symbol} value={t.symbol}>
                    {t.symbol}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {successMsg && (
            <div className="p-2.5 rounded-xl bg-okx/10 border border-okx/20 text-okx text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={isPlacing || !amount || !targetPrice}
            className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-xs font-mono transition-all disabled:opacity-30 flex items-center justify-center space-x-2 shadow-sm"
          >
            <Zap className="w-4 h-4" />
            <span>{isPlacing ? "Authorizing Order..." : "Create Limit Order"}</span>
          </button>
        </div>

        {/* Right: Active Limit Orders */}
        <div className="lg:col-span-7 bg-[#111111] border border-white/[0.04] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.04] pb-3">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-white" />
              <span className="text-xs font-medium text-white">Active Limit Orders</span>
            </div>
            <span className="text-[10px] font-mono text-[#666666]">{orders.filter(o => o.status === "ACTIVE").length} Active</span>
          </div>

          <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
            {orders.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#555555]">
                No active limit orders found.
              </div>
            ) : (
              orders.map((o) => (
                <div
                  key={o.id}
                  className="bg-[#161616] border border-white/[0.04] rounded-xl p-3.5 flex items-center justify-between text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-white font-mono">
                        {o.amount} {o.fromToken} → {o.toToken}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          o.status === "ACTIVE"
                            ? "bg-okx/10 text-okx border border-okx/20"
                            : o.status === "FILLED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {o.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-[#777777] font-mono">
                      Trigger: {o.condition === "BELOW" ? "≤" : "≥"} ${o.targetPrice} | Current: ${o.currentPrice}
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className="text-[10px] text-[#555555] font-mono">{o.timestamp}</span>
                    {o.status === "ACTIVE" && (
                      <button
                        onClick={() => handleCancelOrder(o.id)}
                        className="text-[10px] text-[#888888] hover:text-red-400 font-mono transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
