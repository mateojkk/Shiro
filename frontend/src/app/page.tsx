"use client";

import Link from "next/link";
import { LandingHeader } from "@/components/LandingHeader";
import {
  Zap,
  RefreshCw,
  ArrowRight,
  MessageSquare,
  PieChart,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col w-full selection:bg-white/20 selection:text-white">
      {/* Global Header */}
      <LandingHeader />

      {/* Hero Section */}
      <section className="relative pt-20 sm:pt-28 pb-16 sm:pb-24 overflow-hidden w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 relative z-10">
          <div className="text-center max-w-4xl mx-auto space-y-6">
            {/* Main Headline */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-light tracking-tight leading-[1.12]">
              Autonomous <span className="font-medium text-white">Intent-Driven DeFi</span> on X Layer
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-[#999999] font-light leading-relaxed max-w-3xl mx-auto">
              Execute instant DEX swaps, wrap native OKB with zero slippage, and run onchain portfolio audits through simple conversation. Powered by <span className="text-white font-medium">Groq LPUs</span> and routed via the <span className="text-white font-medium">OKX DEX Aggregator</span>.
            </p>
          </div>

          {/* Interactive Terminal Mockup */}
          <div className="mt-14 max-w-4xl mx-auto rounded-2xl bg-[#0E0E0E] border border-white/[0.08] overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-[#080808] border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#222222]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#222222]"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-[#222222]"></div>
                </div>
                <span className="text-xs font-mono text-[#888888] pl-2">
                  shiro_intent_engine@xlayer-mainnet
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#141414] text-okx flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-okx"></span>
                <span>Sub-300ms Groq LPU</span>
              </span>
            </div>

            <div className="p-5 sm:p-7 space-y-4">
              {/* Sample User Prompt */}
              <div className="flex justify-end">
                <div className="bg-[#181818] text-white rounded-2xl px-4 py-2.5 text-xs sm:text-sm font-light border border-white/[0.06]">
                  &quot;Swap 0.05 OKB into USDC with 0.5% slippage on Mainnet&quot;
                </div>
              </div>

              {/* Sample AI Execution Card */}
              <div className="p-4 rounded-xl bg-black border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-okx"></span>
                    <span className="text-xs font-mono font-medium text-white uppercase tracking-wider">
                      SWAP Intent (X Layer zkEVM)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#161616] text-[#888888]">
                    Risk: LOW (Optimal Route)
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div>
                    <span className="text-[#555555] text-[11px] block font-light">Input</span>
                    <span className="text-white font-medium mt-0.5 block">0.05 OKB</span>
                  </div>
                  <div>
                    <span className="text-[#555555] text-[11px] block font-light">Output</span>
                    <span className="text-white font-medium mt-0.5 block">~2.42 USDC</span>
                  </div>
                  <div>
                    <span className="text-[#555555] text-[11px] block font-light">Routing</span>
                    <span className="text-slate-300 font-light mt-0.5 block">OKX Aggregator</span>
                  </div>
                  <div>
                    <span className="text-[#555555] text-[11px] block font-light">Slippage</span>
                    <span className="text-slate-300 font-light mt-0.5 block">0.50%</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-white/[0.04]">
                  <span className="text-[11px] text-[#777777] font-light">
                    Canonical contracts verified on X Layer Mainnet.
                  </span>
                  <Link
                    href="/chat"
                    className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all flex items-center gap-1.5"
                  >
                    <span>Try in Copilot</span>
                    <ArrowRight className="w-3 h-3 text-black" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Ticker */}
      <section className="py-12 bg-[#090909] border-y border-white/[0.04] w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center max-w-6xl mx-auto">
          <div className="space-y-1">
            <div className="text-2xl sm:text-4xl font-medium font-mono text-white">&lt; 300ms</div>
            <div className="text-xs sm:text-sm text-[#777777] font-light">Groq LPU Inference</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-4xl font-medium font-mono text-white">100%</div>
            <div className="text-xs sm:text-sm text-[#777777] font-light">Non-Custodial (Your Keys)</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-4xl font-medium font-mono text-white">0% Slippage</div>
            <div className="text-xs sm:text-sm text-[#777777] font-light">Canonical WOKB Wrapper</div>
          </div>
          <div className="space-y-1">
            <div className="text-2xl sm:text-4xl font-medium font-mono text-white">Mainnet 196</div>
            <div className="text-xs sm:text-sm text-[#777777] font-light">Live zkEVM Settlement</div>
          </div>
        </div>
      </section>

      {/* 4 Core Pillars */}
      <section className="py-20 sm:py-28 w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 space-y-16">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-xs font-mono font-medium uppercase tracking-widest text-[#777777]">
              Engineered for X Layer
            </h2>
            <p className="text-3xl sm:text-4xl font-light text-white">
              Instant DeFi Execution via Natural Language
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {/* Pillar 1: Conversational Swaps */}
            <div className="p-7 rounded-2xl bg-[#0E0E0E] border border-white/[0.06] space-y-3.5 hover:border-white/[0.12] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#161616] flex items-center justify-center text-white">
                <MessageSquare className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-white">Autonomous Swaps</h3>
              <p className="text-xs text-[#888888] font-light leading-relaxed">
                Describe any trade in plain language. Groq AI parses tokens, quantities, and slippage tolerances to prepare 1-click atomic execution.
              </p>
            </div>

            {/* Pillar 2: OKX DEX Aggregator */}
            <div className="p-7 rounded-2xl bg-[#0E0E0E] border border-white/[0.06] space-y-3.5 hover:border-white/[0.12] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#161616] flex items-center justify-center text-white">
                <Zap className="w-5 h-5 text-okx" />
              </div>
              <h3 className="text-base font-medium text-white">OKX DEX Routing</h3>
              <p className="text-xs text-[#888888] font-light leading-relaxed">
                Routinely queries the OKX DEX Aggregator across X Layer Mainnet liquidity pools for minimal price impact and ultra-low zkEVM gas fees.
              </p>
            </div>

            {/* Pillar 3: Canonical OKB Wrapper */}
            <div className="p-7 rounded-2xl bg-[#0E0E0E] border border-white/[0.06] space-y-3.5 hover:border-white/[0.12] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#161616] flex items-center justify-center text-white">
                <RefreshCw className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-white">1:1 OKB Wrapper</h3>
              <p className="text-xs text-[#888888] font-light leading-relaxed">
                Seamlessly wrap and unwrap native OKB ↔ WOKB (0xe538...9b2b) directly onchain with exact 1:1 conversion and 0% slippage.
              </p>
            </div>

            {/* Pillar 4: Portfolio Diagnostics */}
            <div className="p-7 rounded-2xl bg-[#0E0E0E] border border-white/[0.06] space-y-3.5 hover:border-white/[0.12] transition-all">
              <div className="w-10 h-10 rounded-xl bg-[#161616] flex items-center justify-center text-white">
                <PieChart className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-medium text-white">Portfolio Doctor</h3>
              <p className="text-xs text-[#888888] font-light leading-relaxed">
                Real-time onchain wallet inspection, asset allocation diagnostics, pre-flight balance protection, and 1-click token import to MetaMask.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Call to Action */}
      <section className="py-20 sm:py-24 bg-[#090909] border-t border-white/[0.04] w-full">
        <div className="w-full px-4 sm:px-8 lg:px-16 text-center space-y-6 max-w-4xl mx-auto">
          <h3 className="text-3xl sm:text-5xl font-light text-white">
            Experience the simplicity of conversational DeFi.
          </h3>
          <p className="text-sm sm:text-base text-[#888888] font-light max-w-xl mx-auto leading-relaxed">
            No fragmented menus. No manual calculations. Speak your intent and let Shiro handle the onchain routing on X Layer.
          </p>
          <div className="pt-4">
            <Link
              href="/chat"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-sm transition-all"
            >
              <span>Launch Shiro Copilot</span>
              <ArrowRight className="w-4 h-4 text-black" />
            </Link>
          </div>
        </div>
      </section>

      {/* Clean Footer */}
      <footer className="py-8 bg-black border-t border-white/[0.04] w-full">
        <div className="w-full px-4 sm:px-8 lg:px-12 flex flex-col sm:flex-row items-center justify-between text-xs font-light text-[#666666] gap-4 font-mono">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-[#111111] flex items-center justify-center border border-white/[0.06]">
              <span className="text-white font-medium text-xs">白</span>
            </div>
            <span className="text-white font-medium">Shiro Protocol</span>
            <span>•</span>
            <span className="text-[#888888] font-light">X Layer zkEVM Mainnet</span>
          </div>

          <div className="flex items-center space-x-6">
            <a
              href="https://x.com/useshiro"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Twitter
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
