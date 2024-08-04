# app/__init__.py
from fastapi import FastAPI

app = FastAPI()

# Import these after creating the app instance
from .routes import router

# Include the router
app.include_router(router)

# Import these at the end to avoid circular imports
from . import article, summarizer, utils
