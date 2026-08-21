"use client";

import React, { useState } from "react";
import { useAccount, useWriteContract, useReadContract, useSwitchChain } from "wagmi";
import { Repeat, Clock, Play, Plus, CheckCircle2, CircleDashed, ExternalLink, AlertTriangle } from "lucide-react";
import { parseUnits, formatUnits } from "viem";
import { CONTRACT_ADDRESSES, SHIRO_DCA_ABI, xlayerMainnet } from "@/config/xlayer";

interface DCAOrder {
  id: number;
  fromToken: string;
  toToken: string;
  amountPerCycle: string;
  executedCycles: number;
  totalCycles: number;
  intervalFormatted: string;
  nextRunInSeconds: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export const DCATab: React.FC = () => {
  const { address, isConnected, chainId: currentWalletChainId } = useAccount();
  const { switchChainAsync, isPending: isSwitchPending } = useSwitchChain();
  
  // Enforce X Layer Mainnet (196)
  const isXLayer = currentWalletChainId === xlayerMainnet.id;
  const activeChainId = xlayerMainnet.id;
  const addresses = CONTRACT_ADDRESSES[activeChainId] || CONTRACT_ADDRESSES[196];

  const { writeContractAsync, isPending } = useWriteContract();

  // Read real onchain order count for connected user strictly on X Layer
  const { data: userOrderCount, refetch: refetchOrderCount } = useReadContract({
    chainId: activeChainId,
    address: addresses.SHIRO_DCA,
    abi: SHIRO_DCA_ABI,
    functionName: "getUserOrderCount",
    args: address ? [address] : undefined,
  });

  const [orders, setOrders] = useState<DCAOrder[]>([]);

  // Form State for creating a new DCA
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("WETH");
  const [amountPerCycle, setAmountPerCycle] = useState("10");
  const [interval, setInterval] = useState("Daily");
  const [totalCycles, setTotalCycles] = useState("5");
  const [isCreating, setIsCreating] = useState(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleCreateDCAOnchain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) return;

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

    setIsCreating(true);
    setErrorMessage(null);

    try {
      const getAddr = (sym: string) =>
        sym === "OKB" ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : sym === "WETH" ? addresses.WETH : sym === "USDT" ? addresses.USDT : addresses.USDC;
      const getDecimals = (sym: string) => (sym === "OKB" || sym === "WETH" ? 18 : 6);
      const fromAddr = getAddr(fromToken);
      const toAddr = getAddr(toToken);
      const amountUnits = parseUnits(amountPerCycle, getDecimals(fromToken));
      const intervalSec = BigInt(interval === "Hourly" ? 3600 : interval === "Daily" ? 86400 : 604800);
      const cycles = BigInt(totalCycles);
      const slippageBps = BigInt(50);

      const hash = await writeContractAsync({
        chainId: activeChainId,
        address: addresses.SHIRO_DCA,
        abi: SHIRO_DCA_ABI,
        functionName: "createDCAOrder",
        args: [fromAddr, toAddr, amountUnits, cycles, intervalSec, slippageBps, false],
      });

      setLastTxHash(hash);

      const newOrder: DCAOrder = {
        id: orders.length,
        fromToken,
        toToken,
        amountPerCycle,
        executedCycles: 0,
        totalCycles: parseInt(totalCycles) || 5,
        intervalFormatted: interval,
        nextRunInSeconds: interval === "Hourly" ? 3600 : interval === "Daily" ? 86400 : 604800,
        status: "ACTIVE",
      };

      setOrders((prev) => [newOrder, ...prev]);
      refetchOrderCount();
    } catch (err: any) {
      console.error("DCA creation error:", err);
      setErrorMessage(err?.shortMessage || err?.message || "DCA creation rejected by wallet");
    } finally {
      setIsCreating(false);
    }
  };

  const handleManualTriggerOnchain = async (orderId: number) => {
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (e) {
        return;
      }
    }

