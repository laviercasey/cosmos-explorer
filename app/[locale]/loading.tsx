export default function Loading() {
  return (
    <main
      style={{
        padding: 40,
        fontFamily: "'Courier New', monospace",
        color: '#334466',
        background: '#00000a',
        minHeight: '100vh',
      }}
      aria-busy="true"
      aria-live="polite"
    >
      <p>Loading…</p>
    </main>
  );
}
