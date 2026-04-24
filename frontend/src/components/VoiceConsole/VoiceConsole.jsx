/**
 * src/components/VoiceConsole/VoiceConsole.jsx
 * ──────────────────────────────────────────────
 * The single central interface panel that contains:
 *   • Top bar — brand title + ConnectionPill status
 *   • Response area — idle state / transcript bubble / streaming text
 *   • Bottom bar — MicButton at centre + mic hint label + clear action
 *
 * This component is purely presentational: all state/logic flows in via props
 * from useVoiceStream (wired in App.jsx).
 */

import { useEffect, useRef, useCallback } from 'react';
import { ConnectionPill } from '../ConnectionPill/ConnectionPill';
import { MicButton }      from '../MicButton/MicButton';
import { ResponseStream } from '../ResponseStream/ResponseStream';
import styles from './VoiceConsole.module.css';

/* ── Idle state graphic ─────────────────────────────────────────────────── */
function IdleState() {
  return (
    <div className={styles.idleState}>
      <div className={styles.idleIcon} aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
        </svg>
      </div>
      <p className={styles.idleText}>
        Tap the mic and ask me anything about your finances
      </p>
    </div>
  );
}

/* ── Main component ─────────────────────────────────────────────────────── */

/**
 * @param {object}   props
 * @param {boolean}  props.isRecording
 * @param {boolean}  props.isProcessing  - Transcribing audio (spinner on mic)
 * @param {boolean}  props.isConnected
 * @param {boolean}  props.isStreaming
 * @param {string}   props.transcript
 * @param {string}   props.streamedText
 * @param {string|null} props.error
 * @param {function} props.onStartRecording
 * @param {function} props.onStopRecording
 * @param {function} props.onClear
 */
export function VoiceConsole({
  isRecording,
  isProcessing,
  isConnected,
  isStreaming,
  transcript,
  streamedText,
  error,
  onStartRecording,
  onStopRecording,
  onClear,
}) {
  const responseRef = useRef(null);

  /* Auto-scroll to bottom as new text arrives */
  useEffect(() => {
    if (responseRef.current && (isStreaming || streamedText)) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [streamedText, isStreaming]);

  const showResponse  = isStreaming || !!streamedText;
  const showTranscript = !!transcript;
  const showClear     = (!!transcript || !!streamedText) && !isStreaming && !isRecording;

  const micHintText = isRecording
    ? 'Listening — tap to send'
    : isProcessing
      ? 'Processing audio…'
      : isStreaming
        ? 'Astra is responding…'
        : 'Hold to record, tap to speak';

  return (
    <div className={styles.page}>
      {/* ── Floating brand header ──────────────────────────────────────── */}
      <header className={styles.header} role="banner">
        <div className={styles.brand}>
          <div className={styles.brandGlyph} aria-hidden="true">✦</div>
          <span className={styles.brandName}>Astra</span>
        </div>
      </header>

      {/* ── Central frosted-glass console card ────────────────────────── */}
      <main
        className={`${styles.console} ${isRecording ? styles.recording : ''}`}
        aria-label="Voice assistant console"
      >
        <div className={styles.consoleInner}>

          {/* Top strip */}
          <div className={styles.consoleTop}>
            <span className={styles.consoleTitle}>Voice Assistant</span>
            <ConnectionPill
              isConnected={isConnected}
              isStreaming={isStreaming}
              isRecording={isRecording}
              error={error}
            />
          </div>

          {/* Scrollable response area */}
          <div className={styles.responseArea} ref={responseRef}>

            {/* Error */}
            {error && !isRecording && (
              <div className={styles.errorPill} role="alert">
                {error}
              </div>
            )}

            {/* Response text */}
            {showResponse ? (
              <ResponseStream
                streamedText={streamedText}
                isStreaming={isStreaming}
              />
            ) : (
              <IdleState />
            )}

            {/* User transcript bubble */}
            {showTranscript && (
              <div className={styles.transcriptPill}>
                <p className={styles.transcriptLabel}>You</p>
                <p className={styles.transcriptText}>{transcript}</p>
              </div>
            )}
          </div>

          {/* Bottom mic section */}
          <div className={styles.consoleBottom}>
            <MicButton
              isRecording={isRecording}
              isProcessing={isProcessing}
              disabled={isStreaming}
              onStart={onStartRecording}
              onStop={onStopRecording}
            />

            <p className={`${styles.micHint} ${isRecording || isStreaming ? styles.active : ''}`}>
              {micHintText}
            </p>

            {showClear && (
              <div className={styles.actionRow}>
                <button
                  id="clear-btn"
                  type="button"
                  className={styles.clearBtn}
                  onClick={onClear}
                  aria-label="Clear conversation"
                >
                  Clear conversation
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
