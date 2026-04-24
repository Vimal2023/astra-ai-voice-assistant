# Astra Fin Voice Hub — Backend

Production-ready **FastAPI** backend powering the Astra AI voice assistant.

---

## Project Structure

```
backend/
├── app/
│   ├── core/
│   │   ├── config.py        # Pydantic-Settings (env vars, singletons)
│   │   ├── exceptions.py    # Custom exception hierarchy + handlers
│   │   └── logging.py       # Structured logging
│   ├── routes/
│   │   ├── audio.py         # POST /api/v1/audio/transcribe  (Whisper STT)
│   │   └── chat.py          # WS   /api/v1/chat/ws           (Groq streaming)
│   ├── schemas/
│   │   ├── audio.py         # TranscriptionResponse
│   │   └── chat.py          # WSIncomingMessage, WSOutgoingChunk
│   ├── services/
│   │   ├── whisper_service.py  # Local Whisper inference
│   │   └── groq_service.py     # Groq async streaming client
│   └── main.py              # App factory, CORS, lifespan
├── tests/
│   └── test_health.py
├── run.py                   # Dev entry-point (hot-reload)
├── requirements.txt
└── .env.example
```

---

## Quick Start

### 1. Create & activate a virtual environment

```powershell
cd backend
python -m venv .venv
.venv\Scripts\activate
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment

```powershell
copy .env.example .env
# Edit .env and add your GROQ_API_KEY
```

### 4. Run the development server

```powershell
python run.py
# or
uvicorn app.main:app --reload
```

The server starts on **http://localhost:8000**.

---

## API Reference

### `GET /health`
Simple liveness probe — returns `{"status": "ok"}`.

### `POST /api/v1/audio/transcribe`
| Field | Value |
|-------|-------|
| Content-Type | `multipart/form-data` |
| Body field | `file` (audio/wav, mp3, m4a, webm, ogg …) |
| Response | `TranscriptionResponse` JSON |

### `WS /api/v1/chat/ws`
Persistent WebSocket session. Each turn:

**Client → Server**
```json
{
  "transcript": "What SIP should I choose?",
  "history": [
    {"role": "user",      "content": "Hello"},
    {"role": "assistant", "content": "Hi! How can I help?"}
  ],
  "system_prompt": null
}
```

**Server → Client** (streamed)
```json
{"type": "token", "content": "The"}
{"type": "token", "content": " best"}
...
{"type": "done",  "content": "The best SIP for you depends on…"}
```

---

## Running Tests

```powershell
pip install pytest httpx
pytest tests/ -v
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GROQ_API_KEY` | *(required)* | Groq API key |
| `GROQ_MODEL` | `llama3-8b-8192` | Model ID |
| `ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | CORS origins |
| `HOST` | `0.0.0.0` | Bind host |
| `PORT` | `8000` | Bind port |
