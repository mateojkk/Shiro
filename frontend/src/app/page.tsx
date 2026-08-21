"use client";

import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import {
  Zap,
  ShieldCheck,
  Repeat,
  ArrowRight,
  ExternalLink,
  MessageSquare
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col w-full selection:bg-white/20 selection:text-white">
      {/* Global Header */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.12]">
              Autonomous <span className="font-medium text-white">Intent-Driven DeFi</span> on X Layer
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-shiro-muted font-light leading-relaxed max-w-3xl mx-auto">
              Execute atomic multi-hop swaps, schedule non-custodial DCA orders, and manage onchain portfolios through simple conversation. Routed directly through the <span className="text-white font-medium">OKX DEX aggregator</span>.
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/chat"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-sm transition-all flex items-center justify-center gap-2"
              >
                <span>Start Chatting</span>
                <ArrowRight className="w-4 h-4 text-black" />
              </Link>

              <a
                href="https://web3.okx.com/explorer/x-layer-testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-[#111111] hover:bg-[#161616] text-shiro-muted hover:text-white text-sm font-light transition-all flex items-center justify-center gap-2"
              >
                <span>Verified Contracts</span>
                <ExternalLink className="w-3.5 h-3.5 text-shiro-subtle" />
              </a>
            </div>
          </div>

          {/* Live execution surface */}
          <div className="mt-14 max-w-5xl mx-auto rounded-2xl bg-[#101010] overflow-hidden shadow-2xl">
            <div className="px-6 py-3.5 bg-black flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-shiro-subtle"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-shiro-subtle"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-shiro-subtle"></div>
                </div>
                <span className="text-xs font-mono text-shiro-muted pl-2">
                  live_routes@xlayer-zkEVM
                </span>
              </div>
              <span className="text-[10px] font-light px-2 py-0.5 rounded-full bg-[#161616] text-shiro-muted">
                Live Services Required
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-6">
              <div className="p-6 rounded-xl bg-black space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4 text-okx" />
                    <span className="text-xs font-mono font-medium text-white">
                      Intent parsing and quotes use live providers only
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-shiro-muted">
                    No demo fallbacks
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <span className="text-shiro-subtle text-[11px] block font-light">Intent</span>
                    <span className="text-white font-medium mt-0.5 block">Groq JSON</span>
                  </div>
                  <div>
                    <span className="text-shiro-subtle text-[11px] block font-light">Quote</span>
                    <span className="text-white font-medium mt-0.5 block">OKX DEX API</span>
                  </div>
                  <div>
                    <span className="text-shiro-subtle text-[11px] block font-light">Execution</span>
                    <span className="text-slate-300 font-light mt-0.5 block">Real calldata</span>
                  </div>
                  <div>
                    <span className="text-shiro-subtle text-[11px] block font-light">Failure Mode</span>
                    <span className="text-slate-300 font-light mt-0.5 block truncate">Explicit error</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[11px] text-shiro-muted font-light">
                    Missing live credentials disable intent and quote actions.
                  </span>
                  <Link
                    href="/chat"
                    className="px-4 py-2 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>Open in Chat</span>
                    <ArrowRight className="w-3.5 h-3.5 text-black" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Ticker */}
      <section className="py-12 bg-[#0B0B0B] w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center max-w-6xl mx-auto">
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-medium font-mono text-white">&lt; 450ms</div>
            <div className="text-xs sm:text-sm text-shiro-muted font-light">AI Response Time</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-medium font-mono text-white">100%</div>
            <div className="text-xs sm:text-sm text-shiro-muted font-light">Non-Custodial Security</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-medium font-mono text-white">X Layer Native</div>
            <div className="text-xs sm:text-sm text-shiro-muted font-light">zkEVM Speed &amp; Low Fees</div>
          </div>
          <div className="space-y-1">
            <div className="text-3xl sm:text-4xl font-medium font-mono text-white">&lt; 0.05%</div>
            <div className="text-xs sm:text-sm text-shiro-muted font-light">Avg OKX DEX Price Impact</div>
          </div>
        </div>
      </section>

      {/* 4 Clean Core Pillars */}
      <section className="py-24 w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-mono font-medium uppercase tracking-widest text-shiro-muted">
              Core Capabilities
            </h2>
            <p className="text-3xl sm:text-4xl font-light text-white">
              DeFi Made Simple Through Conversation
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Pillar 1: Conversational Swaps */}
            <div className="p-7 rounded-2xl bg-[#101010] space-y-3.5 hover:bg-[#141414] transition-all">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-shiro-muted">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium text-white">Conversational Swaps</h3>
              <p className="text-xs text-shiro-muted font-light leading-relaxed">
                Describe any trade in plain language. Groq AI evaluates your balance, computes slippage protection, and generates instant atomic execution calldata.
              </p>
            </div>

            {/* Pillar 2: OKX DEX Aggregator */}
            <div className="p-7 rounded-2xl bg-[#101010] space-y-3.5 hover:bg-[#141414] transition-all">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-shiro-muted">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium text-white">OKX DEX Liquidity</h3>
              <p className="text-xs text-shiro-muted font-light leading-relaxed">
                Direct integration with the OKX DEX aggregator routes every transaction through optimal liquidity pools on X Layer for low fees and best rates.
              </p>
            </div>

            {/* Pillar 3: Recurring DCA Schedules */}
            <div className="p-7 rounded-2xl bg-[#101010] space-y-3.5 hover:bg-[#141414] transition-all">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-shiro-muted">
                <Repeat className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium text-white">Automated DCA Schedules</h3>
              <p className="text-xs text-shiro-muted font-light leading-relaxed">
                Set recurring Dollar-Cost Averaging orders effortlessly. Decentralized keeper bots monitor onchain timestamps and execute cycles automatically on X Layer.
              </p>
            </div>

            {/* Pillar 4: Non-Custodial Vault */}
            <div className="p-7 rounded-2xl bg-[#101010] space-y-3.5 hover:bg-[#141414] transition-all">
              <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center text-shiro-muted">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base font-medium text-white">Non-Custodial Session Keys</h3>
              <p className="text-xs text-shiro-muted font-light leading-relaxed">
                Grant keepers time-bound and amount-limited session allowances without giving up custody. You can withdraw 100% of your funds at any time.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Call to Action */}
      <section className="py-24 bg-[#0B0B0B] w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 text-center space-y-6 max-w-4xl mx-auto">
          <h3 className="text-3xl sm:text-5xl font-light text-white">
            Experience the simplicity of onchain AI.
          </h3>
          <p className="text-sm sm:text-base text-shiro-muted font-light max-w-xl mx-auto leading-relaxed">
            No complex DEX interfaces. No manual calculations. Just tell Shiro what you want to achieve on X Layer.
          </p>
          <div className="pt-4">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-sm transition-all"
            >
              <span>Launch Shiro Chat</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="py-8 bg-black w-full">
        <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs font-light text-shiro-subtle gap-4 font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-[#111111] flex items-center justify-center">
              <span className="text-white font-medium text-xs">白</span>
            </div>
            <span className="text-white font-medium">Shiro Protocol</span>
            <span>•</span>
            <span className="text-shiro-muted font-light">X Layer zkEVM</span>
          </div>

          <div className="flex items-center space-x-6">
            <Link href="/chat" className="hover:text-white transition-colors">
              Chat
            </Link>
            <a
              href="https://web3.okx.com/explorer/x-layer-testnet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              OKLink Explorer
            </a>
            <a
              href="https://www.okx.com/xlayer/faucet"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              OKX Faucet
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
