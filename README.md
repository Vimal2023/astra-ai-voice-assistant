# ✦ Astra Fin Voice Hub

> **Your elite AI-powered financial voice assistant — speak a question, hear the answer.**

Astra Fin Voice Hub is a full-stack, real-time voice intelligence platform built for financial guidance. It captures the user's spoken question, transcribes it via the **Groq Cloud Whisper API** (`whisper-large-v3`), sends it to a blazing-fast LLM via the Groq API, and streams the response back to the browser — where it is spoken aloud using the Web Speech API. The result is a fluid, hands-free financial advisory experience with near-zero perceived latency.

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
│   2. Save as temp file → FFmpeg decodes → Groq Whisper Cloud (STT) │
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
3. FFmpeg normalises the audio; the audio file is sent to the **Groq Whisper Cloud API** (`whisper-large-v3`) for transcription.
4. The transcript is assembled with conversation history and dispatched to Groq.
5. Groq streams LLM tokens back; FastAPI forwards each token immediately to the browser.
6. The React frontend accumulates the streamed text and feeds it to the browser's native `SpeechSynthesis` API for read-aloud playback.

---

## Architecture & System Design

### STT Engine: Groq Cloud Whisper (`whisper-large-v3`)

#### The Problem — Local Whisper Caused OOM Crashes in Production

The original architecture loaded OpenAI Whisper **locally** within the FastAPI process using the `openai-whisper` Python package. While this approach works well on developer machines with ample RAM, it proved untenable in cloud-hosted, memory-constrained environments such as **Render's free and starter tiers**:

- The `whisper-large-v3` model alone requires **~3 GB of VRAM / RAM** to load.
- On Render (typically 512 MB – 2 GB RAM), the process reliably triggered **Out-Of-Memory (OOM) kills** during model initialisation, crashing the backend before it could serve a single request.
- There was no graceful recovery path: once the OS killed the process, the entire service became unavailable until a manual restart.

This was a hard blocker for production deployment.

#### The Solution — Offload STT to the Groq Cloud API

The architectural decision was made to **remove the local Whisper dependency entirely** and delegate all speech-to-text inference to the [Groq Cloud Audio API](https://console.groq.com/docs/speech-text), which exposes the `whisper-large-v3` model as a managed, serverless endpoint.

The backend now:
1. Receives the audio blob over WebSocket.
2. Decodes and normalises it via FFmpeg into a temporary WAV file.
3. Submits the WAV file to `client.audio.transcriptions.create()` on the Groq API.
4. Receives the transcript as a plain-text string and forwards it to the LLM pipeline.

#### Technical Benefits

| Dimension | Before (Local Whisper) | After (Groq Cloud Whisper) |
|---|---|---|
| **Backend RAM footprint** | ~2–3 GB (model weights in-process) | **Near-zero** (HTTP call only) |
| **Cold-start / OOM risk** | High — OOM crash on Render | **Eliminated** |
| **Transcription latency** | 2–8 s (CPU inference on free tier) | **< 1 s** (Groq's purpose-built LPU hardware) |
| **Model quality** | Dependent on local model variant | `whisper-large-v3` — Groq-optimised, always current |
| **Deployment complexity** | Model weights bundled / downloaded at startup | **Zero model management** — stateless HTTP |
| **Production stability** | Fragile — single OOM kills the process | **Robust** — isolated, independently scalable |

#### Trade-offs & Mitigations

- **External API dependency:** The STT path now requires network egress to Groq. This is mitigated by Groq's industry-leading uptime SLA and the fact that the LLM path was already Groq-dependent.
- **API rate limits:** Free-tier Groq accounts have audio transcription rate limits. For production scale, a paid Groq plan or request-queue middleware is recommended.
- **Data privacy:** Audio is transmitted to Groq's servers for processing. Ensure this aligns with applicable data-handling policies for your deployment context.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 (Vite), CSS Modules, WebSocket API |
| **Styling** | Vanilla CSS · Frosted-glass design system |
| **Real-time** | WebSocket (native browser + FastAPI `websockets`) |
| **TTS** | Web Speech API (`window.speechSynthesis`) |
| **Backend** | FastAPI 0.111, Uvicorn, Python 3.11+ |
| **STT** | Groq Cloud Audio API — `whisper-large-v3` |
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

> **Note:** The local `openai-whisper` package is **no longer a dependency**. Speech-to-text is handled entirely by the Groq Cloud Audio API. No model weights are downloaded at startup.

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
- **Groq Cloud STT:** Speech-to-text is handled by the Groq Audio API (`whisper-large-v3`). This eliminates the ~3 GB local model footprint that caused OOM crashes on Render, reduces backend RAM usage to near-zero, and cuts transcription latency to sub-second via Groq's LPU hardware. See [Architecture & System Design](#architecture--system-design) for full rationale.
- **FFmpeg as a pre-processing dependency:** FFmpeg is still used to decode and normalise incoming audio blobs (webm/ogg/mp4) into a clean WAV before submission to the Groq Audio API, keeping the pipeline format-agnostic without requiring any frontend-side encoding.
- **CSS Modules + design tokens:** All styles are scoped via CSS Modules with a central `tokens.css` file defining the full design system (palette, spacing, typography, shadows), ensuring zero style leakage and easy global theming.

---

## License

This is a **private project**. All rights reserved.
