import os
import httpx
import logging
import base64
import hashlib
import hmac
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Token Decimals & Addresses on X Layer Mainnet
XLAYER_CHAIN_INDEX = "196"
TOKEN_METADATA = {
    "OKB": {"address": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", "decimals": 18, "price": 48.5},
    "WOKB": {"address": "0xe538905cf8410324e03A5A23C1c177a474D59b2b", "decimals": 18, "price": 48.5},
    "USDC": {"address": "0x74b7f16337b8972027f6196a17a631ac6de26d22", "decimals": 6, "price": 1.0},
    "USDT": {"address": "0x1E4a5963aBFD975d8c9021ce480b42188849D41d", "decimals": 6, "price": 1.0},
    "WETH": {"address": "0x5a77f1443d16ee5761d310e38b62f77f726bc71c", "decimals": 18, "price": 2650.0},
}

class OKXDEXAggregator:
    def __init__(self, api_key: Optional[str] = None, secret_key: Optional[str] = None, passphrase: Optional[str] = None):
        self.api_key = api_key or os.getenv("OKX_API_KEY")
        self.secret_key = secret_key or os.getenv("OKX_SECRET_KEY")
        self.passphrase = passphrase or os.getenv("OKX_PASSPHRASE")
        self.base_url = "https://www.okx.com"

    def _headers(self, method: str, request_path: str, query_string: str = "") -> Dict[str, str]:
        if not self.api_key or not self.secret_key or not self.passphrase:
            raise RuntimeError("OKX_API_KEY, OKX_SECRET_KEY, and OKX_PASSPHRASE are required")

        timestamp = __import__("datetime").datetime.utcnow().isoformat(timespec="milliseconds") + "Z"
        prehash = f"{timestamp}{method}{request_path}{query_string}"
        signature = base64.b64encode(
            hmac.new(self.secret_key.encode(), prehash.encode(), hashlib.sha256).digest()
        ).decode()
        return {
            "OK-ACCESS-KEY": self.api_key,
            "OK-ACCESS-SIGN": signature,
            "OK-ACCESS-TIMESTAMP": timestamp,
            "OK-ACCESS-PASSPHRASE": self.passphrase,
        }

    async def _get(self, path: str, params: Dict[str, str]) -> Any:
        query_string = "?" + str(httpx.QueryParams(params))
        headers = self._headers("GET", path, query_string)

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{self.base_url}{path}{query_string}", headers=headers)

        if resp.status_code != 200:
            raise RuntimeError(f"OKX DEX API request failed with status {resp.status_code}")

        data = resp.json()
        if data.get("code") != "0" or not data.get("data"):
            raise RuntimeError(data.get("msg") or "OKX DEX API did not return data")
        return data["data"]

    async def get_quote(
        self,
        from_token_symbol: str,
        to_token_symbol: str,
        amount_human: float,
        slippage_percent: float = 0.5
    ) -> Dict[str, Any]:
        """
        Fetches best swap route and estimated output from OKX DEX Aggregator on X Layer.
        """
        from_meta = TOKEN_METADATA.get(from_token_symbol.upper(), {"address": from_token_symbol, "decimals": 18, "price": 1.0})
        to_meta = TOKEN_METADATA.get(to_token_symbol.upper(), {"address": to_token_symbol, "decimals": 18, "price": 1.0})

        # Calculate smallest unit amount
        amount_wei = int(amount_human * (10 ** from_meta["decimals"]))

        params = {
            "chainIndex": XLAYER_CHAIN_INDEX,
            "amount": str(amount_wei),
            "fromTokenAddress": from_meta["address"],
            "toTokenAddress": to_meta["address"],
            "slippagePercent": str(slippage_percent),
        }
        quote_info = (await self._get("/api/v6/dex/aggregator/quote", params))[0]
        to_token_amount = quote_info.get("toTokenAmount") or quote_info.get("routerResult", {}).get("toTokenAmount", "0")

        return {
            "success": True,
            "source": "OKX DEX Aggregator API (Live)",
            "fromToken": from_token_symbol,
            "toToken": to_token_symbol,
            "fromAmount": amount_human,
            "toAmount": float(to_token_amount) / (10 ** to_meta["decimals"]),
            "toTokenAmount": to_token_amount,
            "priceImpactPercent": quote_info.get("priceImpactPercent") or quote_info.get("routerResult", {}).get("priceImpactPercent"),
            "router": quote_info.get("dexRouterList") or quote_info.get("routerResult", {}).get("dexRouterList"),
            "gasEstimateOKB": quote_info.get("estimateGasFee") or quote_info.get("tx", {}).get("gas"),
        }

    async def get_swap(
        self,
        from_token_address: str,
        to_token_address: str,
        amount_wei: int,
        user_wallet_address: str,
        slippage_percent: float = 0.5,
    ) -> Dict[str, Any]:
        params = {
            "chainIndex": XLAYER_CHAIN_INDEX,
            "amount": str(amount_wei),
            "fromTokenAddress": from_token_address,
            "toTokenAddress": to_token_address,
            "slippagePercent": str(slippage_percent),
            "userWalletAddress": user_wallet_address,
            "swapMode": "exactIn",
        }
        swap = (await self._get("/api/v6/dex/aggregator/swap", params))[0]
        tx = swap.get("tx") or {}
        router_result = swap.get("routerResult") or {}
        if not tx.get("to") or not tx.get("data"):
            raise RuntimeError("OKX swap response did not include executable calldata")
        return {
            "success": True,
            "source": "OKX DEX Aggregator API (Live Swap)",
            "tx": tx,
            "routerResult": router_result,
        }
