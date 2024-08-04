# Article Summarization Service

This service provides an API for summarizing articles from URLs or plain text using state-of-the-art natural language processing models.

## Features

- Summarize articles from URLs
- Summarize plain text
- Caching of results for improved performance
- Asynchronous processing for better scalability

## Installation

1. Clone the repository
2. Install the required packages:

pip install -r requirements.txt

## Usage

1. Start the server:

python -m app.main

2. Send POST requests to `http://localhost:8000/summarize` with either a `url` or `text` parameter.

## Configuration

You can configure the following environment variables:

- `MODEL_NAME`: The name of the summarization model to use
- `HOST`: The host to bind the server to
- `PORT`: The port to run the server on

## API Endpoints

- POST `/summarize`: Summarize an article
- GET `/healthcheck`: Check the health of the service

## License

[MIT License](LICENSE)
