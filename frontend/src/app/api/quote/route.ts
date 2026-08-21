import { NextRequest, NextResponse } from "next/server";
import { parseUnits } from "viem";
import { okxGet } from "@/lib/okx";

const XLAYER_CHAIN_INDEX = "196";

const TOKEN_PRICES: Record<string, { address: string; decimals: number; price: number }> = {
  OKB: { address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", decimals: 18, price: 48.5 },
  WOKB: { address: "0xe538905cf8410324e03A5A23C1c177a474D59b2b", decimals: 18, price: 48.5 },
  USDC: { address: "0x74b7f16337b8972027f6196a17a631ac6de26d22", decimals: 6, price: 1.0 },
  USDT: { address: "0x1E4a5963aBFD975d8c9021ce480b42188849D41d", decimals: 6, price: 1.0 },
  WETH: { address: "0x5a77f1443d16ee5761d310e38b62f77f726bc71c", decimals: 18, price: 2650.0 },
};

export async function POST(req: NextRequest) {
  try {
    const { fromToken, toToken, amount, slippage = 0.5 } = await req.json();

    const fromMeta = TOKEN_PRICES[fromToken?.toUpperCase()] || { address: fromToken, decimals: 18, price: 1.0 };
    const toMeta = TOKEN_PRICES[toToken?.toUpperCase()] || { address: toToken, decimals: 18, price: 1.0 };

    const amountNum = parseFloat(amount || "1.0");
    const amountWei = parseUnits(String(amount || "1.0"), fromMeta.decimals).toString();

    const [q] = await okxGet("/api/v6/dex/aggregator/quote", {
      chainIndex: XLAYER_CHAIN_INDEX,
      amount: amountWei,
      fromTokenAddress: fromMeta.address,
      toTokenAddress: toMeta.address,
      slippagePercent: String(slippage),
    });

    const toTokenAmount = q.toTokenAmount || q.routerResult?.toTokenAmount || "0";
    return NextResponse.json({
      success: true,
      isLive: true,
      source: "OKX DEX Aggregator API (Live)",
      fromToken: fromToken.toUpperCase(),
      toToken: toToken.toUpperCase(),
      fromAmount: amountNum,
      toAmount: Number(toTokenAmount) / Math.pow(10, toMeta.decimals),
      toTokenAmount,
      priceImpactPercent: q.priceImpactPercent || q.routerResult?.priceImpactPercent,
      router: q.dexRouterList || q.routerResult?.dexRouterList,
      gasEstimateOKB: q.estimateGasFee || q.tx?.gas,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch quote" },
      { status: 500 }
    );
  }
}
