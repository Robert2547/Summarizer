# config.py
import os

MODEL_NAME = os.getenv("MODEL_NAME", "sshleifer/distilbart-cnn-12-6")
HOST = os.getenv("HOST", "127.0.0.1")
PORT = int(os.getenv("PORT", 8000))