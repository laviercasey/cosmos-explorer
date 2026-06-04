'use client';

interface LocaleErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function LocaleError({ error: _error, reset }: LocaleErrorProps) {
  return (
    <main
      style={{
        padding: 40,
        fontFamily: "'Courier New', monospace",
        color: '#aabbdd',
        background: '#00000a',
        minHeight: '100vh',
      }}
    >
      <h2 style={{ color: '#ff6666', marginTop: 0 }}>Something went wrong</h2>
      <p style={{ marginBottom: 24 }}>An unexpected error occurred while loading this page.</p>
      <button
        type="button"
        onClick={() => {
          reset();
        }}
        style={{
          background: '#44aaff',
          color: '#00000a',
          border: 'none',
          padding: '10px 20px',
          cursor: 'pointer',
          fontFamily: "'Courier New', monospace",
          fontSize: 14,
        }}
      >
        Try again
      </button>
    </main>
  );
}
