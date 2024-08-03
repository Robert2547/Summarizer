from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import time, logging, hashlib
from article import summarizeNLP, fetch_article_content, extract_article_content
import validators
from cachetools import TTLCache
import asyncio
from config import MODEL_NAME, HOST, PORT
from utils import get_cache_key

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model
start = time.perf_counter()
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
summarizer = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
logger.info(f"Model loaded in process in {time.perf_counter()-start:.2f} seconds")

# Setup cache
cache = TTLCache(maxsize=100, ttl=86400)  # Cache for 24 hours


class SummarizeRequest(BaseModel):
    url: str = None
    text: str = None


async def get_content(data: SummarizeRequest):
    if data.url:
        if not validators.url(data.url):
            raise HTTPException(status_code=400, detail="Invalid URL")
        html_content = await fetch_article_content(data.url)
        content = extract_article_content(html_content)
        if not content.strip():
            raise HTTPException(
                status_code=400, detail="Failed to extract content from URL"
            )
    elif data.text:
        content = data.text
    else:
        raise HTTPException(status_code=400, detail="Neither URL nor text provided")
    return content


@app.post("/summarize")
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
        summary = await summarizeNLP(content, tokenizer, summarizer)

        finish_time = time.perf_counter()
        logger.info(f"Summarization finished in {finish_time-start_time:.2f} seconds")

        # Cache the result
        cache[cache_key] = summary

        return {"summary": summary}
    except Exception as e:
        logger.error(f"Error during summarization: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to summarize content")


@app.get("/healthcheck")
async def healthcheck():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host=HOST, port=PORT)
