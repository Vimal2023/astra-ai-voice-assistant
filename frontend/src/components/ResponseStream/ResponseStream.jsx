/**
 * src/components/ResponseStream/ResponseStream.jsx
 * ──────────────────────────────────────────────────
 * Renders the AI response with a word-by-word fade-in animation.
 *
 * Animation strategy:
 *   • `streamedText` is split into words at render time.
 *   • A stable `React.key` is assigned to each word = its cumulative index.
 *   • Because new words *append* and old words keep the same key, React only
 *     mounts the *new* word nodes → the CSS `wordIn` animation fires only on
 *     those, giving a natural word-by-word reveal with zero JS timing logic.
 *   • The component is wrapped in `memo` and only re-renders when
 *     `streamedText`, `isStreaming`, or `isThinking` changes.
 */

import { memo, useMemo } from 'react';
import styles from './ResponseStream.module.css';

export const ResponseStream = memo(function ResponseStream({
  streamedText,
  isStreaming,
}) {
  const isThinking = isStreaming && !streamedText;

  /**
   * Split text into tokens that preserve whitespace so " word" keeps its
   * leading space. We split on whitespace boundary, keeping the delimiter.
   */
  const tokens = useMemo(() => {
    if (!streamedText) return [];
    // Split so each token is either whitespace or a word group
    return streamedText.match(/\S+|\s+/g) || [];
  }, [streamedText]);

  return (
    <div
      className={styles.root}
      role="region"
      aria-label="Astra response"
      aria-live="polite"
      aria-atomic="false"
    >
      {isThinking ? (
        /* Animated thinking dots while waiting for first token */
        <div className={styles.thinking} aria-label="Thinking…">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </div>
      ) : (
        <p className={styles.body}>
          {tokens.map((token, i) => (
            <span
              key={i}
              className={/\S/.test(token) ? styles.word : undefined}
              /* Pure whitespace tokens don't need the animation class */
            >
              {token}
            </span>
          ))}
          {isStreaming && (
            <span className={styles.cursor} aria-hidden="true" />
          )}
        </p>
      )}
    </div>
  );
});
