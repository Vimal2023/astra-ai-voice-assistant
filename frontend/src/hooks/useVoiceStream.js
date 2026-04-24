/**
 * src/hooks/useVoiceStream.js
 * ────────────────────────────
 * Custom hook that owns the full voice-assistant session lifecycle:
 *
 *   1. Microphone access & MediaRecorder management
 *   2. Audio upload → Whisper transcription (REST)
 *   3. WebSocket connection to FastAPI /api/v1/chat/ws
 *   4. Token-by-token streaming state from the LLM response
 *
 * ┌─────────────────────────────────────────── Re-render discipline ───┐
 * │ Heavy string accumulation (streaming tokens) is done inside a     │
 * │ useRef buffer. The displayed `streamedText` state is updated at   │
 * │ most once per animation frame via requestAnimationFrame, so the    │
 * │ component re-renders at ~60 fps max — not once per token.          │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * Usage:
 *   const {
 *     isRecording, isConnected, isStreaming,
 *     transcript, streamedText, error,
 *     startRecording, stopRecording, sendTranscript, disconnect,
 *   } = useVoiceStream();
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { transcribeAudio } from '../api/audioApi';
import { useSpeechSynthesis } from './useSpeechSynthesis';

// ── Constants ────────────────────────────────────────────────────────────────

const WS_URL =
  (import.meta.env.VITE_WS_URL || 'ws://localhost:8000') + '/api/v1/chat/ws';

const RECONNECT_DELAY_MS = 2_000;
const MAX_RECONNECT_ATTEMPTS = 5;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useVoiceStream() {
  const { speakText, cancelSpeech } = useSpeechSynthesis();
  // ── Exposed state ─────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Whisper transcribing
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [streamedText, setStreamedText] = useState('');
  const [error, setError] = useState(null);
  /** Full conversation history forwarded to the backend on each turn. */
  const [history, setHistory] = useState([]);

  // ── Internal refs (no re-render on change) ────────────────────────────────
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimerRef = useRef(null);
  const streamBufferRef = useRef('');      // accumulates raw tokens
  const rafRef = useRef(null);             // requestAnimationFrame handle
  const isMountedRef = useRef(true);       // guards state updates after unmount

  // ── RAF flush: drains buffer → state at display frame rate ────────────────
  const flushBuffer = useCallback(() => {
    if (!isMountedRef.current) return;
    if (streamBufferRef.current) {
      setStreamedText((prev) => prev + streamBufferRef.current);
      streamBufferRef.current = '';
    }
    rafRef.current = null;
  }, []);

  const scheduleFlush = useCallback(() => {
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(flushBuffer);
    }
  }, [flushBuffer]);

  // ── WebSocket setup ───────────────────────────────────────────────────────

  const connectWebSocket = useCallback(() => {
    // Prevent duplicate connections
    if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

    clearTimeout(reconnectTimerRef.current);

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      reconnectAttemptsRef.current = 0;
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'token':
            // Queue token into buffer; commit to state via RAF
            streamBufferRef.current += message.content;
            scheduleFlush();
            break;

          case 'done':
            // Final flush — cancel any pending RAF and sync immediately
            if (rafRef.current) {
              cancelAnimationFrame(rafRef.current);
              rafRef.current = null;
            }
            streamBufferRef.current = '';
            setStreamedText(message.content);
            setIsStreaming(false);
            // Append the completed assistant turn to history
            setHistory((prev) => [
              ...prev,
              { role: 'assistant', content: message.content },
            ]);
            // Speak the full response only once the stream is complete
            speakText(message.content);
            break;

          case 'error':
            setError(message.content);
            setIsStreaming(false);
            break;

          default:
            console.warn('[useVoiceStream] Unknown message type:', message.type);
        }
      } catch (parseError) {
        console.error('[useVoiceStream] Failed to parse WS message:', parseError);
      }
    };

    ws.onerror = (event) => {
      if (!isMountedRef.current) return;
      console.error('[useVoiceStream] WebSocket error', event);
      setError('WebSocket connection error.');
    };

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      setIsStreaming(false);

      // Auto-reconnect unless the closure was intentional (code 1000)
      if (
        event.code !== 1000 &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        reconnectAttemptsRef.current += 1;
        const delay = RECONNECT_DELAY_MS * reconnectAttemptsRef.current;
        console.info(
          `[useVoiceStream] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`,
        );
        reconnectTimerRef.current = setTimeout(connectWebSocket, delay);
      }
    };
  }, [scheduleFlush]);

  // ── Connect on mount, clean up on unmount ─────────────────────────────────
  useEffect(() => {
    isMountedRef.current = true;
    connectWebSocket();

    return () => {
      isMountedRef.current = false;
      clearTimeout(reconnectTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      wsRef.current?.close(1000, 'Component unmounted');
      cancelSpeech(); // stop any in-progress TTS on unmount
    };
  }, [connectWebSocket]);

  // ── Microphone recording ──────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    setError(null);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError('Microphone access denied. Please allow microphone permissions.');
      return;
    }

    // Prefer webm/opus for broad browser support; fall back to first available
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';

    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    mediaRecorderRef.current = recorder;
    audioChunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) audioChunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // Stop all mic tracks to release the hardware indicator
      stream.getTracks().forEach((t) => t.stop());

      const blob = new Blob(audioChunksRef.current, {
        type: mimeType || 'audio/webm',
      });
      audioChunksRef.current = [];

      setIsProcessing(true);
      try {
        const result = await transcribeAudio(blob);
        if (!isMountedRef.current) return;
        const text = result.transcript;
        setTranscript(text);
        // Automatically send the transcript over the WebSocket
        if (text.trim()) {
          sendTranscript(text);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        setError(err.message || 'Transcription failed.');
      } finally {
        if (isMountedRef.current) setIsProcessing(false);
      }
    };

    recorder.start(250); // collect data in 250 ms slices
    setIsRecording(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  // ── Send a text transcript over WhatsApp ─────────────────────────────────
  /**
   * Send a transcript string directly over the WebSocket.
   * Useful for text-only mode or after manual transcript edits.
   *
   * @param {string} text
   * @param {string|null} systemPrompt
   */
  const sendTranscript = useCallback(
    (text, systemPrompt = null) => {
      const ws = wsRef.current;
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        setError('WebSocket is not connected. Please wait and try again.');
        return;
      }
      if (!text?.trim()) return;

      // Reset streamed text for this new turn
      streamBufferRef.current = '';
      setStreamedText('');
      setIsStreaming(true);
      setError(null);

      // Append user turn to history before sending
      const updatedHistory = [
        ...history,
        { role: 'user', content: text },
      ];
      setHistory(updatedHistory);

      const payload = {
        transcript: text,
        history: updatedHistory,
        system_prompt: systemPrompt,
      };

      ws.send(JSON.stringify(payload));
    },
    [history],
  );

  // ── Manual disconnect ─────────────────────────────────────────────────────
  const disconnect = useCallback(() => {
    clearTimeout(reconnectTimerRef.current);
    reconnectAttemptsRef.current = MAX_RECONNECT_ATTEMPTS; // suppress reconnect
    wsRef.current?.close(1000, 'User disconnected');
    setIsConnected(false);
  }, []);

  // ── Reset conversation history ────────────────────────────────────────────
  const clearHistory = useCallback(() => {
    setHistory([]);
    setStreamedText('');
    setTranscript('');
    streamBufferRef.current = '';
  }, []);

  return {
    // State
    isRecording,
    isProcessing,
    isConnected,
    isStreaming,
    transcript,
    streamedText,
    history,
    error,
    // Actions
    startRecording,
    stopRecording,
    sendTranscript,
    disconnect,
    clearHistory,
  };
}
