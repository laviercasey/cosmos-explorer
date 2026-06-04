'use client';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error: _error, reset }: ErrorProps) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          padding: 40,
          fontFamily: "'Courier New', monospace",
          color: '#aabbdd',
          background: '#00000a',
          minHeight: '100vh',
        }}
      >
        <h2 style={{ color: '#ff6666', marginBottom: 16 }}>Something went wrong</h2>
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
      </body>
    </html>
  );
}
