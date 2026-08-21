import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    framework: "Next.js 14",
    network: "X Layer Mainnet (Chain ID: 196)",
    chainId: 196,
    llmEngine: "Groq LPU Inference (Llama-3.3-70B / OSS-20B)",
    dexAggregator: "QuickSwap V3 & OKX DEX Aggregator",
    wrappedOKB: "Canonical WOKB Contract (0xe538905cf8410324e03A5A23C1c177a474D59b2b)",
    timestamp: new Date().toISOString(),
  });
}
