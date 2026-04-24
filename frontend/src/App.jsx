/**
 * src/App.jsx
 * ────────────
 * Root — wires useVoiceStream into VoiceConsole.
 * Zero imperative logic here; pure state-to-props mapping.
 */

import { useCallback } from 'react';
import { useVoiceStream } from './hooks/useVoiceStream';
import { VoiceConsole }  from './components/VoiceConsole/VoiceConsole';

export default function App() {
  const {
    isRecording,
    isProcessing,
    isConnected,
    isStreaming,
    transcript,
    streamedText,
    error,
    startRecording,
    stopRecording,
    clearHistory,
  } = useVoiceStream();

  const handleClear = useCallback(() => clearHistory(), [clearHistory]);

  return (
    <VoiceConsole
      isRecording={isRecording}
      isProcessing={isProcessing}
      isConnected={isConnected}
      isStreaming={isStreaming}
      transcript={transcript}
      streamedText={streamedText}
      error={error}
      onStartRecording={startRecording}
      onStopRecording={stopRecording}
      onClear={handleClear}
    />
  );
}
