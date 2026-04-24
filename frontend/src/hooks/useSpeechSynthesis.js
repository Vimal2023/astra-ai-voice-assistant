/**
 * src/hooks/useSpeechSynthesis.js
 * ────────────────────────────────
 * Thin wrapper around the native Web Speech API (window.speechSynthesis).
 *
 * Design decisions:
 *   • Voice list is populated on mount AND on the `voiceschanged` event,
 *     because Chrome loads voices asynchronously after page load.
 *   • Voice priority:  Google US English  →  Google UK English
 *                   →  any en-US voice    →  any English voice
 *                   →  browser default
 *   • speakText() always cancels ongoing speech first so a new response
 *     never stutters over a previous one.
 *   • The hook is side-effect-free when speechSynthesis is unavailable
 *     (e.g. server-side rendering / unsupported browser).
 */

import { useCallback, useEffect, useRef } from 'react';

const SS = typeof window !== 'undefined' ? window.speechSynthesis : null;

/** Pick the best available English voice from the browser's list. */
function pickVoice(voices) {
  if (!voices.length) return null;

  // 1. Google US English (Chrome / Edge on most platforms)
  const googleUS = voices.find(
    (v) => v.name === 'Google US English' && v.lang === 'en-US',
  );
  if (googleUS) return googleUS;

  // 2. Google UK English Female / Male
  const googleUK = voices.find(
    (v) => v.name.startsWith('Google UK English') && v.lang.startsWith('en'),
  );
  if (googleUK) return googleUK;

  // 3. Any en-US voice
  const anyUS = voices.find((v) => v.lang === 'en-US');
  if (anyUS) return anyUS;

  // 4. Any English voice
  const anyEn = voices.find((v) => v.lang.startsWith('en'));
  if (anyEn) return anyEn;

  return null; // let the browser use its default
}

export function useSpeechSynthesis() {
  const voiceRef = useRef(null); // cached preferred voice

  // ── Populate voice ref (handles async Chrome voice loading) ──────────────
  const loadVoice = useCallback(() => {
    if (!SS) return;
    const voices = SS.getVoices();
    voiceRef.current = pickVoice(voices);
  }, []);

  useEffect(() => {
    if (!SS) return;

    loadVoice(); // synchronous on Firefox / Safari
    SS.addEventListener('voiceschanged', loadVoice); // async on Chrome

    return () => {
      SS.removeEventListener('voiceschanged', loadVoice);
      SS.cancel(); // stop any lingering speech on unmount
    };
  }, [loadVoice]);

  // ── Public API ────────────────────────────────────────────────────────────
  const speakText = useCallback((text) => {
    if (!SS || !text?.trim()) return;

    // Cancel any ongoing / queued utterances
    SS.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    // Apply preferred voice if we have one
    if (voiceRef.current) {
      utterance.voice = voiceRef.current;
      utterance.lang = voiceRef.current.lang;
    } else {
      utterance.lang = 'en-US';
    }

    utterance.rate = 1.0;   // natural speed
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onerror = (e) => {
      // 'interrupted' fires when we call cancel() ourselves — safe to ignore
      if (e.error !== 'interrupted') {
        console.warn('[useSpeechSynthesis] utterance error:', e.error);
      }
    };

    SS.speak(utterance);
  }, []);

  const cancelSpeech = useCallback(() => {
    SS?.cancel();
  }, []);

  return { speakText, cancelSpeech };
}
