import os
import json
import logging
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

# Known X Layer Token Addresses (Mainnet)
XLAYER_TOKENS = {
    "OKB": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    "WOKB": "0xe538905cf8410324e03A5A23C1c177a474D59b2b",
    "USDC": "0x74b7f16337b8972027f6196a17a631ac6de26d22",
    "USDT": "0x1E4a5963aBFD975d8c9021ce480b42188849D41d",
    "WETH": "0x5a77f1443d16ee5761d310e38b62f77f726bc71c",
}

INTENT_SYSTEM_PROMPT = """You are Shiro, an elite autonomous AI DeFi copilot on X Layer (OKX's zkEVM Layer 2 network).
Your mission is to understand user DeFi requests in natural language, perform risk and route analysis, and convert the prompt into a precise, structured onchain intent payload.

X Layer Context:
- Native Gas Token: OKB
- Chain ID: 196 (Mainnet), 1952 (Testnet)
- DEX Aggregator: OKX DEX Aggregator (`chainIndex: 196`) and QuickSwap V3
- Supported Tokens: OKB (0xEeeee...), WOKB, USDC, USDT, WETH.

Action Types:
1. "SWAP": Instant single or multi-hop token swap via OKX DEX.
2. "DCA": Automated recurring Dollar-Cost Averaging orders (interval, amount per cycle, total cycles).
3. "LIMIT_ORDER": Conditional limit buy/sell when a target price is reached.
4. "REBALANCE": Multi-asset portfolio rebalancing.
5. "PORTFOLIO_AUDIT": Analyze user's current holdings, risk exposure, and gas efficiency.
6. "FAUCET": Request testnet tokens for testing.
7. "CHAT": General DeFi / market intelligence query or explanation.

You MUST respond strictly in valid JSON matching the following schema:
{
  "action": "SWAP" | "DCA" | "LIMIT_ORDER" | "REBALANCE" | "PORTFOLIO_AUDIT" | "FAUCET" | "CHAT",
  "summary": "Concise human-readable explanation of the plan",
  "fromToken": "Symbol or Address (e.g. OKB, USDC)",
  "toToken": "Symbol or Address (e.g. USDC, WETH)",
  "amount": "Numeric string (e.g. '10.5')",
  "intervalSeconds": integer (for DCA, e.g. 3600 for 1h, 86400 for 1 day),
  "totalCycles": integer (for DCA, e.g. 5),
  "triggerPrice": "Numeric string (for limit orders)",
  "slippageBps": integer (default 50 for 0.5%),
  "estimatedGasOKB": "0.0002",
  "riskRating": "LOW" | "MEDIUM" | "HIGH",
  "confidenceScore": float (0.0 to 1.0),
  "safetyWarnings": ["List of any potential risks, low liquidity warnings, or slippage advice"]
}
"""

class GroqIntentEngine:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        self.client = None
        
        if self.api_key:
            try:
                from groq import Groq
                self.client = Groq(api_key=self.api_key)
                logger.info(f"Groq client initialized with model: {self.model}")
            except Exception as e:
                logger.warning(f"Could not initialize Groq SDK: {e}")

    async def parse_intent(self, user_prompt: str, user_context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Parses user prompt into structured DeFi intent using Groq LPU inference.
        """
        if not self.client:
            raise RuntimeError("GROQ_API_KEY is required for live intent parsing")

        context_str = ""
        if user_context:
            context_str = f"\nUser Context: {json.dumps(user_context)}"

        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": INTENT_SYSTEM_PROMPT},
                {"role": "user", "content": f"User Request: {user_prompt}{context_str}"}
            ],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1024,
        )

        content = response.choices[0].message.content
        if not content:
            raise RuntimeError("Groq response did not include an intent payload")

        parsed_json = json.loads(content)
        parsed_json["engine"] = f"Groq ({self.model})"
        return parsed_json