    setTriggeringId(orderId);
    setErrorMessage(null);
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) {
        throw new Error("Order not found in local state. Refresh and try again.");
      }
      const getAddr = (sym: string) =>
        sym === "OKB" ? "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" : sym === "WETH" ? addresses.WETH : sym === "USDT" ? addresses.USDT : addresses.USDC;
      const getDecimals = (sym: string) => (sym === "OKB" || sym === "WETH" ? 18 : 6);
      const amountUnits = parseUnits(order.amountPerCycle, getDecimals(order.fromToken));
      const swapRes = await fetch("/api/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromTokenAddress: getAddr(order.fromToken),
          toTokenAddress: getAddr(order.toToken),
          amount: amountUnits.toString(),
          slippagePercent: "0.5",
          userWalletAddress: addresses.SHIRO_ROUTER,
        }),
      });
      const swapPayload = await swapRes.json();
      if (!swapRes.ok || !swapPayload.success) {
        throw new Error(swapPayload.error || "Unable to fetch live OKX swap calldata");
      }
      const expectedOut = BigInt(swapPayload.routerResult?.toTokenAmount || 0);
      const minToAmount = expectedOut > BigInt(0) ? (expectedOut * BigInt(9950)) / BigInt(10000) : BigInt(1);

      const hash = await writeContractAsync({
        chainId: activeChainId,
        address: addresses.SHIRO_DCA,
        abi: SHIRO_DCA_ABI,
        functionName: "executeDCACycle",
        args: [BigInt(orderId), minToAmount, swapPayload.tx.to, swapPayload.tx.data],
      });

      setLastTxHash(hash);
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                executedCycles: Math.min(o.executedCycles + 1, o.totalCycles),
                status: o.executedCycles + 1 >= o.totalCycles ? "COMPLETED" : "ACTIVE",
              }
            : o
        )
      );
    } catch (err: any) {
      console.error("Trigger DCA cycle error:", err);
      setErrorMessage(err?.shortMessage || err?.message || "Trigger cycle rejected or failed");
    } finally {
      setTriggeringId(null);
    }
  };

  const handleCancelOnchain = async (orderId: number) => {
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (e) {
        return;
      }
    }

    try {
      const hash = await writeContractAsync({
        chainId: activeChainId,
        address: addresses.SHIRO_DCA,
        abi: SHIRO_DCA_ABI,
        functionName: "cancelDCAOrder",
        args: [BigInt(orderId)],
      });

      setLastTxHash(hash);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o))
      );
    } catch (err: any) {
      console.error("Cancel DCA order error:", err);
      setErrorMessage(err?.shortMessage || err?.message || "Cancel rejected");
    }
  };

  return (
    <div className="w-full h-full py-4 space-y-6 px-2 sm:px-6">
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 text-xs font-light">
          {errorMessage}
        </div>
      )}

      {lastTxHash && (
        <div className="p-3 rounded-xl bg-[#101010] text-xs font-mono flex items-center justify-between text-[#8E8E8E]">
          <span className="flex items-center gap-1.5 text-okx">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>DCA Transaction Broadcasted on X Layer zkEVM</span>
          </span>
          <a
            href={`https://web3.okx.com/explorer/x-layer-testnet/tx/${lastTxHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:underline flex items-center gap-1"
          >
            <span>Receipt on OKLink</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Create DCA Schedule (5 cols) */}
        <div className="lg:col-span-5 bg-[#101010] rounded-2xl p-6 shadow-xl space-y-5 h-fit">
          <div>
            <h2 className="text-sm font-medium text-white tracking-wide">Create DCA Schedule</h2>
            <p className="text-xs text-shiro-muted font-light">Automate recurring onchain purchases strictly on X Layer</p>
          </div>

          <form onSubmit={handleCreateDCAOnchain} className="space-y-4">
            {/* From Token & Amount */}
            <div className="space-y-1.5">
              <label className="text-xs font-light text-shiro-muted">Spend per cycle</label>
              <div className="flex items-center gap-2 bg-black rounded-xl p-2.5">
                <input
                  type="number"
                  value={amountPerCycle}
                  onChange={(e) => setAmountPerCycle(e.target.value)}
                  placeholder="0.0"
                  className="bg-transparent text-sm font-mono text-white font-medium focus:outline-none w-full"
                />
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="bg-[#161616] rounded-lg px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                >
                  <option value="USDC">USDC</option>
                  <option value="USDT">USDT</option>
                  <option value="OKB">OKB</option>
                </select>
              </div>
            </div>

            {/* Target Asset */}
            <div className="space-y-1.5">
              <label className="text-xs font-light text-shiro-muted">Target Asset to Buy</label>
              <select
                value={toToken}
                onChange={(e) => setToToken(e.target.value)}
                className="w-full bg-black rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
              >
                <option value="WETH">WETH (Wrapped Ether)</option>
                <option value="OKB">OKB (Native Token)</option>
                <option value="USDC">USDC (USD Coin)</option>
              </select>
            </div>

            {/* Frequency Interval */}
            <div className="space-y-1.5">
              <label className="text-xs font-light text-shiro-muted">Frequency</label>
              <div className="grid grid-cols-3 gap-2">
                {["Hourly", "Daily", "Weekly"].map((freq) => (
                  <button
                    type="button"
                    key={freq}
                    onClick={() => setInterval(freq)}
                    className={`py-2 rounded-lg text-xs font-light transition-all ${
                      interval === freq
                        ? "bg-white text-black font-medium"
                        : "bg-black text-shiro-muted hover:text-white"
                    }`}
                  >
                    {freq}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Cycles */}
            <div className="space-y-1.5">
              <label className="text-xs font-light text-shiro-muted">Total Cycles</label>
              <input
                type="number"
                value={totalCycles}
                onChange={(e) => setTotalCycles(e.target.value)}
                placeholder="5"
                className="w-full bg-black rounded-xl p-2.5 text-xs font-mono text-white focus:outline-none"
              />
            </div>

            {/* Summary Note */}
            <div className="p-3 rounded-xl bg-black text-[11px] font-mono text-shiro-muted space-y-1">
              <div className="flex justify-between">
                <span>Total Capital:</span>
                <span className="text-white">{(parseFloat(amountPerCycle || "0") * parseInt(totalCycles || "0")).toFixed(2)} {fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span>Contract Target:</span>
                <span>{addresses.SHIRO_DCA.slice(0, 6)}...{addresses.SHIRO_DCA.slice(-4)}</span>
              </div>
            </div>

            {!isXLayer ? (
              <button
                type="button"
                disabled={isSwitchPending}
                onClick={() => switchChainAsync && switchChainAsync({ chainId: activeChainId })}
                className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {isSwitchPending ? (
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
                type="submit"
                disabled={!isConnected || isCreating}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all disabled:opacity-25 flex items-center justify-center gap-2"
              >
                {isCreating ? (
                  <>
                    <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming in Wallet...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create onchain DCA Schedule (X Layer)</span>
                  </>
                )}
              </button>
            )}
          </form>
        </div>

        {/* Right Column: Active & Completed Schedules (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2">
            <h3 className="text-sm font-medium text-white">Active &amp; Past Schedules</h3>
            <span className="text-xs font-light text-shiro-muted font-mono">
              {userOrderCount !== undefined ? `${userOrderCount} onchain orders` : `${orders.length} orders`}
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#101010] text-center text-xs font-light text-shiro-muted space-y-2">
              <Repeat className="w-6 h-6 mx-auto text-shiro-subtle" />
              <p>No active DCA schedules yet.</p>
              <p className="text-[11px] text-shiro-subtle">Create your first automated recurring order on X Layer using the form on the left.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const progressPercent = Math.round((order.executedCycles / order.totalCycles) * 100);

                return (
                  <div
                    key={order.id}
                    className="bg-[#101010] rounded-2xl p-4 space-y-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-medium text-white">
                          {order.amountPerCycle} {order.fromToken} → {order.toToken}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-shiro-muted">
                          {order.intervalFormatted}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          order.status === "ACTIVE"
                            ? "bg-black text-okx"
                            : "bg-black text-shiro-subtle"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[11px] font-mono text-shiro-muted mb-1">
                        <span>
                          Cycle {order.executedCycles} of {order.totalCycles}
                        </span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-black rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-500"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Controls */}
                    {order.status === "ACTIVE" && (
                      <div className="pt-1 flex items-center justify-between text-xs font-mono">
                        <span className="text-[11px] text-shiro-subtle flex items-center gap-1">
                          <Clock className="w-3 h-3 text-shiro-muted" /> Next run in ~{Math.floor(order.nextRunInSeconds / 60)}m
                        </span>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleManualTriggerOnchain(order.id)}
                            disabled={triggeringId === order.id}
                            className="px-2.5 py-1 rounded-lg bg-black hover:bg-[#161616] text-white text-[10px] flex items-center gap-1 transition-all"
                          >
                            <Play className="w-2.5 h-2.5 fill-white" />
                            <span>{triggeringId === order.id ? "Signing..." : "Trigger onchain"}</span>
                          </button>
                          <button
                            onClick={() => handleCancelOnchain(order.id)}
                            className="px-2.5 py-1 rounded-lg bg-black hover:bg-[#161616] text-shiro-muted hover:text-white text-[10px] transition-all"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
