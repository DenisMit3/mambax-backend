try:
    from web3 import Web3
    from web3.exceptions import ContractLogicError
    WEB3_AVAILABLE = True
except ImportError:
    WEB3_AVAILABLE = False
    class Web3:
        class HTTPProvider:
            def __init__(self, *args): pass
        def __init__(self, *args): pass
        def is_connected(self): return False

import logging
from typing import Dict, Any, Optional
import os
from backend.config.settings import settings

logger = logging.getLogger(__name__)

class Web3Client:
    """
    Service for interacting with EVM Blockchains (Ethereum, Polygon, BSC).
    Handles wallet verification, NFT balance checks, and token gating.
    """
    
    # Public RPC Endpoints (Fallbacks)
    CHAINS = {
        "ethereum": "https://eth.llamarpc.com",
        "polygon": "https://polygon-rpc.com",
        "bsc": "https://binance.llamarpc.com"
    }

    def __init__(self):
        if not WEB3_AVAILABLE:
            logger.warning("Web3 library not installed. Blockchain features disabled.")
            self.w3 = Web3() # Mock
            self.provider_url = "None"
            return

        # Allow override from env settings
        self.provider_url = os.getenv("WEB3_PROVIDER_URI", self.CHAINS["ethereum"])
        self.w3 = Web3(Web3.HTTPProvider(self.provider_url))
        
        if self.w3.is_connected():
            logger.info(f"Connected to Blockchain Node: {self.provider_url}")
        else:
            logger.warning("Failed to connect to Blockchain Node. Web3 features will be limited.")

    async def get_wallet_balance(self, address: str) -> float:
        """Get Native Token Balance (ETH/MATIC) in standard units."""
        if not self.w3.is_connected():
            return 0.0
            
        try:
            if not self.w3.is_address(address):
                return 0.0
                
            checksum_address = self.w3.to_checksum_address(address)
            wei_balance = self.w3.eth.get_balance(checksum_address)
            return float(self.w3.from_wei(wei_balance, 'ether'))
        except Exception as e:
            logger.error(f"Web3 Balance Error: {e}")
            return 0.0

    async def verify_nft_ownership(self, user_address: str, contract_address: str) -> bool:
        """
        Check if user owns at least 1 NFT from collection (ERC-721 standard).
        Ultralight check without full ABI using 'balanceOf'.
        """
        if not self.w3.is_connected():
            return False

        try:
            user_address = self.w3.to_checksum_address(user_address)
            contract_address = self.w3.to_checksum_address(contract_address)
            
            # Minimal ABI for balanceOf
            abi = '[{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"}]'
            
            contract = self.w3.eth.contract(address=contract_address, abi=abi)
            balance = contract.functions.balanceOf(user_address).call()
            
            return balance > 0
            
        except Exception as e:
            logger.error(f"NFT Verification Error: {e}")
            return False

    async def get_latest_block(self) -> int:
        """Get current block number (Health check)."""
        try:
            return self.w3.eth.block_number
        except:
            return 0

web3_client = Web3Client()
