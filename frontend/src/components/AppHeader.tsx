"use client";

import React from "react";
import Link from "next/link";
import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { xlayerMainnet } from "@/config/xlayer";
import {
  Wallet,
  MessageSquare,
  ArrowLeftRight,
  RefreshCw,
  Layers,
  AlertTriangle,
  CircleDashed
} from "lucide-react";

export type ActiveTab = "chat" | "swap" | "wrap" | "portfolio";

interface AppHeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { address, isConnected, chainId } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChainAsync, isPending } = useSwitchChain();

  const isMainnet = chainId === xlayerMainnet.id;

  const handleSwitchNetwork = async () => {
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: xlayerMainnet.id });
      }
    } catch (err) {
      console.error("Manual switch error:", err);
    }
  };

  return (
    <header className="border-b border-white/[0.04] bg-[#080808]/90 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#121212] flex items-center justify-center transition-all">
            <span className="font-mono font-medium text-sm text-white">白</span>
          </div>
          <span className="font-medium text-sm text-white tracking-tight">SHIRO</span>
        </Link>

        {/* Center: Main App Nav Tabs */}
        <nav className="flex items-center bg-[#111111] p-1 rounded-xl">
          <button
            onClick={() => onSelectTab("chat")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === "chat"
                ? "bg-[#181818] text-white font-medium shadow-sm"
                : "text-[#888888] hover:text-white font-light"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={() => onSelectTab("swap")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === "swap"
                ? "bg-[#181818] text-white font-medium shadow-sm"
                : "text-[#888888] hover:text-white font-light"
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Swap</span>
          </button>

          <button
            onClick={() => onSelectTab("wrap")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === "wrap"
                ? "bg-[#181818] text-white font-medium shadow-sm"
                : "text-[#888888] hover:text-white font-light"
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Wrap OKB</span>
          </button>

          <button
            onClick={() => onSelectTab("portfolio")}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
              activeTab === "portfolio"
                ? "bg-[#181818] text-white font-medium shadow-sm"
                : "text-[#888888] hover:text-white font-light"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Portfolio</span>
          </button>
        </nav>

        {/* Right: Network Status & Wallet */}
        <div className="flex items-center space-x-3 shrink-0">
          {/* Network Switcher / Mainnet Status */}
          {isConnected && !isMainnet ? (
            <button
              onClick={handleSwitchNetwork}
              disabled={isPending}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-mono animate-pulse hover:bg-amber-500/30 transition-all"
              title="Click to switch wallet network to X Layer Mainnet"
            >
              {isPending ? (
                <>
                  <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                  <span>Switching...</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch to X Layer Mainnet</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg bg-[#111111] text-xs font-mono text-[#CCCCCC] border border-white/[0.04]">
              <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
              <span className="font-light">X Layer Mainnet (196)</span>
            </div>
          )}

          {/* Wallet Connection */}
          {isConnected ? (
            <div className="flex items-center space-x-2">
              <div className="bg-[#111111] rounded-lg px-3 py-1.5 flex items-center space-x-2 text-xs font-mono text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                <span className="font-light">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => disconnect()}
                className="p-1.5 text-xs text-[#888888] hover:text-white transition-colors"
                title="Disconnect Wallet"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all"
            >
              <Wallet className="w-3.5 h-3.5 text-black" />
              <span>Connect</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
