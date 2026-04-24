/**
 * src/components/MicButton/MicButton.jsx
 * ────────────────────────────────────────
 * Highly stylised microphone / stop button.
 * States: idle | recording (gold + ripple rings) | processing (spinner)
 */

import { memo } from 'react';
import styles from './MicButton.module.css';

/* ── Icons ──────────────────────────────────────────────────────────────── */

function MicIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="22"/>
      <line x1="9"  y1="22" x2="15" y2="22"/>
    </svg>
  );
}

function StopIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"
      aria-hidden="true">
      <rect x="5" y="5" width="14" height="14" rx="3"/>
    </svg>
  );
}

/* ── Component ──────────────────────────────────────────────────────────── */

/**
 * @param {object}   props
 * @param {boolean}  props.isRecording   - Mic is active
 * @param {boolean}  props.isProcessing  - Transcribing audio
 * @param {boolean}  props.disabled      - LLM streaming, disallow interaction
 * @param {function} props.onStart
 * @param {function} props.onStop
 */
export const MicButton = memo(function MicButton({
  isRecording,
  isProcessing = false,
  disabled = false,
  onStart,
  onStop,
}) {
  const buttonClass = [
    styles.button,
    isRecording ? styles.recording : styles.idle,
  ].join(' ');

  return (
    <div
      className={`${styles.wrapper} ${isRecording ? styles.recording : ''}`}
      aria-live="polite"
    >
      {/* Ripple rings — CSS-only, rendered whenever .recording is on wrapper */}
      <span className={styles.ring + ' ' + styles.ring1} aria-hidden="true" />
      <span className={styles.ring + ' ' + styles.ring2} aria-hidden="true" />
      <span className={styles.ring + ' ' + styles.ring3} aria-hidden="true" />

      {/* Processing spinner overlay */}
      {isProcessing && (
        <span className={styles.spinner} aria-hidden="true" />
      )}

      <button
        id="mic-btn"
        type="button"
        className={buttonClass}
        aria-label={
          isRecording ? 'Stop recording' :
          isProcessing ? 'Processing audio…' :
          'Start voice input'
        }
        aria-pressed={isRecording}
        disabled={disabled || isProcessing}
        onClick={isRecording ? onStop : onStart}
      >
        {isRecording
          ? <StopIcon className={styles.icon} />
          : <MicIcon  className={styles.icon} />
        }
      </button>
    </div>
  );
});
