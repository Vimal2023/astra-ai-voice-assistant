"""
app/services/whisper_service.py
────────────────────────────────
Handles audio transcription using OpenAI Whisper (local inference).

Design notes:
  • The heavy Whisper model is loaded once and cached in a module-level variable.
  • `transcribe_audio` accepts raw bytes (from the UploadFile) and writes a
    temporary file so Whisper's file-path API can consume it.
  • Swap out the implementation here to use the Groq/Whisper cloud API instead
    by replacing the `whisper.load_model` call with a Groq audio client call —
    the service interface stays identical.
"""

import tempfile
import os
from pathlib import Path
from typing import Optional

import whisper  # openai-whisper

from app.core.config import settings
from app.core.logging import get_logger
from app.core.exceptions import TranscriptionError, AudioValidationError
from app.schemas.audio import TranscriptionResponse

logger = get_logger(__name__)

# ── Supported audio MIME types / extensions ──────────────────────────────────
_SUPPORTED_EXTENSIONS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg"}

# ── Whisper model singleton ───────────────────────────────────────────────────
# Using "base" for fast startup; swap to "small" / "medium" / "large" as needed.
_WHISPER_MODEL_NAME = "base"
_whisper_model: Optional[whisper.Whisper] = None  # type: ignore[name-defined]


def _get_whisper_model() -> "whisper.Whisper":  # type: ignore[name-defined]
    """Lazy-load and cache the Whisper model."""
    global _whisper_model
    if _whisper_model is None:
        logger.info("Loading Whisper model '%s' …", _WHISPER_MODEL_NAME)
        _whisper_model = whisper.load_model(_WHISPER_MODEL_NAME)
        logger.info("Whisper model loaded successfully.")
    return _whisper_model


def _validate_audio_extension(filename: str) -> None:
    ext = Path(filename).suffix.lower()
    if ext not in _SUPPORTED_EXTENSIONS:
        raise AudioValidationError(
            f"Unsupported file type '{ext}'. Allowed: {', '.join(_SUPPORTED_EXTENSIONS)}"
        )


async def transcribe_audio(audio_bytes: bytes, filename: str) -> TranscriptionResponse:
    """
    Transcribe raw audio bytes using a local Whisper model.

    Args:
        audio_bytes: Raw binary content of the uploaded audio file.
        filename:    Original filename (used for extension validation).

    Returns:
        TranscriptionResponse with the transcript and metadata.

    Raises:
        AudioValidationError: If the file type is not supported.
        TranscriptionError:   If Whisper fails to process the audio.
    """
    _validate_audio_extension(filename)

    # Write bytes to a named temp file so Whisper can open it by path
    suffix = Path(filename).suffix.lower()
    try:
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        logger.info("Transcribing file '%s' (%d bytes) …", filename, len(audio_bytes))
        model = _get_whisper_model()
        result: dict = model.transcribe(tmp_path, fp16=False)

        transcript = result.get("text", "").strip()
        language = result.get("language")
        logger.info("Transcription complete. Language: %s | Length: %d chars", language, len(transcript))

        return TranscriptionResponse(
            transcript=transcript,
            language=language,
            duration_seconds=None,  # Whisper doesn't expose duration directly
            model_used=_WHISPER_MODEL_NAME,
        )

    except (AudioValidationError, TranscriptionError):
        raise
    except Exception as exc:
        logger.exception("Whisper transcription error: %s", exc)
        raise TranscriptionError(f"Transcription failed: {exc}") from exc
    finally:
        # Always clean up the temp file
        if "tmp_path" in locals() and os.path.exists(tmp_path):
            os.unlink(tmp_path)
