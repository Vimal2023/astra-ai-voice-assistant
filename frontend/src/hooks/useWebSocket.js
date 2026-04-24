/**
 * src/hooks/useWebSocket.js
 * ──────────────────────────
 * Low-level, reusable WebSocket hook.
 * useVoiceStream consumes this internally; use it standalone for
 * other parts of the app that need raw WS access.
 *
 * Returns:
 *   { isConnected, lastMessage, sendMessage, connect, disconnect }
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const RECONNECT_BASE_DELAY_MS = 2_000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * @param {string}   url           - Full WebSocket URL.
 * @param {object}   [options]
 * @param {function} [options.onMessage]   - Called with each parsed message.
 * @param {function} [options.onOpen]
 * @param {function} [options.onClose]
 * @param {boolean}  [options.autoConnect] - Connect immediately on mount (default: true).
 */
export function useWebSocket(url, options = {}) {
  const { onMessage, onOpen, onClose, autoConnect = true } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);
  const isMountedRef = useRef(true);
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);
  const onCloseRef = useRef(onClose);

  // Keep callback refs current without re-triggering effect
  useEffect(() => { onMessageRef.current = onMessage; }, [onMessage]);
  useEffect(() => { onOpenRef.current = onOpen; }, [onOpen]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState <= WebSocket.OPEN) return;
    clearTimeout(timerRef.current);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      attemptsRef.current = 0;
      setIsConnected(true);
      onOpenRef.current?.();
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      let parsed;
      try { parsed = JSON.parse(event.data); } catch { parsed = event.data; }
      setLastMessage(parsed);
      onMessageRef.current?.(parsed);
    };

    ws.onerror = () => {};  // errors surface via onclose

    ws.onclose = (event) => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      onCloseRef.current?.(event);

      if (
        event.code !== 1000 &&
        attemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        attemptsRef.current += 1;
        const delay = RECONNECT_BASE_DELAY_MS * attemptsRef.current;
        timerRef.current = setTimeout(connect, delay);
      }
    };
  }, [url]);

  const disconnect = useCallback(() => {
    clearTimeout(timerRef.current);
    attemptsRef.current = MAX_RECONNECT_ATTEMPTS;
    wsRef.current?.close(1000, 'Disconnected by user');
  }, []);

  const sendMessage = useCallback((data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof data === 'string' ? data : JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    if (autoConnect) connect();
    return () => {
      isMountedRef.current = false;
      clearTimeout(timerRef.current);
      wsRef.current?.close(1000, 'Component unmounted');
    };
  }, [connect, autoConnect]);

  return { isConnected, lastMessage, sendMessage, connect, disconnect };
}
