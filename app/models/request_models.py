"""
Pydantic models for request validation.
"""

from pydantic import BaseModel


class SummarizeRequest(BaseModel):
    """
    Model for summarization request data.
    """

    url: str = None
    text: str = None
