"use client";

import React, { useState } from "react";
import { Clock, Repeat, Play } from "lucide-react";

export interface DCAItem {
  id: number;
  fromToken: string;
  toToken: string;
  amountPerCycle: string;
  executedCycles: number;
  totalCycles: number;
  intervalFormatted: string;
  nextRunInSeconds: number;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
}

export const DCAPanel: React.FC = () => {
  const [orders, setOrders] = useState<DCAItem[]>([
    {
      id: 0,
      fromToken: "USDC",
      toToken: "WETH",
      amountPerCycle: "10.0",
      executedCycles: 2,
      totalCycles: 5,
      intervalFormatted: "1 hour",
      nextRunInSeconds: 1420,
      status: "ACTIVE",
    },
    {
      id: 1,
      fromToken: "OKB",
      toToken: "USDC",
      amountPerCycle: "1.5",
      executedCycles: 4,
      totalCycles: 4,
      intervalFormatted: "12 hours",
      nextRunInSeconds: 0,
      status: "COMPLETED",
    },
  ]);

  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  const handleManualTrigger = async (orderId: number) => {
    setTriggeringId(orderId);
    setTimeout(() => {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId
            ? {
                ...o,
                executedCycles: Math.min(o.executedCycles + 1, o.totalCycles),
                status: o.executedCycles + 1 >= o.totalCycles ? "COMPLETED" : "ACTIVE",
              }
            : o
        )
      );
      setTriggeringId(null);
    }, 1200);
  };

  const handleCancel = (orderId: number) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: "CANCELLED" } : o))
    );
  };

  return (
    <div className="bg-shiro-card border border-shiro-border rounded-2xl p-5 shadow-xl">
      <div className="flex items-center justify-between pb-4 border-b border-shiro-border">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-black border border-shiro-border text-okx">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-medium uppercase tracking-wider text-white">Recurring DCA</h3>
            <p className="text-[11px] text-shiro-muted font-light">Automated on X Layer zkEVM</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-okx-dark text-okx border border-okx/30 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-okx animate-pulse"></span> Active
        </span>
      </div>

      {/* DCA Orders List */}
      <div className="mt-4 space-y-3">
        {orders.map((order) => {
          const progressPercent = Math.round((order.executedCycles / order.totalCycles) * 100);

          return (
            <div
              key={order.id}
              className="bg-black border border-shiro-border rounded-xl p-3.5 space-y-2.5 transition-all hover:border-shiro-borderHover"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-medium text-white">
                    #{order.id} {order.amountPerCycle} {order.fromToken} → {order.toToken}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-shiro-card border border-shiro-border text-shiro-muted">
                    {order.intervalFormatted}
                  </span>
                </div>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    order.status === "ACTIVE"
                      ? "bg-okx-dark text-okx border-okx/30"
                      : order.status === "COMPLETED"
                      ? "bg-shiro-card text-white border-shiro-border"
                      : "bg-shiro-card text-shiro-subtle border-shiro-border"
                  }`}
                >
                  {order.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-[11px] font-mono text-shiro-muted mb-1">
                  <span>
                    Cycle {order.executedCycles} of {order.totalCycles}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-1.5 bg-shiro-card rounded-full overflow-hidden">
                  <div
                    className="h-full bg-okx transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* Action Controls */}
              {order.status === "ACTIVE" && (
                <div className="pt-1 flex items-center justify-between text-xs font-mono">
                  <span className="text-[11px] text-shiro-subtle flex items-center gap-1">
                    <Clock className="w-3 h-3 text-shiro-muted" /> Next in ~{Math.floor(order.nextRunInSeconds / 60)}m
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleManualTrigger(order.id)}
                      disabled={triggeringId === order.id}
                      className="px-2.5 py-1 rounded-lg bg-shiro-card hover:bg-shiro-cardHover text-okx border border-shiro-border text-[10px] flex items-center gap-1 transition-all"
                    >
                      <Play className="w-2.5 h-2.5 fill-okx" />
                      <span>{triggeringId === order.id ? "Triggering..." : "Trigger"}</span>
                    </button>
                    <button
                      onClick={() => handleCancel(order.id)}
                      className="px-2.5 py-1 rounded-lg bg-shiro-card hover:bg-rose-950/40 text-shiro-muted hover:text-rose-400 border border-shiro-border text-[10px] transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
