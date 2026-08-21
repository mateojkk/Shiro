"use client";

import React, { useState } from "react";
import {
  useAccount,
  useBalance,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain
} from "wagmi";
import { formatEther, formatUnits, parseUnits } from "viem";
import {
  ShieldCheck,
  RefreshCw,
  ArrowUpRight,
  ArrowDownLeft,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  CircleDashed,
  ExternalLink,
  Plus,
} from "lucide-react";
import { CONTRACT_ADDRESSES, SHIRO_VAULT_ABI, ERC20_ABI, xlayerMainnet, watchAssetInWallet } from "@/config/xlayer";

export const PortfolioTab: React.FC = () => {
  const { address, isConnected, chainId: currentWalletChainId } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  
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

  // 3. Real ShiroVault Deposited Balance strictly on X Layer.
  const { data: vaultUsdcRaw, refetch: refetchVault } = useReadContract({
    chainId: activeChainId,
    address: addresses.SHIRO_VAULT,
    abi: SHIRO_VAULT_ABI,
    functionName: "balances",
    args: address ? [address, addresses.USDC] : undefined,
    query: balanceQuery,
  });

  const { writeContractAsync, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Formatting Real Values
  const formattedOkb = okbBalance ? parseFloat(formatEther(okbBalance.value)).toFixed(4) : "0.0000";
  const okbUsd = (parseFloat(formattedOkb) * 48.5).toFixed(2);

  const formattedUsdc = usdcRaw ? parseFloat(formatUnits(usdcRaw, 6)).toFixed(2) : "0.00";
  const formattedUsdt = usdtRaw ? parseFloat(formatUnits(usdtRaw, 6)).toFixed(2) : "0.00";
  const formattedWeth = wethRaw ? parseFloat(formatUnits(wethRaw, 18)).toFixed(4) : "0.0000";
  const wethUsd = (parseFloat(formattedWeth) * 2650.0).toFixed(2);

  const formattedVault = vaultUsdcRaw ? parseFloat(formatUnits(vaultUsdcRaw, 6)).toFixed(2) : "0.00";

  const totalPortfolioUsd = (
    parseFloat(okbUsd) +
    parseFloat(formattedUsdc) +
    parseFloat(formattedUsdt) +
    parseFloat(wethUsd) +
    parseFloat(formattedVault)
  ).toFixed(2);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([refetchOkb(), refetchUsdc(), refetchUsdt(), refetchWeth(), refetchVault()]);
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleRealDeposit = async () => {
    if (!depositAmount || !isConnected || !address) return;
    
    // Strict Network Lock: Switch BEFORE dispatching transaction
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (err) {
        setErrorMsg("Please approve the network switch to X Layer in your wallet before depositing.");
        return;
      }
    }

    setErrorMsg(null);
    try {
      const parsed = parseUnits(depositAmount, 6);
      // First approve if needed, then deposit strictly on X Layer
      await writeContractAsync({
        chainId: activeChainId,
        address: addresses.USDC,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [addresses.SHIRO_VAULT, parsed],
      });

      const hash = await writeContractAsync({
        chainId: activeChainId,
        address: addresses.SHIRO_VAULT,
        abi: SHIRO_VAULT_ABI,
        functionName: "deposit",
        args: [addresses.USDC, parsed],
      });

      setLastTxHash(hash);
      setDepositAmount("");
      setActionSuccess(`Deposit of ${depositAmount} USDC submitted on X Layer zkEVM!`);
      handleRefreshAll();
    } catch (err: any) {
      console.error("Deposit error:", err);
      setErrorMsg(err?.shortMessage || err?.message || "Deposit transaction rejected or failed");
    }
  };

  const handleRealWithdraw = async () => {
    if (!withdrawAmount || !isConnected || !address) return;
    
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (e) {
        return;
      }
    }

    setErrorMsg(null);
    try {
      const parsed = parseUnits(withdrawAmount, 6);
      const hash = await writeContractAsync({
        chainId: activeChainId,
        address: addresses.SHIRO_VAULT,
        abi: SHIRO_VAULT_ABI,
        functionName: "withdraw",
        args: [addresses.USDC, parsed],
      });

      setLastTxHash(hash);
      setWithdrawAmount("");
      setActionSuccess(`Withdrawal of ${withdrawAmount} USDC submitted on X Layer zkEVM!`);
      handleRefreshAll();
    } catch (err: any) {
      console.error("Withdraw error:", err);
      setErrorMsg(err?.shortMessage || err?.message || "Withdrawal transaction rejected or failed");
    }
  };

  const handleRealEmergencyWithdraw = async () => {
    if (!isConnected || !address) return;
    
    if (!isXLayer) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: activeChainId });
        }
      } catch (e) {
        return;
      }
    }

    setErrorMsg(null);
    try {
      const hash = await writeContractAsync({
        chainId: activeChainId,
        address: addresses.SHIRO_VAULT,
        abi: SHIRO_VAULT_ABI,
        functionName: "emergencyWithdraw",
        args: [addresses.USDC],
      });

      setLastTxHash(hash);
      setActionSuccess("Emergency pull submitted on X Layer! 100% of funds returned.");
      handleRefreshAll();
    } catch (err: any) {
      console.error("Emergency withdraw error:", err);
      setErrorMsg(err?.shortMessage || err?.message || "Emergency withdrawal rejected or failed");
    }
  };

  const tokenList = [
    { symbol: "OKB", name: "OKB Native Gas", amount: formattedOkb, usd: okbUsd, address: null, decimals: 18 },
    { symbol: "USDC", name: "USD Coin", amount: formattedUsdc, usd: formattedUsdc, address: addresses.USDC, decimals: 6 },
    { symbol: "WETH", name: "Wrapped Ether", amount: formattedWeth, usd: wethUsd, address: addresses.WETH, decimals: 18 },
    { symbol: "USDT", name: "Tether USD", amount: formattedUsdt, usd: formattedUsdt, address: addresses.USDT, decimals: 6 },
  ];

  return (
    <div className="w-full h-full space-y-6 px-2 sm:px-6 py-2">
      {/* Real Action Notification */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-[#111111] flex items-center justify-between text-xs text-okx shadow-md">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-okx" />
            <span className="font-light">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-shiro-muted hover:text-white">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/40 text-red-300 text-xs font-light">
          {errorMsg}
        </div>
      )}

      {lastTxHash && (
        <div className="p-3 rounded-xl bg-[#111111] text-xs font-mono flex items-center justify-between text-[#8E8E8E]">
          <span className="flex items-center gap-1.5 text-okx">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Transaction Broadcasted on X Layer zkEVM</span>
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

      {/* Full-Screen Portfolio Metrics Row (4 Cards across screen) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {/* Total Estimated Balance */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-light">Total Estimated Portfolio</span>
            <button
              onClick={handleRefreshAll}
              className={`p-1 text-shiro-muted hover:text-white transition-all ${isRefreshing ? "animate-spin" : ""}`}
              title="Refresh Onchain Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="text-3xl font-medium font-mono text-white">
            {isConnected ? `$${totalPortfolioUsd}` : "$0.00"}
          </div>
          <p className="text-[11px] text-shiro-subtle font-light">Live RPC polling (15s interval)</p>
        </div>

        {/* Native Gas Token */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-light">OKB (Gas Token)</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-shiro-muted">
              X Layer
            </span>
          </div>
          <div className="text-3xl font-medium font-mono text-white">
            {isConnected ? `${formattedOkb} OKB` : "0.0000 OKB"}
          </div>
          <p className="text-[11px] text-shiro-subtle font-mono font-light">≈ ${okbUsd} USD</p>
        </div>

        {/* ShiroVault Session Balance */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-light flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-okx" /> ShiroVault Active
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-okx">
              Non-Custodial
            </span>
          </div>
          <div className="text-3xl font-medium font-mono text-white">
            {isConnected ? `${formattedVault} USDC` : "0.00 USDC"}
          </div>
          <p className="text-[11px] text-shiro-subtle font-light">Real onchain contract balance</p>
        </div>

        {/* Status */}
        <div className="bg-[#101010] rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-shiro-muted">
            <span className="font-light flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-white" /> X Layer Status
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-okx">
              Chain {activeChainId}
            </span>
          </div>
          <div className="text-3xl font-medium font-mono text-white">
            {isXLayer ? "Connected" : "Wrong Chain"}
          </div>
          <p className="text-[11px] text-shiro-subtle font-light">zkEVM Fast Finality</p>
        </div>
      </div>

      {/* Full-Screen 2-Column Section: Wide Asset Table & Vault Controller */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Full-Width Token Balances (5 cols) */}
        <div className="lg:col-span-5 bg-[#101010] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white tracking-wide">Wallet Assets</h3>
              <p className="text-xs text-shiro-muted font-light">Live onchain balances on X Layer zkEVM</p>
            </div>
            <span className="text-xs font-mono text-shiro-muted">4 Assets</span>
          </div>

          <div className="space-y-2">
            {tokenList.map((token) => (
              <div
                key={token.symbol}
                className="flex items-center justify-between p-3.5 rounded-xl bg-black font-mono text-xs hover:bg-[#141414] transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <div>
                    <div className="font-medium text-white flex items-center gap-1.5">
                      <span>{token.symbol}</span>
                      {token.address && (
                        <button
                          onClick={() => handleAddTokenToWallet({ address: token.address!, symbol: token.symbol, decimals: token.decimals })}
                          className="opacity-0 group-hover:opacity-100 px-1.5 py-0.5 rounded bg-[#181818] hover:bg-[#252525] text-[9px] text-slate-300 font-sans transition-all flex items-center gap-0.5"
                          title={`Add ${token.symbol} to MetaMask`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>MetaMask</span>
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-shiro-subtle font-light">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-medium">{token.amount}</div>
                  <div className="text-[10px] text-shiro-subtle font-light">≈ ${token.usd}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: ShiroVault Non-Custodial Session Key Manager (7 cols) */}
        <div className="lg:col-span-7 bg-[#101010] rounded-2xl p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
            <div>
              <h3 className="text-sm font-medium text-white tracking-wide">ShiroVault Onchain Session Manager</h3>
              <p className="text-xs text-shiro-muted font-light">Deposit, withdraw, and manage non-custodial session allowance</p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-shiro-muted">
              {addresses.SHIRO_VAULT.slice(0, 6)}...{addresses.SHIRO_VAULT.slice(-4)}
            </span>
          </div>

          {/* Deposit / Withdraw Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Deposit Box */}
            <div className="bg-black rounded-xl p-4 space-y-3">
              <div className="text-xs text-shiro-muted font-light flex items-center gap-1.5">
                <ArrowDownLeft className="w-3.5 h-3.5 text-white" />
                <span>Deposit Allowance</span>
              </div>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount (USDC)"
                className="w-full bg-[#141414] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
              />
              {!isXLayer ? (
                <button
                  type="button"
                  onClick={() => switchChainAsync && switchChainAsync({ chainId: activeChainId })}
                  className="w-full py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all shadow-sm"
                >
                  Switch to X Layer
                </button>
              ) : (
                <button
                  onClick={handleRealDeposit}
                  disabled={!isConnected || !depositAmount || isPending}
                  className="w-full py-2.5 rounded-lg bg-white hover:bg-slate-200 text-black font-medium text-xs transition-all disabled:opacity-25 flex items-center justify-center gap-1.5"
                >
                  {isPending ? (
                    <>
                      <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                      <span>Confirming...</span>
                    </>
                  ) : (
                    <span>Deposit to Vault onchain (X Layer)</span>
                  )}
                </button>
              )}
            </div>

            {/* Withdraw Box */}
            <div className="bg-black rounded-xl p-4 space-y-3">
              <div className="text-xs text-shiro-muted font-light flex items-center gap-1.5">
                <ArrowUpRight className="w-3.5 h-3.5 text-white" />
                <span>Withdraw Funds</span>
              </div>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount (USDC)"
                className="w-full bg-[#141414] rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none"
              />
              <button
                onClick={handleRealWithdraw}
                disabled={!isConnected || !withdrawAmount || isPending}
                className="w-full py-2.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-white font-medium text-xs transition-all disabled:opacity-25 flex items-center justify-center gap-1.5"
              >
                {isPending ? (
                  <>
                    <CircleDashed className="w-3.5 h-3.5 animate-spin" />
                    <span>Confirming...</span>
                  </>
                ) : (
                  <span>Withdraw to Wallet onchain</span>
                )}
              </button>
            </div>
          </div>

          {/* Emergency Safety Trigger */}
          <div className="p-4 rounded-xl bg-black space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-light text-slate-300 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-shiro-muted" />
                <span>Emergency Withdraw Guarantee</span>
              </span>
              <button
                onClick={handleRealEmergencyWithdraw}
                disabled={!isConnected || parseFloat(formattedVault) === 0 || isPending}
                className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222222] text-shiro-muted hover:text-white text-[11px] font-light transition-all disabled:opacity-20"
              >
                Pull 100% Funds
              </button>
            </div>
            <p className="text-[11px] text-shiro-subtle font-light leading-relaxed">
              Smart contract security guarantee: You can pull all deposited funds back to your wallet address at any time without keeper authorization.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
