"""
app/main.py
────────────
Application factory and entry-point for the FastAPI app.

Responsibilities:
  • Create the FastAPI application instance with metadata.
  • Register middleware (CORS).
  • Wire up all routers under a versioned prefix.
  • Register custom exception handlers.
  • Expose a health-check endpoint at the root.
  • Configure logging at startup via lifespan.
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import configure_logging, get_logger
from app.core.exceptions import AstraBaseException, astra_exception_handler
from app.routes import audio as audio_router
from app.routes import chat as chat_router

# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Code before `yield` runs on startup; code after runs on shutdown.
    Use this block to initialise long-lived resources (DB pools, ML models…).
    """
    configure_logging()
    logger = get_logger(__name__)
    logger.info("🚀  Astra Fin Voice Hub — backend starting up")
    logger.info("   CORS origins : %s", settings.allowed_origins)
    logger.info("   Groq model   : %s", settings.groq_model)
    yield
    logger.info("🛑  Astra Fin Voice Hub — shutdown complete")


# ── Application factory ───────────────────────────────────────────────────────

def create_app() -> FastAPI:
    app = FastAPI(
        title="Astra Fin Voice Hub — Backend API",
        description=(
            "Production-ready FastAPI backend powering the Astra AI voice assistant. "
            "Provides Whisper-based STT transcription and Groq-powered LLM streaming "
            "over WebSocket."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        # allow_origins=[
        #     "http://localhost:5173",
        #     "https://astra-ai-voice-assistant.vercel.app"
        # ],
        # allow_credentials=True,
        allow_origins=["*"], # Allow all origins to bypass strict CORS
        allow_credentials=False, # Must be False when allow_origins is "*"
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Custom exception handlers ─────────────────────────────────────────
    app.add_exception_handler(AstraBaseException, astra_exception_handler)  # type: ignore[arg-type]

    # ── Routers ───────────────────────────────────────────────────────────
    API_PREFIX = "/api/v1"
    app.include_router(audio_router.router, prefix=API_PREFIX)
    app.include_router(chat_router.router, prefix=API_PREFIX)

    # ── Health check ──────────────────────────────────────────────────────
    @app.get("/health", tags=["Health"], summary="Service health check")
    async def health() -> dict:
        return {"status": "ok", "service": "astra-fin-voice-hub"}

    return app


app: FastAPI = create_app()
