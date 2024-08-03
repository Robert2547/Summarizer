from bs4 import BeautifulSoup
import time, asyncio, aiohttp
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM


# Asynchronous function to fetch the article content
async def fetch_article_content(url):
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()


def extract_article_content(html_content):
    soup = BeautifulSoup(html_content, "html.parser")
    # This is a more robust extraction. You might need to adjust it based on the structure of the websites you're targeting.
    article = soup.find("article") or soup.find("div", class_="article-content")

    if article:
        # Extract all text from paragraphs and headers
        content = []
        for element in article.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6"]):
            content.append(element.get_text().strip())
        return " ".join(content)
    else:
        # If no article is found, try to extract text from the body
        body = soup.find("body")
        if body:
            content = []
            for element in body.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6"]):
                content.append(element.get_text().strip())
            return " ".join(content)
        else:
            # If all else fails, return all visible text
            return " ".join(soup.stripped_strings)


def get_summary_length(text_length):
    return min(int(text_length * 0.35), 1024), max(int(text_length * 0.1), 5)


def split_text(article_content, max_tokens=800, overlap=100):
    if isinstance(article_content, str):
        # If article_content is a string, split it into paragraphs
        paragraphs = article_content.split("\n")
    else:
        # If it's a BeautifulSoup object, find all paragraph and header tags
        paragraphs = article_content.find_all(["p", "h1", "h2", "h3", "h4", "h5", "h6"])

    chunks = []
    current_chunk = ""
    current_tokens = 0

    for paragraph in paragraphs:
        if isinstance(paragraph, str):
            paragraph_text = paragraph.strip()
        else:
            paragraph_text = paragraph.get_text(strip=True)

        paragraph_tokens = len(paragraph_text.split())

        if current_tokens + paragraph_tokens <= max_tokens:
            current_chunk += f"{paragraph_text} "
            current_tokens += paragraph_tokens
        else:
            if current_chunk:  # Only append if there's content
                chunks.append(current_chunk.strip())
            overlap_text = " ".join(current_chunk.split()[-overlap:])
            current_chunk = f"{overlap_text} {paragraph_text} "
            current_tokens = len(current_chunk.split())

    if current_chunk:
        chunks.append(current_chunk.strip())

    return chunks


def summarize_chunk(chunk, tokenizer, summarizer):
    chunk_length = len(chunk.split())
    max_length, min_length = get_summary_length(chunk_length)
    inputs = tokenizer(
        chunk, max_length=max_length, return_tensors="pt", truncation=True
    )
    summary_id = summarizer.generate(**inputs)
    summary = tokenizer.decode(summary_id[0], skip_special_tokens=True)
    return summary

## Streaming Processing
async def produce_chunks(queue, article_content):
    chunks = split_text(article_content=article_content, max_tokens=500, overlap=50)
    for i, chunk in enumerate(chunks):
        await queue.put(chunk)
    await queue.put(None)


async def consume_chunks(queue, tokenizer, summarizer):
    summaries = []
    chunk_count = 0
    while True:
        chunk = await queue.get()
        if chunk is None:
            break
        chunk_count += 1
        summary = summarize_chunk(chunk, tokenizer, summarizer)
        summaries.append(summary)
        queue.task_done()
    return summaries


async def summarizeNLP(content, tokenizer, summarizer):
    async with aiohttp.ClientSession() as session:
        start = time.perf_counter()
        chunk_queue = asyncio.Queue(maxsize=10)

        # Ensure content is a string if it's not already
        if not isinstance(content, str):
            content = str(content)

        producer = asyncio.create_task(produce_chunks(chunk_queue, content))
        consumer = asyncio.create_task(
            consume_chunks(chunk_queue, tokenizer, summarizer)
        )

        await producer
        summaries = await consumer

        full_summary = " ".join(summaries)
        print(f"Summarized in {round(time.perf_counter() - start, 2)} seconds")
        print("Full Summary:", full_summary)
        return full_summary
