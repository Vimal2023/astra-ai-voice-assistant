/**
 * src/components/VoiceButton/VoiceButton.jsx
 * ────────────────────────────────────────────
 * Mic toggle button. Purely presentational — receives isRecording + callbacks.
 */

import styles from './VoiceButton.module.css';

/** Mic SVG icon */
function MicIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8"  y1="23" x2="16" y2="23" />
    </svg>
  );
}

/** Stop icon shown while recording */
function StopIcon() {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

/**
 * @param {object}   props
 * @param {boolean}  props.isRecording
 * @param {boolean}  props.disabled
 * @param {function} props.onStart
 * @param {function} props.onStop
 */
export function VoiceButton({ isRecording, disabled = false, onStart, onStop }) {
  const label = isRecording ? 'Stop' : 'Speak';

  return (
    <div className={styles.wrapper}>
      <button
        id="voice-btn"
        type="button"
        className={`${styles.button} ${isRecording ? styles.recording : ''}`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        aria-pressed={isRecording}
        disabled={disabled}
        onClick={isRecording ? onStop : onStart}
      >
        {isRecording ? <StopIcon /> : <MicIcon />}
      </button>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
