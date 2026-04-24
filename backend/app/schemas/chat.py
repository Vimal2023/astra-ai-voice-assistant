"""
app/schemas/chat.py
────────────────────
Pydantic models for the WebSocket / chat domain.
"""

from enum import Enum
from pydantic import BaseModel, Field


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    system = "system"


class ChatMessage(BaseModel):
    role: MessageRole
    content: str


class WSIncomingMessage(BaseModel):
    """
    JSON payload sent *from* the client over the WebSocket.

    Example:
        {"transcript": "What is the best SIP plan for me?", "history": [...]}
    """

    transcript: str = Field(..., min_length=1, description="User's spoken text after STT.")
    history: list[ChatMessage] = Field(
        default_factory=list,
        description="Prior turns to maintain conversation context.",
    )
    system_prompt: str | None = Field(
        None,
        description="Optional override for the system-level instruction.",
    )


class WSOutgoingChunk(BaseModel):
    """
    Each streaming delta sent *to* the client over the WebSocket.

    - type='token'  → incremental text token
    - type='done'   → stream finished; 'content' holds full assembled text
    - type='error'  → something went wrong; 'content' holds the error message
    """

    type: str  # "token" | "done" | "error"
    content: str
