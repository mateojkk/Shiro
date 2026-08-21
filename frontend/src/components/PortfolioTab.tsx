"use client";

import React, { useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
} from "wagmi";
import { formatEther, formatUnits } from "viem";
import {
  RefreshCw,
  TrendingUp,
  ExternalLink,
  Plus,
  PieChart,
  ShieldCheck,
  Zap,
  ArrowRight,
} from "lucide-react";
import { CONTRACT_ADDRESSES, ERC20_ABI, xlayerMainnet, watchAssetInWallet } from "@/config/xlayer";

interface PortfolioTabProps {
  onNavigateTab?: (tab: "chat" | "swap" | "wrap") => void;
}

export const PortfolioTab: React.FC<PortfolioTabProps> = ({ onNavigateTab }) => {
  const { address, isConnected, chainId: currentWalletChainId } = useAccount();
  
  // Enforce X Layer Mainnet (196)
  const isXLayer = currentWalletChainId === xlayerMainnet.id;
  const activeChainId = xlayerMainnet.id;
  const addresses = CONTRACT_ADDRESSES[activeChainId] || CONTRACT_ADDRESSES[196];
  const balanceQuery = {
    enabled: Boolean(address && isXLayer),
    refetchInterval: 15000,
    retry: 1,
  };

  // 1. Real Native OKB Balance strictly on X Layer.
  const { data: okbBalance, refetch: refetchOkb } = useBalance({
    address,
    chainId: activeChainId,
    query: balanceQuery,
  });

  // 2. Real ERC20 Token Balances strictly on X Layer.
  const { data: wokbRaw, refetch: refetchWokb } = useReadContract({
    chainId: activeChainId,
    address: addresses.WOKB,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const { data: usdcRaw, refetch: refetchUsdc } = useReadContract({
    chainId: activeChainId,
    address: addresses.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const { data: usdtRaw, refetch: refetchUsdt } = useReadContract({
    chainId: activeChainId,
    address: addresses.USDT,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const { data: wethRaw, refetch: refetchWeth } = useReadContract({
    chainId: activeChainId,
    address: addresses.WETH,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: balanceQuery,
  });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Formatting Real Values & Reference Prices
  const formattedOkb = okbBalance ? parseFloat(formatEther(okbBalance.value)).toFixed(4) : "0.0000";
  const okbUsdNum = parseFloat(formattedOkb) * 48.5;
  const okbUsd = okbUsdNum.toFixed(2);

  const formattedWokb = wokbRaw ? parseFloat(formatEther(wokbRaw)).toFixed(4) : "0.0000";
  const wokbUsdNum = parseFloat(formattedWokb) * 48.5;
  const wokbUsd = wokbUsdNum.toFixed(2);

  const formattedUsdc = usdcRaw ? parseFloat(formatUnits(usdcRaw, 6)).toFixed(2) : "0.00";
  const usdcUsdNum = parseFloat(formattedUsdc);

  const formattedUsdt = usdtRaw ? parseFloat(formatUnits(usdtRaw, 6)).toFixed(2) : "0.00";
  const usdtUsdNum = parseFloat(formattedUsdt);

  const formattedWeth = wethRaw ? parseFloat(formatUnits(wethRaw, 18)).toFixed(4) : "0.0000";
  const wethUsdNum = parseFloat(formattedWeth) * 2650.0;
  const wethUsd = wethUsdNum.toFixed(2);

  const totalPortfolioUsdNum = okbUsdNum + wokbUsdNum + usdcUsdNum + usdtUsdNum + wethUsdNum;
  const totalPortfolioUsd = totalPortfolioUsdNum.toFixed(2);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchOkb(), refetchWokb(), refetchUsdc(), refetchUsdt(), refetchWeth()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddTokenToWallet = async (token: { address: string; symbol: string; decimals: number }) => {
    try {
      const added = await watchAssetInWallet({
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
      });
      if (added) {
        setActionSuccess(`${token.symbol} token added to your wallet!`);
        setTimeout(() => setActionSuccess(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const tokenList = [
    {
      symbol: "OKB",
      name: "OKB (Native Gas)",
      amount: formattedOkb,
      usd: okbUsd,
      rawUsd: okbUsdNum,
      isNative: true,
      address: null,
      decimals: 18,
    },
    {
      symbol: "WOKB",
      name: "Wrapped OKB (1:1)",
      amount: formattedWokb,
      usd: wokbUsd,
      rawUsd: wokbUsdNum,
      isNative: false,
      address: addresses.WOKB,
      decimals: 18,
    },
    {
      symbol: "USDC",
      name: "USD Coin (Canonical)",
      amount: formattedUsdc,
      usd: formattedUsdc,
      rawUsd: usdcUsdNum,
      isNative: false,
      address: addresses.USDC,
      decimals: 6,
    },
    {
      symbol: "USDT",
      name: "Tether USD",
      amount: formattedUsdt,
      usd: formattedUsdt,
      rawUsd: usdtUsdNum,
      isNative: false,
      address: addresses.USDT,
      decimals: 6,
    },
    {
      symbol: "WETH",
      name: "Wrapped Ether",
      amount: formattedWeth,
      usd: wethUsd,
      rawUsd: wethUsdNum,
      isNative: false,
      address: addresses.WETH,
      decimals: 18,
    },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 w-full px-2 sm:px-4">
      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-okx/10 border border-okx/20 text-okx text-xs flex items-center justify-between animate-fadeIn">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess(null)} className="text-white hover:text-okx">
            ✕
          </button>
        </div>
      )}

      {/* Top Header Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-light text-white tracking-tight flex items-center gap-2">
            <span>Portfolio Doctor</span>
            <span className="text-xs font-mono font-normal px-2.5 py-0.5 rounded-full bg-[#141414] text-okx border border-white/[0.04]">
              X Layer zkEVM
            </span>
          </h2>
          <p className="text-xs text-[#888888] font-light">
            Real-time onchain balances, asset allocation, and gas health diagnostics.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleRefreshAll}
            disabled={isRefreshing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-[#161616] text-[#888888] hover:text-white border border-white/[0.04] text-xs font-light transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-okx" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Balances"}</span>
          </button>

          {address && (
            <a
              href={`https://www.oklink.com/xlayer/address/${address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-[#111111] hover:bg-[#161616] text-[#888888] hover:text-white border border-white/[0.04] text-xs font-light transition-all"
            >
              <span>OKLink</span>
              <ExternalLink className="w-3 h-3 text-[#666666]" />
            </a>
          )}
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full">
        {/* Net Worth */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs text-[#888888]">
            <span className="font-light">Total Estimated Value</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-[#888888]">
              USD
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-medium font-mono text-white">
            {isConnected ? `$${totalPortfolioUsd}` : "$0.00"}
          </div>
          <p className="text-[11px] text-[#666666] font-light">Direct wallet assets on X Layer</p>
        </div>

        {/* OKB Gas Holdings */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs text-[#888888]">
            <span className="font-light flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-okx" /> Native Gas (OKB)
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-okx">
              Gas Token
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-medium font-mono text-white">
            {isConnected ? `${formattedOkb} OKB` : "0.0000 OKB"}
          </div>
          <p className="text-[11px] text-[#666666] font-mono font-light">≈ ${okbUsd} USD</p>
        </div>

        {/* Network & Gas Readiness */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2 border border-white/[0.04]">
          <div className="flex items-center justify-between text-xs text-[#888888]">
            <span className="font-light flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-white" /> Network Status
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-okx">
              Chain 196
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-medium font-mono text-white">
            {isXLayer ? "Mainnet Active" : "Wrong Chain"}
          </div>
          <p className="text-[11px] text-[#666666] font-light">zkEVM Sub-Second Settlement</p>
        </div>
      </div>

      {/* Main 2-Column Section: Token Balances Table & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Token Assets (6 cols) */}
        <div className="lg:col-span-6 bg-[#101010] rounded-2xl p-5 sm:p-6 space-y-4 border border-white/[0.04]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white tracking-wide">Wallet Assets</h3>
              <p className="text-xs text-[#888888] font-light">Live onchain token balances</p>
            </div>
            <span className="text-xs font-mono text-[#888888]">5 Verified Tokens</span>
          </div>

          <div className="space-y-2">
            {tokenList.map((token) => (
              <div
                key={token.symbol}
                className="flex items-center justify-between p-3.5 rounded-xl bg-black font-mono text-xs hover:bg-[#141414] transition-all group border border-white/[0.02]"
              >
                <div className="flex items-center space-x-2.5">
                  <div>
                    <div className="font-medium text-white flex items-center gap-1.5">
                      <span>{token.symbol}</span>
                      {token.address && (
                        <button
                          onClick={() => handleAddTokenToWallet({ address: token.address!, symbol: token.symbol, decimals: token.decimals })}
                          className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded bg-[#181818] hover:bg-[#252525] text-[9px] text-[#CCCCCC] font-sans transition-all flex items-center gap-0.5"
                          title={`Add ${token.symbol} to wallet`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Import</span>
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-[#666666] font-light">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{token.amount}</div>
                  <div className="text-[10px] text-[#666666] font-light">≈ ${token.usd}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Portfolio Doctor Diagnostics & Health (6 cols) */}
        <div className="lg:col-span-6 bg-[#101010] rounded-2xl p-5 sm:p-6 space-y-5 border border-white/[0.04]">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
            <div className="flex items-center space-x-2">
              <PieChart className="w-4 h-4 text-okx" />
              <h3 className="text-sm font-medium text-white tracking-wide">Allocation & Diagnostics</h3>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-[#888888]">
              AI Evaluated
            </span>
          </div>

          {/* Diagnostics Cards */}
          <div className="space-y-3">
            {/* Gas Readiness */}
            <div className="p-4 rounded-xl bg-black border border-white/[0.02] space-y-1.5">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#888888]">Gas Readiness</span>
                <span className={parseFloat(formattedOkb) > 0.001 ? "text-okx" : "text-amber-400"}>
                  {parseFloat(formattedOkb) > 0.001 ? "HEALTHY" : "LOW GAS"}
                </span>
              </div>
              <p className="text-[11px] text-[#777777] font-light leading-relaxed">
                {parseFloat(formattedOkb) > 0.001
                  ? `Your balance of ${formattedOkb} OKB can power ~${Math.floor(parseFloat(formattedOkb) / 0.00005)} transactions on X Layer zkEVM.`
                  : "Low OKB gas balance. Deposit native OKB to pay for L2 transactions and swaps."}
              </p>
            </div>

            {/* Asset Allocation Breakdown */}
            <div className="p-4 rounded-xl bg-black border border-white/[0.02] space-y-2.5">
              <div className="text-xs font-mono text-[#888888] flex items-center justify-between">
                <span>Asset Allocation</span>
                <span>{totalPortfolioUsdNum > 0 ? "100%" : "No Holdings"}</span>
              </div>

              {totalPortfolioUsdNum > 0 ? (
                <div className="space-y-1.5">
                  <div className="h-2 w-full bg-[#181818] rounded-full overflow-hidden flex">
                    {tokenList.map((token, i) => {
                      const pct = totalPortfolioUsdNum > 0 ? (token.rawUsd / totalPortfolioUsdNum) * 100 : 0;
                      if (pct <= 0) return null;
                      const colors = ["bg-okx", "bg-purple-400", "bg-blue-400", "bg-emerald-400", "bg-amber-400"];
                      return (
                        <div
                          key={token.symbol}
                          style={{ width: `${pct}%` }}
                          className={`h-full ${colors[i % colors.length]}`}
                          title={`${token.symbol}: ${pct.toFixed(1)}%`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3 text-[10px] font-mono text-[#888888] pt-1">
                    {tokenList.map((token) => {
                      const pct = totalPortfolioUsdNum > 0 ? (token.rawUsd / totalPortfolioUsdNum) * 100 : 0;
                      if (pct <= 0) return null;
                      return (
                        <span key={token.symbol} className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                          {token.symbol}: {pct.toFixed(1)}%
                        </span>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[#666666] font-light">
                  Connect your wallet to inspect portfolio diversification.
                </p>
              )}
            </div>

            {/* Security Guarantee */}
            <div className="p-4 rounded-xl bg-black border border-white/[0.02] space-y-1.5">
              <div className="flex items-center space-x-1.5 text-xs text-slate-300">
                <ShieldCheck className="w-3.5 h-3.5 text-okx" />
                <span className="font-medium">100% Non-Custodial Architecture</span>
              </div>
              <p className="text-[11px] text-[#777777] font-light leading-relaxed">
                All tokens remain securely in your wallet. Shiro never takes custody of private keys or assets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
