"""
app/routes/audio.py
────────────────────
REST endpoint for audio file transcription.

POST /api/v1/audio/transcribe
  • Accepts multipart/form-data with a single audio file field named `file`.
  • Delegates processing to `whisper_service.transcribe_audio`.
  • Returns a JSON body matching `TranscriptionResponse`.
"""

from fastapi import APIRouter, File, UploadFile, Depends
from fastapi.responses import JSONResponse

from app.core.logging import get_logger
from app.schemas.audio import TranscriptionResponse
from app.services import whisper_service

logger = get_logger(__name__)

router = APIRouter(prefix="/audio", tags=["Audio / STT"])


@router.post(
    "/transcribe",
    response_model=TranscriptionResponse,
    summary="Transcribe an uploaded audio file",
    description=(
        "Upload an audio file (WAV, MP3, M4A, WebM, OGG, etc.) and receive "
        "the transcribed text produced by a local Whisper model."
    ),
    responses={
        400: {"description": "Unsupported file type"},
        422: {"description": "Transcription processing failed"},
    },
)
async def transcribe_audio(
    file: UploadFile = File(..., description="Audio file to transcribe"),
) -> TranscriptionResponse:
    """
    Receive an audio file, run it through Whisper, and return the transcript.

    The endpoint reads the entire file into memory, then delegates to the
    `whisper_service` which writes a temporary file, runs inference, and
    cleans up automatically.
    """
    logger.info("Received audio upload: '%s' (%s)", file.filename, file.content_type)

    audio_bytes = await file.read()
    filename = file.filename or "audio.wav"

    result = await whisper_service.transcribe_audio(audio_bytes, filename)
    return result
