# Astra Fin Voice Hub — Frontend

React + Vite frontend for the Astra AI voice assistant.

---

## Project Structure

```
src/
├── api/
│   ├── httpClient.js          ← Axios instance (base URL, interceptors)
│   └── audioApi.js            ← POST /audio/transcribe helper
├── components/
│   ├── VoiceButton/
│   │   ├── VoiceButton.jsx    ← Mic toggle (presentational)
│   │   └── VoiceButton.module.css
│   ├── StreamDisplay/
│   │   ├── StreamDisplay.jsx  ← Transcript + streamed response (memoised)
│   │   └── StreamDisplay.module.css
│   └── StatusBar/
│       ├── StatusBar.jsx      ← Connection/streaming indicator (memoised)
│       └── StatusBar.module.css
├── hooks/
│   ├── useVoiceStream.js      ← ★ Main hook (WS + mic + streaming)
│   ├── useWebSocket.js        ← Low-level reusable WS hook
│   └── useMediaRecorder.js    ← Standalone mic hook
├── styles/
│   ├── tokens.css             ← Design tokens (colours, spacing, type…)
│   └── global.css             ← CSS reset + base element styles
├── App.jsx
├── App.module.css
└── main.jsx
```

---

## Quick Start

```powershell
cd frontend
npm install
npm run dev          # http://localhost:5173
```

---

## Environment Variables

Create a `.env.local` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000
```

> Both default to `localhost:8000` if omitted.

---

## `useVoiceStream` API

```js
const {
  // State
  isRecording,   // boolean
  isConnected,   // boolean — WebSocket open
  isStreaming,   // boolean — tokens arriving
  transcript,    // string  — STT output
  streamedText,  // string  — assembled LLM tokens (RAF-batched)
  history,       // array   — conversation turns
  error,         // string|null

  // Actions
  startRecording,  // () => void — request mic + start MediaRecorder
  stopRecording,   // () => void — stop recording, auto-transcribes + sends
  sendTranscript,  // (text, systemPrompt?) => void — send text directly
  disconnect,      // () => void — graceful WS close, no reconnect
  clearHistory,    // () => void — reset conversation
} = useVoiceStream();
```

### Re-render strategy

| Trigger | Frequency |
|---------|-----------|
| Token accumulation | **buffered** — state flushed via `requestAnimationFrame` (~60 fps max) |
| `done` / `error` messages | Synchronous single update |
| Recording state changes | Immediate (`setIsRecording`) |
| WS open/close | Immediate (`setIsConnected`) |

Components consuming only `transcript` or `history` (not `streamedText`) will **not** re-render during token streaming.

---

## WebSocket Protocol

Mirrors the FastAPI backend schema exactly:

**Send:**
```json
{ "transcript": "...", "history": [...], "system_prompt": null }
```

**Receive:**
```json
{ "type": "token",  "content": "<token>" }
{ "type": "done",   "content": "<full text>" }
{ "type": "error",  "content": "<message>" }
```
