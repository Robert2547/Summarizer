"""
Module for text summarization using transformers.
"""

from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
import time
import asyncio
from typing import List, Tuple

from .config import MODEL_NAME

def load_model() -> Tuple[AutoTokenizer, AutoModelForSeq2SeqLM]:
    """
    Load the tokenizer and summarizer model.
    """
    start = time.perf_counter()
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    summarizer = AutoModelForSeq2SeqLM.from_pretrained(MODEL_NAME)
    print(f"Model loaded in {time.perf_counter()-start:.2f} seconds")
    return tokenizer, summarizer


def get_summary_length(text_length: int) -> Tuple[int, int]:
    """
    Calculate the appropriate summary length based on the input text length.
    """
    return min(int(text_length * 0.35), 1024), max(int(text_length * 0.1), 5)


def split_text(
    article_content: str, max_tokens: int = 800, overlap: int = 100
) -> List[str]:
    """
    Split the input text into chunks for processing.
    """
    paragraphs = article_content.split("\n")
    chunks = []
    current_chunk = ""
    current_tokens = 0

    for paragraph in paragraphs:
        paragraph_text = paragraph.strip()
        paragraph_tokens = len(paragraph_text.split())

        if current_tokens + paragraph_tokens <= max_tokens:
            current_chunk += f"{paragraph_text} "
            current_tokens += paragraph_tokens
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            overlap_text = " ".join(current_chunk.split()[-overlap:])
            current_chunk = f"{overlap_text} {paragraph_text} "
            current_tokens = len(current_chunk.split())

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def summarize_chunk(
    chunk: str, tokenizer: AutoTokenizer, summarizer: AutoModelForSeq2SeqLM
) -> str:
    """
    Summarize a single chunk of text.
    """
    chunk_length = len(chunk.split())
    max_length, min_length = get_summary_length(chunk_length)
    inputs = tokenizer(
        chunk, max_length=max_length, return_tensors="pt", truncation=True
    )
    summary_id = summarizer.generate(**inputs)
    summary = tokenizer.decode(summary_id[0], skip_special_tokens=True)
    return summary


async def produce_chunks(queue: asyncio.Queue, article_content: str):
    """
    Produce chunks of text and put them in the queue.
    """
    chunks = split_text(article_content=article_content, max_tokens=500, overlap=50)
    for chunk in chunks:
        await queue.put(chunk)
    await queue.put(None)


async def consume_chunks(
    queue: asyncio.Queue, tokenizer: AutoTokenizer, summarizer: AutoModelForSeq2SeqLM
) -> List[str]:
    """
    Consume chunks from the queue and summarize them.
    """
    summaries = []
    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        summary = summarize_chunk(chunk, tokenizer, summarizer)
        summaries.append(summary)
        queue.task_done()
    return summaries


async def summarize_content(
    content: str, tokenizer: AutoTokenizer, summarizer: AutoModelForSeq2SeqLM
) -> str:
    """
    Summarize the given content using the loaded model.
    """
    start = time.perf_counter()
    chunk_queue = asyncio.Queue(maxsize=10)

    producer = asyncio.create_task(produce_chunks(chunk_queue, content))
    consumer = asyncio.create_task(consume_chunks(chunk_queue, tokenizer, summarizer))

    await producer
    summaries = await consumer

    full_summary = " ".join(summaries)
    print(f"Summarized in {round(time.perf_counter() - start, 2)} seconds")
    return full_summary
