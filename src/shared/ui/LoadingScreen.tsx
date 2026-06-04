import type { CSSProperties } from 'react';

interface LoadingScreenProps {
  readonly message?: string;
}

const containerStyle: CSSProperties = {
  width: '100%',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#00000a',
  color: '#aabbdd',
  fontFamily: "'Courier New', monospace",
  fontSize: 13,
  letterSpacing: '0.25em',
};

const glyphStyle: CSSProperties = {
  color: '#44aaff',
  fontSize: 22,
  marginBottom: 14,
  opacity: 0.75,
  animation: 'cosmos-loading-pulse 1.4s ease-in-out infinite',
};

const keyframes = `@keyframes cosmos-loading-pulse {
  0%, 100% { opacity: 0.35; transform: scale(0.95); }
  50% { opacity: 0.9; transform: scale(1.1); }
}`;

export default function LoadingScreen({ message = 'LOADING UNIVERSE…' }: LoadingScreenProps) {
  return (
    <div style={containerStyle}>
      <style>{keyframes}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={glyphStyle}>✦</div>
        <div>{message}</div>
      </div>
    </div>
  );
}

export type { LoadingScreenProps };
