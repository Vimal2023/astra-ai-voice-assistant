"""
app/services/groq_service.py
─────────────────────────────
Handles all Groq API interactions.

Key design decisions:
  • `stream_chat_response` is an *async generator* — it yields individual text
    tokens as they arrive from the Groq streaming API so the WebSocket route
    can forward each chunk to the client with minimal latency.
  • The Groq client is instantiated once (module-level singleton) and reused
    across all WebSocket sessions (it is thread-/coroutine-safe).
  • Conversation history is passed in as a list of ChatMessage objects,
    giving each WebSocket session full multi-turn context.
"""

from typing import AsyncGenerator

from groq import AsyncGroq

from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import LLMServiceError
from app.schemas.chat import ChatMessage, MessageRole

logger = get_logger(__name__)

# ── Groq async client singleton ───────────────────────────────────────────────
_groq_client: AsyncGroq | None = None


def _get_groq_client() -> AsyncGroq:
    global _groq_client
    if _groq_client is None:
        logger.info("Initialising Groq async client …")
        _groq_client = AsyncGroq(api_key=settings.groq_api_key)
    return _groq_client


# ── Default system prompt ─────────────────────────────────────────────────────
_DEFAULT_SYSTEM_PROMPT = (
    "You are Astra, an elite financial AI assistant. "
    "Give extremely concise, conversational answers. "
    "Strictly limit your response to a maximum of 2 sentences. "
    "Do not use lists, bold text, or markdown formatting, "
    "as this text will be read aloud by a TTS engine."
)


def _build_messages(
    transcript: str,
    history: list[ChatMessage],
    system_prompt: str | None,
) -> list[dict]:
    """Assemble the message array expected by the Groq chat completions API."""
    messages: list[dict] = [
        {"role": MessageRole.system, "content": system_prompt or _DEFAULT_SYSTEM_PROMPT}
    ]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": MessageRole.user, "content": transcript})
    return messages


async def stream_chat_response(
    transcript: str,
    history: list[ChatMessage],
    system_prompt: str | None = None,
) -> AsyncGenerator[str, None]:
    """
    Async generator that yields text tokens one-by-one from the Groq LLM stream.

    Args:
        transcript:    The user's current turn (post-STT text).
        history:       Previous conversation turns for context.
        system_prompt: Optional override for the system instruction.

    Yields:
        Individual text delta strings as they stream from Groq.

    Raises:
        LLMServiceError: Wrapped around any Groq SDK / network error.
    """
    client = _get_groq_client()
    messages = _build_messages(transcript, history, system_prompt)

    logger.info(
        "Sending request to Groq | model=%s | history_turns=%d",
        settings.groq_model,
        len(history),
    )

    try:
        stream = await client.chat.completions.create(
            model=settings.groq_model,
            messages=messages,
            stream=True,
            temperature=0.7,
            max_tokens=1024,
        )

        async for chunk in stream:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content

    except Exception as exc:
        logger.exception("Groq streaming error: %s", exc)
        raise LLMServiceError(f"Groq API error: {exc}") from exc
