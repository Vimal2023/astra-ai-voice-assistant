"""
app/schemas/audio.py
────────────────────
Pydantic models (request / response) for the audio transcription endpoint.
"""

from pydantic import BaseModel, ConfigDict, Field


class TranscriptionResponse(BaseModel):
    """Returned by POST /api/v1/audio/transcribe."""

    model_config = ConfigDict(protected_namespaces=())

    transcript: str = Field(..., description="Transcribed text from the audio file.")
    language: str | None = Field(None, description="Detected language code (e.g. 'en').")
    duration_seconds: float | None = Field(None, description="Audio duration if available.")
    model_used: str = Field(..., description="Whisper model variant that processed the file.")
