"use client";

import React, { useState } from "react";
import { useAccount, useBalance, useReadContract, useWriteContract, useSwitchChain } from "wagmi";
import { parseEther, formatEther } from "viem";
import { ArrowDown, CheckCircle2, CircleDashed, ExternalLink, ShieldCheck, Zap, Plus } from "lucide-react";
import { CONTRACT_ADDRESSES, WOKB_ABI, xlayerMainnet, watchAssetInWallet } from "@/config/xlayer";

export const WrapTab: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending: isSwitching } = useSwitchChain();
  const { writeContractAsync, isPending: isExecuting } = useWriteContract();

  const isMainnet = chainId === xlayerMainnet.id;
  const wokbAddress = CONTRACT_ADDRESSES[196].WOKB;

  // Mode: "wrap" = OKB -> WOKB | "unwrap" = WOKB -> OKB
  const [mode, setMode] = useState<"wrap" | "unwrap">("wrap");
  const [amount, setAmount] = useState("0.05");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Native OKB Balance
  const { data: okbBalance, refetch: refetchOkb } = useBalance({
    address,
    chainId: xlayerMainnet.id,
  });

  // WOKB Token Balance
  const { data: wokbBalanceRaw, refetch: refetchWokb } = useReadContract({
    address: wokbAddress,
    abi: WOKB_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: xlayerMainnet.id,
  });

  const parsedWokb = wokbBalanceRaw ? formatEther(wokbBalanceRaw as bigint) : "0.00";
  const parsedOkb = okbBalance ? parseFloat(formatEther(okbBalance.value)).toFixed(4) : "0.00";

  const handleToggleMode = () => {
    setMode(mode === "wrap" ? "unwrap" : "wrap");
    setTxHash(null);
    setErrorMessage(null);
  };

  const handleSetMax = () => {
    if (mode === "wrap") {
      const maxOkb = okbBalance ? Math.max(0, parseFloat(formatEther(okbBalance.value)) - 0.005) : 0;
      setAmount(maxOkb > 0 ? maxOkb.toFixed(4) : "0");
    } else {
      setAmount(parsedWokb);
    }
  };

  const handleExecute = async () => {
    if (!isConnected || !address) {
      alert("Please connect your wallet first.");
      return;
    }

    if (!isMainnet) {
      try {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: xlayerMainnet.id });
        }
      } catch (err) {
        setErrorMessage("Please switch your wallet to X Layer Mainnet (196).");
        return;
      }
    }

    setTxHash(null);
    setErrorMessage(null);

    const amountUnits = parseEther(amount || "0");

    if (mode === "wrap") {
      const okbVal = okbBalance?.value || BigInt(0);
      if (okbVal < amountUnits) {
        setErrorMessage(`Insufficient OKB balance: You have ${parsedOkb} OKB, but tried to wrap ${amount} OKB.`);
        return;
      }
    } else {
      const wokbVal = (wokbBalanceRaw as bigint) || BigInt(0);
      if (wokbVal < amountUnits) {
        setErrorMessage(`Insufficient WOKB balance: You have ${parsedWokb} WOKB, but tried to unwrap ${amount} WOKB.`);
        return;
      }
    }

    try {
      let hash: `0x${string}`;

      if (mode === "wrap") {
        // Deposit Native OKB -> Receive WOKB
        hash = await writeContractAsync({
          chainId: xlayerMainnet.id,
          address: wokbAddress,
          abi: WOKB_ABI,
          functionName: "deposit",
          value: amountUnits,
        });
      } else {
        // Withdraw WOKB -> Receive Native OKB
        hash = await writeContractAsync({
          chainId: xlayerMainnet.id,
          address: wokbAddress,
          abi: WOKB_ABI,
          functionName: "withdraw",
          args: [amountUnits],
        });
      }

      setTxHash(hash);
      setTimeout(() => {
        refetchOkb();
        refetchWokb();
      }, 3000);
    } catch (err: any) {
      console.error("Wrap error:", err);
      setErrorMessage(err.shortMessage || err.message || "Transaction failed.");
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 pt-4">
      {/* Header Banner */}
      <div className="bg-[#111111] border border-white/[0.04] rounded-2xl p-5 flex items-center justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-medium text-white tracking-tight">OKB Wrapper</h2>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-okx/10 text-okx border border-okx/20">
              1:1 Fixed Rate
            </span>
          </div>
          <p className="text-xs text-[#888888] font-light mt-1">
            Seamlessly wrap native OKB for DeFi protocols or unwrap WOKB back to native gas.
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-xs text-[#666666] font-mono">
          <ShieldCheck className="w-4 h-4 text-okx" />
          <span>Zero Slippage</span>
        </div>
      </div>

      {/* Main Wrap / Unwrap Card */}
      <div className="bg-[#111111] border border-white/[0.04] rounded-2xl p-6 space-y-5">
        {/* Mode Selector */}
        <div className="flex items-center bg-[#161616] p-1 rounded-xl">
          <button
            onClick={() => { setMode("wrap"); setTxHash(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all ${
              mode === "wrap"
                ? "bg-[#222222] text-white font-medium shadow-sm"
                : "text-[#777777] hover:text-white"
            }`}
          >
            Wrap (OKB → WOKB)
          </button>
          <button
            onClick={() => { setMode("unwrap"); setTxHash(null); }}
            className={`flex-1 py-2 rounded-lg text-xs font-mono transition-all ${
              mode === "unwrap"
                ? "bg-[#222222] text-white font-medium shadow-sm"
                : "text-[#777777] hover:text-white"
            }`}
          >
            Unwrap (WOKB → OKB)
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/20 text-red-300 text-xs font-light">
            {errorMessage}
          </div>
        )}

        {/* Input: You Pay */}
        <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#777777]">
            <span className="font-light">You {mode === "wrap" ? "Wrap" : "Unwrap"}</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-[11px]">
                Balance: {mode === "wrap" ? parsedOkb : parsedWokb} {mode === "wrap" ? "OKB" : "WOKB"}
              </span>
              <button
                onClick={handleSetMax}
                className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#222222] text-okx hover:bg-[#2a2a2a] transition-all"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="bg-transparent text-2xl font-mono text-white font-medium focus:outline-none w-full"
            />
            <div className="px-3 py-1.5 rounded-lg bg-[#222222] text-white text-xs font-mono font-medium shrink-0">
              {mode === "wrap" ? "OKB (Native)" : "WOKB"}
            </div>
          </div>
        </div>

        {/* Switch Direction Button */}
        <div className="flex justify-center -my-2 relative z-10">
          <button
            onClick={handleToggleMode}
            className="w-8 h-8 rounded-full bg-[#202020] border border-white/[0.08] flex items-center justify-center text-[#888888] hover:text-white transition-all shadow-md"
            title="Switch Direction"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Output: You Receive */}
        <div className="bg-[#161616] border border-white/[0.04] rounded-xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#777777]">
            <span className="font-light">You Receive</span>
            <span className="font-mono text-[11px]">1 OKB = 1 WOKB</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-2xl font-mono text-white font-medium">
              {amount || "0.00"}
            </div>
            <div className="px-3 py-1.5 rounded-lg bg-[#222222] text-white text-xs font-mono font-medium shrink-0">
              {mode === "wrap" ? "WOKB" : "OKB (Native)"}
            </div>
          </div>
        </div>

        {/* Specs & Contract Info */}
        <div className="p-3.5 rounded-xl bg-[#161616] border border-white/[0.04] space-y-1.5 text-xs font-mono">
          <div className="flex justify-between text-[#777777]">
            <span className="font-light">Contract</span>
            <a
              href={`https://www.oklink.com/xlayer/address/${wokbAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-300 hover:text-okx flex items-center space-x-1"
            >
              <span>{(wokbAddress || "0xe538905cf8414324e34195982505b3eb3d745670").slice(0, 6)}...{(wokbAddress || "0xe538905cf8414324e34195982505b3eb3d745670").slice(-4)}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex justify-between text-[#777777]">
            <span className="font-light">Slippage & Protocol Fee</span>
            <span className="text-okx font-medium">0.00% (Exact 1:1)</span>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleExecute}
          disabled={!isConnected || !parseFloat(amount || "0") || isExecuting}
          className="w-full py-3 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-xs font-mono transition-all disabled:opacity-25 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-sm"
        >
          {isExecuting ? (
            <>
              <CircleDashed className="w-4 h-4 animate-spin text-black" />
              <span>Confirming on X Layer...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-black" />
              <span>{mode === "wrap" ? "Wrap OKB" : "Unwrap WOKB"}</span>
            </>
          )}
        </button>

        {/* Success Transaction Banner */}
        {txHash && (
          <div className="p-4 rounded-xl bg-okx/10 border border-okx/20 text-okx text-xs space-y-2">
            <div className="flex items-center space-x-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Successfully {mode === "wrap" ? "Wrapped" : "Unwrapped"} {amount} {mode === "wrap" ? "OKB" : "WOKB"}!</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <a
                href={`https://www.oklink.com/xlayer/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 text-white hover:underline text-[11px] font-mono"
              >
                <span>View on OKLink</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              {mode === "wrap" && (
                <button
                  onClick={() => watchAssetInWallet({ address: wokbAddress, symbol: "WOKB", decimals: 18 })}
                  className="flex items-center space-x-1 text-[11px] font-mono text-okx hover:text-white"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add WOKB to MetaMask</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
