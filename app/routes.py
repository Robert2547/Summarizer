# app/routes.py
from fastapi import APIRouter, HTTPException, Request
from cachetools import TTLCache
import time
import logging

from .models.request_models import SummarizeRequest
from .article import get_content
from .summarizer import load_model, summarize_content
from .utils import get_cache_key

router = APIRouter()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load model
tokenizer, summarizer = load_model()

# Setup cache
cache = TTLCache(maxsize=100, ttl=86400)  # Cache for 24 hours


@router.post("/summarize")
async def summarize(request: Request, data: SummarizeRequest):
    start_time = time.perf_counter()

    cache_key = get_cache_key(data.dict())
    if cache_key in cache:
        logger.info(f"Cache hit for {cache_key}")
        return {"summary": cache[cache_key]}

    try:
        content = await get_content(data)
        if not content:
            raise HTTPException(status_code=400, detail="Failed to extract content")

        # Run summarization
        summary = await summarize_content(content, tokenizer, summarizer)

        finish_time = time.perf_counter()
        logger.info(f"Summarization finished in {finish_time-start_time:.2f} seconds")

        # Cache the result
        cache[cache_key] = summary

        return {"summary": summary}
    except Exception as e:
        logger.error(f"Error during summarization: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to summarize content")


@router.get("/healthcheck")
async def healthcheck():
    return {"status": "ok"}
