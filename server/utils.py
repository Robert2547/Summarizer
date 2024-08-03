# utils.py
import asyncio
import hashlib

def get_cache_key(data):
    if "url" in data:
        return f"url_{data['url']}"
    elif "text" in data:
        return f"text_{hashlib.md5(data['text'].encode()).hexdigest()}"
    else:
        return None

def run_async(coro):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    return loop.run_until_complete(coro)