"use client";

import React, { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { AlertTriangle, ArrowRight, CircleDashed } from "lucide-react";
import { xlayerMainnet } from "@/config/xlayer";

export const NetworkGuard: React.FC = () => {
  const { isConnected, chainId } = useAccount();
  const { switchChainAsync, isPending } = useSwitchChain();

  const isSupported = chainId === xlayerMainnet.id;

  const [walletErrorMsg, setWalletErrorMsg] = useState<string | null>(null);

  if (!isConnected || isSupported) return null;

  const handleSwitchNetwork = async () => {
    setWalletErrorMsg(null);
    try {
      if (switchChainAsync) {
        await switchChainAsync({ chainId: xlayerMainnet.id });
      }
    } catch (err: any) {
      console.error("Network switch error:", err);
      if (err?.message?.includes("already pending")) {
        setWalletErrorMsg("Please open your wallet extension to approve the pending request.");
      }
    }
  };

  return (
    <div className="w-full bg-[#1A1408] border-b border-amber-500/20 px-4 py-2.5 flex items-center justify-between text-xs transition-all z-40 relative">
      <div className="flex items-center space-x-2.5 text-amber-300">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          {walletErrorMsg ? (
            <span className="text-amber-400 font-medium">{walletErrorMsg}</span>
          ) : (
            <>
              You are currently connected to an unsupported network (Chain ID: {chainId}). Please switch to <strong className="font-medium text-white">X Layer Mainnet (Chain ID: 196)</strong> to interact onchain.
            </>
          )}
        </span>
      </div>

      <button
        onClick={handleSwitchNetwork}
        disabled={isPending || !!walletErrorMsg}
        className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-medium text-xs transition-all shrink-0 ml-4 shadow-sm disabled:opacity-50"
      >
        {isPending ? (
          <>
            <CircleDashed className="w-3.5 h-3.5 animate-spin text-black" />
            <span>Switching...</span>
          </>
        ) : walletErrorMsg ? (
          <span>Check Wallet</span>
        ) : (
          <>
            <span>Switch to X Layer Mainnet</span>
            <ArrowRight className="w-3 h-3 text-black" />
          </>
        )}
      </button>
    </div>
  );
};
