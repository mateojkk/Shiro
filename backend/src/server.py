import os
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from .groq_agent import GroqIntentEngine
from .okx_dex import OKXDEXAggregator
from .keeper import ShiroKeeperBot

load_dotenv()

# Global Services
groq_engine = GroqIntentEngine()
okx_aggregator = OKXDEXAggregator()
keeper_bot = ShiroKeeperBot()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start background keeper task
    keeper_task = asyncio.create_task(keeper_bot.start_autonomous_loop(interval_seconds=30))
    yield
    keeper_bot.stop()
    keeper_task.cancel()

app = FastAPI(
    title="Shiro Protocol - AI Intent Agent API",
    description="Autonomous Intent-Driven DeFi Execution Engine on X Layer (OKX zkEVM)",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    prompt: str
    userAddress: Optional[str] = None
    chainId: Optional[int] = 1952
    walletBalances: Optional[Dict[str, Any]] = None

class QuoteRequest(BaseModel):
    fromToken: str
    toToken: str
    amount: float
    slippage: Optional[float] = 0.5

class SwapRequest(BaseModel):
    fromTokenAddress: str
    toTokenAddress: str
    amount: int
    userWalletAddress: str
    slippage: Optional[float] = 0.5

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Shiro AI Copilot & Intent Engine",
        "network": "X Layer (Chain ID: 196 / 1952)",
        "llmEngine": f"Groq ({groq_engine.model})",
        "keeperActive": keeper_bot.running
    }

@app.post("/api/chat")
async def process_chat(req: ChatRequest):
    """
    Primary agent endpoint: Parses user prompt with Groq, retrieves OKX DEX route,
    and returns a structured action card with human-readable reasoning.
    """
    user_context = {
        "userAddress": req.userAddress,
        "chainId": req.chainId,
        "balances": req.walletBalances or {"OKB": "5.42", "USDC": "250.0", "WETH": "0.15"}
    }

    try:
        intent = await groq_engine.parse_intent(req.prompt, user_context)
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    quote_data = None
    if intent.get("action") in ["SWAP", "DCA"] and intent.get("fromToken") and intent.get("toToken"):
        try:
            amt = float(intent.get("amount", "1.0"))
            quote_data = await okx_aggregator.get_quote(
                from_token_symbol=intent["fromToken"],
                to_token_symbol=intent["toToken"],
                amount_human=amt,
                slippage_percent=float(intent.get("slippageBps", 50)) / 100.0
            )
        except Exception as e:
            raise HTTPException(status_code=502, detail=str(e))

    response_data = {
        "intent": intent,
        "quote": quote_data,
        "xLayerChainId": req.chainId,
        "recommendedRoute": "OKX DEX Aggregator -> X Layer zkEVM",
        "requiresVaultDeposit": intent.get("action") == "DCA",
        "shareTweetText": f"Just executed an autonomous AI DeFi intent on @XLayerOfficial with Shiro! #XLayer #DeFAI #OKX"
    }

    return {
        "success": True,
        "prompt": req.prompt,
        "data": response_data
    }

@app.post("/api/quote")
async def get_quote(req: QuoteRequest):
    try:
        return await okx_aggregator.get_quote(
            from_token_symbol=req.fromToken,
            to_token_symbol=req.toToken,
            amount_human=req.amount,
            slippage_percent=req.slippage or 0.5
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.post("/api/swap")
async def get_swap(req: SwapRequest):
    try:
        return await okx_aggregator.get_swap(
            from_token_address=req.fromTokenAddress,
            to_token_address=req.toTokenAddress,
            amount_wei=req.amount,
            user_wallet_address=req.userWalletAddress,
            slippage_percent=req.slippage or 0.5
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))

@app.get("/api/keeper/status")
async def get_keeper_status():
    return {
        "running": keeper_bot.running,
        "rpc": keeper_bot.w3.provider.endpoint_uri if hasattr(keeper_bot.w3.provider, 'endpoint_uri') else "Unknown",
        "connected": keeper_bot.w3.is_connected(),
        "dcaContract": keeper_bot.dca_address
    }
