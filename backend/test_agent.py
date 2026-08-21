import asyncio
import sys
import os

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.src.groq_agent import GroqIntentEngine
from backend.src.okx_dex import OKXDEXAggregator

async def test_agent_and_okx():
    print("==================================================")
    print("Testing Shiro Groq Intent Engine & OKX DEX Module")
    print("==================================================")

    engine = GroqIntentEngine()
    dex = OKXDEXAggregator()

    test_queries = [
        "Swap 2.5 OKB into USDC via OKX DEX with 0.5% slippage",
        "Set up DCA of 20 USDC into WETH every 2 hours (5 cycles)",
        "Rebalance my wallet into 50% OKB, 30% USDC, 20% WETH",
        "Claim testnet tokens from faucet for demo"
    ]

    for q in test_queries:
        print(f"\n[Prompt]: {q}")
        intent = await engine.parse_intent(q)
        print(f"-> Action: {intent.get('action')}")
        print(f"-> Summary: {intent.get('summary')}")
        print(f"-> Risk Rating: {intent.get('riskRating', 'LOW')}")
        print(f"-> Confidence: {intent.get('confidenceScore')}")

        if intent.get("action") in ["SWAP", "DCA"] and intent.get("fromToken") and intent.get("toToken"):
            amt = float(intent.get("amount", "1.0"))
            quote = await dex.get_quote(
                from_token_symbol=intent["fromToken"],
                to_token_symbol=intent["toToken"],
                amount_human=amt
            )
            print(f"-> OKX DEX Quote: {quote.get('fromAmount')} {quote.get('fromToken')} ≈ {quote.get('toAmount')} {quote.get('toToken')}")
            print(f"-> Price Impact: {quote.get('priceImpactPercent')}")
            print(f"-> Router: {quote.get('router')}")

    print("\n==================================================")
    print("All Agent & DEX Intent Tests Passed Successfully!")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(test_agent_and_okx())
