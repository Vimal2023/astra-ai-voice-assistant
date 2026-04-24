/**
 * src/api/audioApi.js
 * ────────────────────
 * All REST calls related to audio / speech-to-text.
 */

import httpClient from './httpClient';

/**
 * Upload an audio Blob to the backend for Whisper transcription.
 *
 * @param {Blob} audioBlob  - Raw audio captured by the browser's MediaRecorder.
 * @param {string} filename - Suggested filename (determines MIME type on server).
 * @returns {Promise<{transcript: string, language: string|null, model_used: string}>}
 */
export async function transcribeAudio(audioBlob, filename = 'recording.webm') {
  const formData = new FormData();
  formData.append('file', audioBlob, filename);

  const { data } = await httpClient.post('/audio/transcribe', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}
