#!/usr/bin/env python
"""Run the Telegram bot"""
import asyncio
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

# Load env before imports
from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / "backend" / ".env")
load_dotenv()

from backend.bot import main

if __name__ == "__main__":
    asyncio.run(main())
