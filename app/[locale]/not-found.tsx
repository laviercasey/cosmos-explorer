import Link from 'next/link';

export default function LocaleNotFound() {
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
      <h1 style={{ color: '#44aaff', marginTop: 0 }}>404 — Not Found</h1>
      <p style={{ marginBottom: 24 }}>The page you are looking for does not exist.</p>
      <Link href="/" style={{ color: '#44aaff' }}>
        Return home
      </Link>
    </main>
  );
}
