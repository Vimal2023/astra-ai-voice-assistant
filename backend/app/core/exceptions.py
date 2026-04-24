"""
app/core/exceptions.py
──────────────────────
Custom exception hierarchy for the application.
FastAPI exception handlers are wired up in app/main.py.
"""

from fastapi import Request
from fastapi.responses import JSONResponse


# ── Domain Exceptions ────────────────────────────────────────────────────────


class AstraBaseException(Exception):
    """Root for all application-level exceptions."""

    status_code: int = 500
    detail: str = "An unexpected error occurred."

    def __init__(self, detail: str | None = None) -> None:
        self.detail = detail or self.__class__.detail
        super().__init__(self.detail)


class TranscriptionError(AstraBaseException):
    status_code = 422
    detail = "Audio transcription failed."


class LLMServiceError(AstraBaseException):
    status_code = 503
    detail = "LLM service is currently unavailable."


class AudioValidationError(AstraBaseException):
    status_code = 400
    detail = "Invalid or unsupported audio file."


# ── FastAPI Exception Handlers ───────────────────────────────────────────────


async def astra_exception_handler(request: Request, exc: AstraBaseException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.__class__.__name__, "detail": exc.detail},
    )
