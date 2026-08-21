"use client";

import React from "react";
import { CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";

export interface IntentStep {
  id: string;
  title: string;
  desc: string;
  status: "idle" | "running" | "completed" | "error";
  details?: string;
}

interface IntentVisualizerProps {
  steps: IntentStep[];
  txHash?: string;
  isTestnet?: boolean;
}

export const IntentVisualizer: React.FC<IntentVisualizerProps> = ({
  steps,
  txHash,
  isTestnet = true,
}) => {
  const explorerBase = isTestnet
    ? "https://web3.okx.com/explorer/x-layer-testnet/tx"
    : "https://www.okx.com/web3/explorer/xlayer/tx";

  return (
    <div className="bg-shiro-card border border-shiro-border rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-3 border-b border-shiro-border">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-okx animate-ping"></div>
          <h3 className="text-xs font-medium uppercase tracking-wider text-white">Execution Progress</h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black text-shiro-muted border border-shiro-border">
          X Layer zkEVM
        </span>
      </div>

      {/* Step Progress List */}
      <div className="mt-4 space-y-2.5">
        {steps.map((step, idx) => (
          <div
            key={step.id}
            className={`flex items-start space-x-3 p-3 rounded-xl border transition-all ${
              step.status === "running"
                ? "bg-orange-dark/20 border-orange/40 text-white glow-orange-subtle"
                : step.status === "completed"
                ? "bg-black/60 border-shiro-border text-slate-300"
                : "bg-black/20 border-shiro-border/40 text-shiro-subtle"
            }`}
          >
            <div className="mt-0.5">
              {step.status === "completed" ? (
                <CheckCircle2 className="w-4 h-4 text-okx" />
              ) : step.status === "running" ? (
                <CircleDashed className="w-4 h-4 text-orange animate-spin" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-shiro-subtle flex items-center justify-center text-[10px] text-shiro-subtle font-mono">
                  {idx + 1}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`text-xs font-medium ${step.status === "idle" ? "text-shiro-subtle" : "text-white"}`}>
                  {step.title}
                </span>
                {step.status === "running" && (
                  <span className="text-[10px] font-mono text-orange animate-pulse">
                    Processing...
                  </span>
                )}
              </div>
              <p className="text-[11px] font-light text-shiro-muted mt-0.5">{step.desc}</p>
              {step.details && (
                <div className="mt-1.5 p-1.5 rounded bg-black border border-shiro-border text-[10px] font-mono text-okx break-all">
                  {step.details}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Explorer Receipt Link */}
      {txHash && (
        <div className="mt-4 p-3 rounded-xl bg-okx-dark/40 border border-okx/30 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-okx"></span>
            <span className="text-xs font-mono text-okx font-medium">
              Confirmed on X Layer
            </span>
          </div>
          <a
            href={`${explorerBase}/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-xs font-mono text-white hover:text-okx hover:underline"
          >
            <span>OKLink Receipt</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}
    </div>
  );
};
