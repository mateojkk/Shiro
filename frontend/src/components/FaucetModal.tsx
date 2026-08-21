"use client";

import React from "react";
import { ExternalLink, X, ShieldCheck } from "lucide-react";
import { xlayerMainnet } from "@/config/xlayer";

interface FaucetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FaucetModal: React.FC<FaucetModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#111111] border border-white/[0.08] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#888888] hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-okx" />
          <h3 className="text-sm font-medium text-white">X Layer Mainnet Information</h3>
        </div>

        <p className="text-xs text-[#888888] font-light">
          Shiro operates on X Layer Mainnet (Chain ID: 196). Acquire native OKB for gas and trade directly via OKX DEX.
        </p>

        <div className="space-y-2 pt-2">
          <a
            href="https://www.okx.com/xlayer"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-200 text-black font-medium text-xs flex items-center justify-between transition-all"
          >
            <span>Bridge / Get OKB on OKX</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
