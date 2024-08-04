"""
Utility functions for the summarization service.
"""

import asyncio
import hashlib
from typing import Dict, Optional


def get_cache_key(data: Dict[str, str]) -> Optional[str]:
    """
    Generate a cache key based on the input data.
    """
    if "url" in data:
        return f"url_{data['url']}"
    elif "text" in data:
        return f"text_{hashlib.md5(data['text'].encode()).hexdigest()}"
    else:
        return None


def run_async(coro):
    """
    Run an asynchronous coroutine in a synchronous context.
    """
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)
