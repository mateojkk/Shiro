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
  CircleDashed,
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

  const navItems = [
    { id: "chat" as ActiveTab, label: "AI Copilot", shortLabel: "AI", icon: MessageSquare },
    { id: "swap" as ActiveTab, label: "Swap", shortLabel: "Swap", icon: ArrowLeftRight },
    { id: "wrap" as ActiveTab, label: "Wrap OKB", shortLabel: "Wrap", icon: RefreshCw },
    { id: "portfolio" as ActiveTab, label: "Portfolio", shortLabel: "Portfolio", icon: Layers },
  ];

  return (
    <>
      <header className="border-b border-white/[0.04] bg-[#080808]/95 backdrop-blur-md sticky top-0 z-50 w-full">
        <div className="w-full px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Left: Brand Logo */}
          <Link href="/" className="flex items-center space-x-2.5 group shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#121212] flex items-center justify-center transition-all border border-white/[0.06]">
              <span className="font-mono font-medium text-xs sm:text-sm text-white">白</span>
            </div>
            <span className="font-medium text-xs sm:text-sm text-white tracking-tight">SHIRO</span>
          </Link>

          {/* Center: Desktop Navigation Tabs (Hidden on small mobile) */}
          <nav className="hidden md:flex items-center bg-[#111111] p-1 rounded-xl border border-white/[0.04]">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? "bg-[#181818] text-white font-medium shadow-sm"
                      : "text-[#888888] hover:text-white font-light"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right: Network Status & Wallet Connection */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Network Switcher / Mainnet Status */}
            {isConnected && !isMainnet ? (
              <button
                onClick={handleSwitchNetwork}
                disabled={isPending}
                className="flex items-center space-x-1 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] sm:text-xs font-mono animate-pulse hover:bg-amber-500/30 transition-all"
                title="Click to switch wallet network to X Layer Mainnet"
              >
                {isPending ? (
                  <>
                    <CircleDashed className="w-3 h-3 animate-spin" />
                    <span>Switching...</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    <span className="hidden sm:inline">Switch to X Layer</span>
                    <span className="sm:hidden">Switch L2</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center space-x-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg bg-[#111111] text-[11px] sm:text-xs font-mono text-[#CCCCCC] border border-white/[0.04]">
                <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                <span className="hidden sm:inline font-light">X Layer (196)</span>
                <span className="sm:hidden font-light">196</span>
              </div>
            )}

            {/* Wallet Connection */}
            {isConnected ? (
              <div className="flex items-center space-x-1 bg-[#111111] rounded-lg p-0.5 border border-white/[0.04]">
                <div className="px-2 py-1 flex items-center space-x-1.5 text-[11px] sm:text-xs font-mono text-white">
                  <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                  <span className="font-light">
                    {address?.slice(0, 4)}...{address?.slice(-3)}
                  </span>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="px-1.5 py-1 text-xs text-[#888888] hover:text-white transition-colors"
                  title="Disconnect Wallet"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => connectors[0] && connect({ connector: connectors[0] })}
                className="flex items-center space-x-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all shrink-0"
              >
                <Wallet className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-black" />
                <span>Connect</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Sub-Header Navigation Tabs (Visible only on < md screens) */}
        <div className="md:hidden flex items-center justify-between px-2 py-1.5 border-t border-white/[0.04] bg-[#0A0A0A] overflow-x-auto gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex-1 flex items-center justify-center space-x-1 py-1.5 px-2 rounded-lg text-[11px] transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-[#181818] text-white font-medium shadow-sm border border-white/[0.08]"
                    : "text-[#888888] hover:text-white font-light"
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </header>
    </>
  );
};
