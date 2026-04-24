/**
 * src/components/ConnectionPill/ConnectionPill.jsx
 * ─────────────────────────────────────────────────
 * Compact status indicator pill shown at the top of the console card.
 */

import { memo } from 'react';
import styles from './ConnectionPill.module.css';

function resolveState(isConnected, isStreaming, isRecording) {
  if (isRecording) return { key: 'recording', label: 'Recording' };
  if (isStreaming)  return { key: 'streaming', label: 'Streaming' };
  if (isConnected)  return { key: 'connected', label: 'Connected' };
  return { key: 'disconnected', label: 'Disconnected' };
}

export const ConnectionPill = memo(function ConnectionPill({
  isConnected,
  isStreaming,
  isRecording,
  error,
}) {
  const { key, label } = error
    ? { key: 'error', label: 'Error' }
    : resolveState(isConnected, isStreaming, isRecording);

  const isActive = isStreaming || isRecording;

  return (
    <div
      id="connection-pill"
      className={`${styles.pill} ${isActive ? styles.active : ''}`}
      role="status"
      aria-live="polite"
      aria-label={`Status: ${label}`}
    >
      <span className={`${styles.dot} ${styles[key]}`} aria-hidden="true" />
      {label}
    </div>
  );
});
