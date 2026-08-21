"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, ExternalLink } from "lucide-react";

export const LandingHeader: React.FC = () => {
  return (
    <header className="border-b border-shiro-border bg-black/80 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="w-full px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-8 h-8 rounded-lg bg-shiro-card border border-shiro-border flex items-center justify-center group-hover:border-shiro-borderHover transition-all">
            <span className="font-mono font-medium text-sm text-white">白</span>
          </div>
          <span className="font-medium text-sm text-white tracking-tight">SHIRO</span>
        </Link>

        {/* Navigation & Launch */}
        <div className="flex items-center space-x-4">
          <a
            href="https://web3.okx.com/explorer/x-layer-testnet"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center space-x-1 text-xs text-shiro-muted hover:text-white transition-colors"
          >
            <span>Explorer</span>
            <ExternalLink className="w-3 h-3 text-shiro-subtle" />
          </a>

          <Link
            href="/chat"
            className="flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all"
          >
            <span>Launch App</span>
            <ArrowUpRight className="w-3.5 h-3.5 text-black" />
          </Link>
        </div>
      </div>
    </header>
  );
};
