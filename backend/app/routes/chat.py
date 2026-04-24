"""
app/routes/chat.py
───────────────────
WebSocket endpoint for real-time, bi-directional voice-chat communication.

WS /api/v1/chat/ws
──────────────────
Protocol (per message):
  Client → Server (JSON):
    {
      "transcript": "User's spoken text",
      "history":    [{"role": "user"|"assistant"|"system", "content": "..."}],
      "system_prompt": "Optional override"   // optional
    }

  Server → Client (JSON, streaming):
    {"type": "token",  "content": "<token>"}   // zero or more
    {"type": "done",   "content": "<full text>"}
    {"type": "error",  "content": "<message>"}  // on failure

The session loop stays open so the same WebSocket connection handles multiple
conversational turns without reconnecting.
"""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import ValidationError

from app.core.logging import get_logger
from app.core.exceptions import LLMServiceError
from app.schemas.chat import WSIncomingMessage, WSOutgoingChunk
from app.services import groq_service

logger = get_logger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat / LLM"])


@router.websocket("/ws")
async def chat_websocket(websocket: WebSocket) -> None:
    """
    Persistent WebSocket session for token-streaming LLM responses.

    Lifecycle:
      1. Accept connection.
      2. Loop: wait for a JSON message, validate it, stream Groq tokens back.
      3. Close cleanly on disconnect or fatal error.
    """
    await websocket.accept()
    client_host = websocket.client.host if websocket.client else "unknown"
    logger.info("WebSocket connected from %s", client_host)

    try:
        while True:
            # ── 1. Receive & validate message ─────────────────────────────
            raw = await websocket.receive_text()

            try:
                payload = WSIncomingMessage.model_validate_json(raw)
            except ValidationError as exc:
                error_chunk = WSOutgoingChunk(type="error", content=f"Invalid payload: {exc}")
                await websocket.send_text(error_chunk.model_dump_json())
                continue  # keep the connection alive; wait for the next message

            logger.info(
                "WS message | host=%s | transcript_len=%d | history_turns=%d",
                client_host,
                len(payload.transcript),
                len(payload.history),
            )

            # ── 2. Stream tokens from Groq ────────────────────────────────
            full_response: list[str] = []

            try:
                async for token in groq_service.stream_chat_response(
                    transcript=payload.transcript,
                    history=payload.history,
                    system_prompt=payload.system_prompt,
                ):
                    full_response.append(token)
                    chunk = WSOutgoingChunk(type="token", content=token)
                    await websocket.send_text(chunk.model_dump_json())

                # ── 3. Signal completion ───────────────────────────────────
                done_chunk = WSOutgoingChunk(type="done", content="".join(full_response))
                await websocket.send_text(done_chunk.model_dump_json())
                logger.info(
                    "WS response complete | host=%s | total_chars=%d",
                    client_host,
                    len(done_chunk.content),
                )

            except LLMServiceError as exc:
                error_chunk = WSOutgoingChunk(type="error", content=str(exc))
                await websocket.send_text(error_chunk.model_dump_json())
                # Non-fatal: keep the socket open for the next user turn

    except WebSocketDisconnect:
        logger.info("WebSocket disconnected: %s", client_host)
    except Exception as exc:
        logger.exception("Unexpected WebSocket error from %s: %s", client_host, exc)
        # Best-effort close with an error frame
        try:
            err = WSOutgoingChunk(type="error", content="Internal server error.")
            await websocket.send_text(err.model_dump_json())
        except Exception:
            pass
        await websocket.close(code=1011)
