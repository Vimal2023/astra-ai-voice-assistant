/**
 * src/hooks/useMediaRecorder.js
 * ──────────────────────────────
 * Focused hook for raw MediaRecorder control, decoupled from WebSocket logic.
 * Import this if you need standalone microphone access outside useVoiceStream.
 *
 * Returns:
 *   { isRecording, audioBlob, startRecording, stopRecording, error }
 */

import { useCallback, useRef, useState } from 'react';

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

function getSupportedMimeType() {
  return (
    PREFERRED_MIME_TYPES.find((t) => MediaRecorder.isTypeSupported(t)) || ''
  );
}

export function useMediaRecorder({ onStop } = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    chunksRef.current = [];

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
    } catch (err) {
      setError('Microphone access denied.');
      return;
    }

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType } : {},
    );
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, {
        type: mimeType || 'audio/webm',
      });
      setAudioBlob(blob);
      onStop?.(blob);
      chunksRef.current = [];
    };

    recorder.start(250);
    setIsRecording(true);
  }, [onStop]);

  const stopRecording = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') {
      recorderRef.current?.stop();
    }
    setIsRecording(false);
  }, []);

  return { isRecording, audioBlob, startRecording, stopRecording, error };
}
