# Summarization Chrome Extension

This Chrome extension allows users to summarize articles directly from web pages. Users can either scrape the entire page or summarize selected text.

## Features

- Summarize the entire page by right-clicking and selecting `SelectedArticle`.
- Summarize selected text by highlighting the text and using the context menu.
- View the full summary in a popup window.
- Caching of results for improved performance
- Asynchronous processing for better scalability

## Installation

1. Clone the repository
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" by clicking the toggle switch in the top right corner.
4. Click "Load unpacked" and select the cloned repository folder.
5. Install the server dependencies by running `pip install -r requirements.txt`.

## Usage

1. Start the server:
    - python -m app.main

2. To summarize the entire page:
   - Right-click on the page.
   - Select `SelectedArticle` from the context menu.

3. To summarize selected text:
   - Highlight the text you want to summarize.
   - Right-click on the highlighted text.
   - Select `SelectedText` from the context menu.

4. To view the full summary:
    - Click on the extension icon in the toolbar.
    - Click on the "Check Result" button.

5. To clear the cache:
    - Click on the extension icon in the toolbar.
    - Click on the "Clear Cache" button.


## Configuration

You can configure the following environment variables:

- `MODEL_NAME`: The name of the summarization model to use
- `HOST`: The host to bind the server to
- `PORT`: The port to run the server on

## Development

1. Make changes to the extension code.
2. Reload the extension in Chrome by navigating to `chrome://extensions/` and clicking the reload button.
3. Restart the server to apply changes.

## API Endpoints

- POST `/summarize`: Summarize an article
- GET `/healthcheck`: Check the health of the service

## License

[MIT License](LICENSE)
