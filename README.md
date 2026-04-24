# ✦ Astra Fin Voice Hub

> **Your elite AI-powered financial voice assistant — speak a question, hear the answer.**

Astra Fin Voice Hub is a full-stack, real-time voice intelligence platform built for financial guidance. It captures the user's spoken question, transcribes it with OpenAI Whisper, sends it to a blazing-fast LLM via the Groq API, and streams the response back to the browser — where it is spoken aloud using the Web Speech API. The result is a fluid, hands-free financial advisory experience with near-zero perceived latency.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER                               │
│                                                                     │
│   [Microphone] ──► MediaRecorder ──► WebSocket (binary audio blob) │
│                                                                     │
│   WebSocket (text stream) ──► ResponseStream ──► Web Speech API    │
│        ▲                                                            │
│        │ Token-by-token text chunks streamed in real-time          │
└────────┼────────────────────────────────────────────────────────────┘
         │
         │  WebSocket (ws://localhost:8000/api/v1/...)
         │
┌────────▼────────────────────────────────────────────────────────────┐
│                        FASTAPI BACKEND                              │
│                                                                     │
│   1. Receive audio blob via WebSocket                               │
│   2. Save as temp file → FFmpeg decodes → OpenAI Whisper (STT)     │
│   3. Transcript forwarded to Groq API (llama-3.1-8b-instant)       │
│   4. Groq streams tokens → WebSocket forwards each chunk to client │
│                                                                     │
│   [Audio Route]  /api/v1/audio/...                                  │
│   [Chat Route]   /api/v1/chat/...                                   │
│   [Health]       GET /health                                        │
└─────────────────────────────────────────────────────────────────────┘
```

**In plain English:**
1. User presses the mic button → browser records audio.
2. Audio blob is sent to the FastAPI backend over a WebSocket connection.
3. FFmpeg normalises the audio; Whisper converts speech to text.
4. The transcript is assembled with conversation history and dispatched to Groq.
5. Groq streams LLM tokens back; FastAPI forwards each token immediately to the browser.
6. The React frontend accumulates the streamed text and feeds it to the browser's native `SpeechSynthesis` API for read-aloud playback.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), CSS Modules, WebSocket API |
| **Styling** | Vanilla CSS · Frosted-glass design system |
| **Real-time** | WebSocket (native browser + FastAPI `websockets`) |
| **TTS** | Web Speech API (`window.speechSynthesis`) |
| **Backend** | FastAPI 0.111, Uvicorn, Python 3.11+ |
| **STT** | OpenAI Whisper (installed from source) |
| **LLM** | Groq API — `llama-3.1-8b-instant` |
| **Audio decode** | **FFmpeg** (system dependency — strictly required) |

---

## Prerequisites

Ensure all of the following are installed and available on your `PATH` before proceeding.

### 1. Node.js
- Version **18 or higher**
- Verify: `node --version`
- Download: https://nodejs.org

### 2. Python
- Version **3.10 or higher** (3.11+ recommended)
- Verify: `python --version`
- Download: https://python.org

### 3. ⚠️ FFmpeg — Strictly Required

Whisper relies on FFmpeg to decode and normalise audio files before transcription. **The backend will fail silently or crash without it.**

**Windows (recommended — via winget):**
```powershell
winget install Gyan.FFmpeg
```
> After installation, close and reopen your terminal so FFmpeg is added to `PATH`.

**macOS (via Homebrew):**
```bash
brew install ffmpeg
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt update && sudo apt install ffmpeg -y
```

**Verify installation:**
```bash
ffmpeg -version
```

---

## Project Structure

```
astra-fin-voice-hub/
├── backend/
│   ├── app/
│   │   ├── core/           # Config, logging, exception classes
│   │   ├── routes/         # FastAPI routers (audio, chat)
│   │   ├── schemas/        # Pydantic request/response models
│   │   ├── services/       # Whisper STT + Groq LLM service layer
│   │   └── main.py         # Application factory
│   ├── tests/
│   ├── .env                # Environment variables (git-ignored)
│   ├── requirements.txt
│   └── run.py              # Alternate entry-point
│
└── frontend/
    ├── src/
    │   ├── api/            # WebSocket client abstraction
    │   ├── components/     # UI components (VoiceConsole, MicButton, etc.)
    │   ├── hooks/          # Custom React hooks (recording, streaming, TTS)
    │   ├── styles/         # Global CSS + design tokens
    │   └── App.jsx
    ├── index.html
    └── vite.config.js
```

---

## Environment Variables

Create a `.env` file inside the `backend/` directory. Use the template below:

```env
# ──────────────────────────────────────────────
#  Astra Fin Voice Hub  ·  Backend Environment
# ──────────────────────────────────────────────

# Groq API key — obtain one at https://console.groq.com
GROQ_API_KEY=your_groq_api_key_here

# Llama-3 model served by Groq
GROQ_MODEL=llama-3.1-8b-instant

# Origins allowed by CORS (comma-separated JSON array)
ALLOWED_ORIGINS=["http://localhost:3000","http://localhost:5173"]

# Uvicorn server binding
HOST=0.0.0.0
PORT=8000
```

> **Never commit your `.env` file.** It is listed in `.gitignore` by default.

---

## Installation & Setup

### Backend

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# 3. Install all Python dependencies
pip install -r requirements.txt
```

> **Note:** `openai-whisper` is installed directly from its GitHub source (see `requirements.txt`). This may take a few minutes on first install as it downloads the package and its ML model weights on first use.

### Frontend

```bash
# 1. Navigate to the frontend directory
cd frontend

# 2. Install Node dependencies
npm install
```

---

## How to Run

Both servers must run **simultaneously in separate terminal windows**.

### Terminal 1 — Backend (FastAPI + Uvicorn)

```bash
cd backend

# Activate your virtual environment first
.venv\Scripts\activate   # Windows
# source .venv/bin/activate  # macOS / Linux

uvicorn app.main:app --reload
```

Backend will be live at: **`http://localhost:8000`**
- API docs (Swagger UI): `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

---

### Terminal 2 — Frontend (React + Vite)

```bash
cd frontend

npm run dev
```

Frontend will be live at: **`http://localhost:5173`**

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Service health check |
| `WebSocket` | `/api/v1/audio/...` | Audio ingestion & Whisper transcription |
| `WebSocket` | `/api/v1/chat/...` | Groq LLM streaming chat |
| `GET` | `/docs` | Interactive Swagger UI |
| `GET` | `/redoc` | ReDoc API documentation |

---

## Key Design Decisions

- **Async generator streaming:** `groq_service.py` uses an `AsyncGenerator` to yield individual LLM tokens as they arrive. The WebSocket route forwards each chunk immediately — no buffering — giving the user word-by-word read-aloud feedback.
- **Groq client singleton:** The `AsyncGroq` client is instantiated once at module level and reused across all sessions, avoiding repeated connection overhead.
- **TTS-optimised system prompt:** Astra is instructed to respond in plain prose (no lists, no markdown, maximum 2 sentences) so the output is clean and natural when spoken aloud.
- **FFmpeg as a hard dependency:** Whisper delegates all audio decoding to FFmpeg, making it format-agnostic — the frontend can send `webm`, `ogg`, or `mp4` blobs without any frontend-side encoding.
- **CSS Modules + design tokens:** All styles are scoped via CSS Modules with a central `tokens.css` file defining the full design system (palette, spacing, typography, shadows), ensuring zero style leakage and easy global theming.

---

## License

This is a **private project**. All rights reserved.
