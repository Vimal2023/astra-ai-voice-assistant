/**
 * src/components/StreamDisplay/StreamDisplay.jsx
 * ─────────────────────────────────────────────────
 * Displays the user transcript and the streaming AI response.
 *
 * Performance notes:
 *   • This component consumes the `streamedText` string that is already
 *     rate-limited by the RAF loop in useVoiceStream, so it re-renders at
 *     most ~60 fps regardless of token speed.
 *   • The blinking cursor is CSS-only — no JS involved.
 */

import { memo } from 'react';
import styles from './StreamDisplay.module.css';

export const StreamDisplay = memo(function StreamDisplay({
  transcript,
  streamedText,
  isStreaming,
}) {
  return (
    <div className={styles.container} role="region" aria-label="Conversation">
      {/* ── User transcript ────────────────────────────────────── */}
      {transcript && (
        <div>
          <p className={styles.transcriptLabel}>You said</p>
          <p className={styles.transcript}>{transcript}</p>
        </div>
      )}

      {/* ── AI response ────────────────────────────────────────── */}
      <div
        id="ai-response"
        className={`${styles.responseBubble} ${isStreaming ? styles.streaming : ''}`}
        aria-live="polite"
        aria-atomic="false"
        aria-label="AI response"
      >
        {streamedText ? (
          <>
            {streamedText}
            {isStreaming && (
              <span className={styles.cursor} aria-hidden="true" />
            )}
          </>
        ) : (
          <span className={styles.placeholder}>
            {isStreaming ? 'Thinking…' : 'Response will appear here'}
          </span>
        )}
      </div>
    </div>
  );
});
