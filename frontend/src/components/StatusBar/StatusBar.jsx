/**
 * src/components/StatusBar/StatusBar.jsx
 * ────────────────────────────────────────
 * Tiny indicator showing WebSocket connection + streaming state.
 */

import { memo } from 'react';
import styles from './StatusBar.module.css';

function getDotClass(isConnected, isStreaming) {
  if (isStreaming) return styles.streaming;
  if (isConnected) return styles.connected;
  return styles.disconnected;
}

function getLabel(isConnected, isStreaming, isRecording) {
  if (isRecording) return 'Recording…';
  if (isStreaming) return 'Streaming response…';
  if (isConnected) return 'Connected';
  return 'Disconnected';
}

export const StatusBar = memo(function StatusBar({
  isConnected,
  isStreaming,
  isRecording,
  error,
}) {
  const dotClass = error
    ? styles.error
    : getDotClass(isConnected, isStreaming);

  const label = error || getLabel(isConnected, isStreaming, isRecording);

  return (
    <div
      id="status-bar"
      className={styles.bar}
      role="status"
      aria-live="polite"
      aria-label={`Connection status: ${label}`}
    >
      <span className={`${styles.dot} ${dotClass}`} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
});
