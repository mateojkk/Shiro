"use client";

import React, { useState } from "react";
import { useAccount, useBalance, useChainId } from "wagmi";
import { formatEther } from "viem";
import { ShieldCheck, RefreshCw, Layers } from "lucide-react";

export const PortfolioCard: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { data: okbBalance, refetch: refetchOkb } = useBalance({ address });

  const [vaultBalance] = useState<string>("50.0");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchOkb();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  const formattedOkb = okbBalance ? parseFloat(formatEther(okbBalance.value)).toFixed(4) : "0.0000";

  return (
    <div className="bg-shiro-card border border-shiro-border rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-shiro-border">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-black border border-shiro-border text-okx">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-white">X Layer Assets</h3>
            <p className="text-[11px] text-shiro-muted font-mono">Chain ID: {chainId}</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          className={`p-1.5 rounded-lg bg-black border border-shiro-border text-shiro-muted hover:text-okx transition-all ${
            isRefreshing ? "animate-spin text-okx" : ""
          }`}
          title="Refresh balances"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Asset Overview */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        {/* Native Gas Token (OKB) */}
        <div className="bg-black border border-shiro-border rounded-xl p-3.5">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-mono font-light">OKB (Gas)</span>
            <span className="text-[10px] text-okx bg-okx-dark px-1.5 py-0.2 rounded font-mono">
              Native
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-medium font-mono text-white">
              {isConnected ? formattedOkb : "--"}
            </span>
            <span className="text-[11px] text-shiro-subtle font-mono">
              ≈ ${(parseFloat(formattedOkb) * 48.5).toFixed(2)}
            </span>
          </div>
        </div>

        {/* ShiroVault Deposited Balance */}
        <div className="bg-black border border-shiro-border rounded-xl p-3.5 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="font-mono font-light flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-okx" /> ShiroVault
            </span>
            <span className="text-[10px] text-okx bg-okx-dark px-1.5 py-0.2 rounded font-mono">
              Active
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-lg font-medium font-mono text-white">
              {isConnected ? `${vaultBalance} USDC` : "--"}
            </span>
            <span className="text-[11px] text-shiro-subtle font-mono">Session</span>
          </div>
        </div>
      </div>

      {/* Token List */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-black border border-shiro-border font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-okx"></div>
            <span className="text-shiro-muted font-light">USDC</span>
          </div>
          <span className="text-white font-light">{isConnected ? "250.00" : "--"}</span>
        </div>
        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-black border border-shiro-border font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-okx"></div>
            <span className="text-shiro-muted font-light">WETH</span>
          </div>
          <span className="text-white font-light">{isConnected ? "0.1500" : "--"}</span>
        </div>
        <div className="flex items-center justify-between text-xs py-2 px-3 rounded-lg bg-black border border-shiro-border font-mono">
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 rounded-full bg-okx"></div>
            <span className="text-shiro-muted font-light">USDT</span>
          </div>
          <span className="text-white font-light">{isConnected ? "100.00" : "--"}</span>
        </div>
      </div>
    </div>
  );
};
