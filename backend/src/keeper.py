import os
import time
import asyncio
import logging
from typing import List, Dict, Any, Optional
from web3 import Web3
from dotenv import load_dotenv
from .okx_dex import OKXDEXAggregator

load_dotenv()
logger = logging.getLogger(__name__)

XLAYER_RPC = os.getenv("XLAYER_RPC", "https://testrpc.xlayer.tech")
KEEPER_PRIVATE_KEY = os.getenv("KEEPER_PRIVATE_KEY")
SHIRO_ROUTER_ADDRESS = os.getenv("SHIRO_ROUTER_ADDRESS")

SHIRO_DCA_ABI = [
    {
        "inputs": [{"internalType": "uint256", "name": "orderId", "type": "uint256"}],
        "name": "isOrderExecutable",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "orderId", "type": "uint256"},
            {"internalType": "uint256", "name": "minToAmount", "type": "uint256"},
            {"internalType": "address", "name": "dexTarget", "type": "address"},
            {"internalType": "bytes", "name": "dexData", "type": "bytes"}
        ],
        "name": "executeDCACycle",
        "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "name": "orders",
        "outputs": [
            {"internalType": "uint256", "name": "id", "type": "uint256"},
            {"internalType": "address", "name": "user", "type": "address"},
            {"internalType": "address", "name": "fromToken", "type": "address"},
            {"internalType": "address", "name": "toToken", "type": "address"},
            {"internalType": "uint256", "name": "amountPerCycle", "type": "uint256"},
            {"internalType": "uint256", "name": "totalCycles", "type": "uint256"},
            {"internalType": "uint256", "name": "executedCycles", "type": "uint256"},
            {"internalType": "uint256", "name": "intervalSeconds", "type": "uint256"},
            {"internalType": "uint256", "name": "nextExecutionTime", "type": "uint256"},
            {"internalType": "uint256", "name": "maxSlippageBps", "type": "uint256"},
            {"internalType": "bool", "name": "isActive", "type": "bool"},
            {"internalType": "bool", "name": "returnToVault", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    }
]

class ShiroKeeperBot:
    def __init__(self, dca_contract_address: Optional[str] = None):
        self.w3 = Web3(Web3.HTTPProvider(XLAYER_RPC))
        self.dca_address = dca_contract_address or os.getenv("SHIRO_DCA_ADDRESS")
        self.account = self.w3.eth.account.from_key(KEEPER_PRIVATE_KEY) if KEEPER_PRIVATE_KEY else None
        self.okx = OKXDEXAggregator()
        self.running = False

        if self.w3.is_connected():
            logger.info(f"Keeper connected to X Layer RPC: {XLAYER_RPC}")
        else:
            logger.warning(f"Could not connect to X Layer RPC: {XLAYER_RPC}.")

    async def scan_and_execute_orders(self, max_order_id: int = 50) -> List[Dict[str, Any]]:
        """
        Scans registered DCA orders on X Layer and triggers execution for eligible schedules.
        """
        results = []
        if not self.w3.is_connected():
            raise RuntimeError("Keeper cannot connect to X Layer RPC")
        if not self.dca_address:
            raise RuntimeError("SHIRO_DCA_ADDRESS is required")
        if not self.account:
            raise RuntimeError("KEEPER_PRIVATE_KEY is required")
        if not SHIRO_ROUTER_ADDRESS:
            raise RuntimeError("SHIRO_ROUTER_ADDRESS is required")

        try:
            dca_contract = self.w3.eth.contract(address=self.dca_address, abi=SHIRO_DCA_ABI)
            for order_id in range(max_order_id):
                try:
                    is_executable = dca_contract.functions.isOrderExecutable(order_id).call()
                    if is_executable:
                        order = dca_contract.functions.orders(order_id).call()
                        from_token = order[2]
                        to_token = order[3]
                        amount_per_cycle = int(order[4])
                        swap = await self.okx.get_swap(
                            from_token_address=from_token,
                            to_token_address=to_token,
                            amount_wei=amount_per_cycle,
                            user_wallet_address=SHIRO_ROUTER_ADDRESS,
                            slippage_percent=0.5,
                        )
                        to_token_amount = int(swap.get("routerResult", {}).get("toTokenAmount") or 0)
                        min_to_amount = max((to_token_amount * 9950) // 10000, 1)
                        dex_target = swap["tx"]["to"]
                        dex_data = bytes.fromhex(swap["tx"]["data"].removeprefix("0x"))

                        logger.info(f"Order #{order_id} is due for execution. Submitting trigger tx...")
                        tx = dca_contract.functions.executeDCACycle(
                            order_id,
                            min_to_amount,
                            dex_target,
                            dex_data
                        ).build_transaction({
                            'from': self.account.address,
                            'nonce': self.w3.eth.get_transaction_count(self.account.address),
                            'gas': 300000,
                            'gasPrice': self.w3.eth.gas_price
                        })
                        signed_tx = self.w3.eth.account.sign_transaction(tx, private_key=KEEPER_PRIVATE_KEY)
                        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.rawTransaction)
                        logger.info(f"Trigger tx submitted: {tx_hash.hex()}")
                        results.append({
                            "orderId": order_id,
                            "txHash": tx_hash.hex(),
                            "status": "EXECUTED"
                        })
                except Exception as e:
                    # Order might not exist yet, break loop
                    break
        except Exception as e:
            logger.error(f"Error scanning DCA orders: {e}")

        return results

    async def start_autonomous_loop(self, interval_seconds: int = 15):
        """
        Runs the continuous background keeper loop.
        """
        self.running = True
        logger.info("Shiro Autonomous Keeper Loop started.")
        while self.running:
            try:
                await self.scan_and_execute_orders()
            except Exception as e:
                logger.error(f"Keeper loop error: {e}")
            await asyncio.sleep(interval_seconds)

    def stop(self):
        self.running = False
