from flask import Flask, make_response, request, jsonify
from flask_cors import CORS
import time, logging, hashlib
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from article import summarizeNLP, fetch_article_content, extract_article_content
import validators, uvicorn
from flask_caching import Cache
from asgiref.wsgi import WsgiToAsgi
from concurrent.futures import ThreadPoolExecutor
import asyncio
from config import MODEL_NAME, HOST, PORT
from utils import get_cache_key, run_async


# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
asgi_app = WsgiToAsgi(app)
CORS(app, resources={r"/summarize": {"origins": "*"}})

# Configure the cache
cache = Cache(app, config={"CACHE_TYPE": "simple"})

# Load model
start = time.perf_counter()
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
summarizer = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
logger.info(f"Model loaded in process in {time.perf_counter()-start:.2f} seconds")

# Thread pool for blocking operations
executor = ThreadPoolExecutor(max_workers=5)


def get_content(data):
    if data.get("url"):
        url = data.get("url")
        if not validators.url(url):
            raise ValueError("Invalid URL")
        html_content = run_async(fetch_article_content(url))
        content = extract_article_content(html_content)
        if not content.strip():
            raise ValueError("Failed to extract content from URL")
    elif data.get("text"):
        content = data.get("text")
    else:
        raise ValueError("Neither URL nor text provided")
    return content


@app.route("/summarize", methods=["POST"])
def summarize():
    start_time = time.perf_counter()
    logger.info(f"Request received at {start_time:.2f} seconds")

    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400

    cache_key = get_cache_key(data)
    if not cache_key:
        return jsonify({"error": "Invalid data format"}), 400

    # Check cache
    cached_result = cache.get(cache_key)
    if cached_result:
        logger.info(f"Cache hit for {cache_key}")
        response = make_response(jsonify(cached_result))
        response.headers["X-Cache"] = "HIT"
        return response

    logger.info(f"Cache miss for {cache_key}")

    try:
        content = get_content(data)
        if not content:
            return jsonify({"error": "Failed to extract content"}), 400

        # Run summarization
        summary = run_async(summarizeNLP(content, tokenizer, summarizer))

        finish_time = time.perf_counter()
        logger.info(f"Summarization finished in {finish_time-start_time:.2f} seconds")

        response = make_response(jsonify({"summary": summary}))
        response.headers["X-Cache"] = "MISS"

        # Cache the result
        cache.set(cache_key, {"summary": summary}, timeout=86400)  # Cache for 24 hours

        return response
    except Exception as e:
        logger.error(f"Error during summarization: {str(e)}")
        return jsonify({"error": "Failed to summarize content"}), 500


@app.route("/healthcheck", methods=["GET"])
def healthcheck():
    return jsonify(status="ok")


if __name__ == "__main__":
    uvicorn.run(asgi_app, host="0.0.0.0", port=8000)
