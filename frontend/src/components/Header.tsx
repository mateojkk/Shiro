"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useConnect, useDisconnect, useChainId } from "wagmi";
import { xlayerMainnet } from "@/config/xlayer";
import { ExternalLink, Wallet, ArrowUpRight, MessageSquare } from "lucide-react";

export const Header: React.FC = () => {
  const pathname = usePathname();
  const { address, isConnected } = useAccount();
  const { connectors, connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <header className="border-b border-shiro-border bg-black/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center space-x-6">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-8 h-8 rounded-lg bg-shiro-card border border-shiro-border flex items-center justify-center group-hover:border-shiro-borderHover transition-all">
              <span className="font-mono font-medium text-sm text-white">白</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-medium text-sm text-white tracking-tight">SHIRO</span>
              <span className="text-[10px] font-light px-2 py-0.5 rounded-full bg-shiro-card text-shiro-muted border border-shiro-border">
                X Layer Mainnet
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-shiro-border">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-light transition-all ${
                pathname === "/"
                  ? "text-white font-medium bg-shiro-card"
                  : "text-shiro-muted hover:text-white"
              }`}
            >
              Overview
            </Link>
            <Link
              href="/chat"
              className={`px-3 py-1.5 rounded-lg text-xs font-light transition-all flex items-center gap-1.5 ${
                pathname === "/chat" || pathname === "/app"
                  ? "text-white font-medium bg-shiro-card border border-shiro-border"
                  : "text-shiro-muted hover:text-white"
              }`}
            >
              <MessageSquare className="w-3 h-3 text-okx" />
              <span>AI Copilot</span>
            </Link>
          </nav>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Explorer Link */}
          <a
            href="https://www.oklink.com/xlayer"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 text-xs text-shiro-muted hover:text-white transition-colors px-2 py-1.5"
            title="View on OKLink Explorer"
          >
            <span className="font-light">OKLink</span>
            <ExternalLink className="w-3 h-3 text-shiro-subtle" />
          </a>

          {/* Launch App Button when on Home */}
          {pathname === "/" ? (
            <Link
              href="/chat"
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all"
            >
              <span>Launch App</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-black" />
            </Link>
          ) : isConnected ? (
            <div className="flex items-center space-x-2">
              <div className="bg-shiro-card border border-shiro-border rounded-lg px-3 py-1.5 flex items-center space-x-2 text-xs font-mono text-white">
                <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                <span className="font-light">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => disconnect()}
                className="p-1.5 text-xs text-shiro-muted hover:text-white transition-colors"
                title="Disconnect Wallet"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => connectors[0] && connect({ connector: connectors[0] })}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all"
            >
              <Wallet className="w-3.5 h-3.5 text-black" />
              <span>Connect Wallet</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
