const ws = new WebSocket('ws://localhost:8080/ws/iss');
const start = Date.now();
let catalog = false;
let ticks = 0;

ws.addEventListener('open', () => console.log(`[+${Date.now() - start}ms]  open`));

ws.addEventListener('message', (event) => {
  const msg = JSON.parse(event.data);
  if (msg.type === 'catalog') {
    catalog = true;
    console.log(
      `[+${Date.now() - start}ms]  catalog: ${msg.satellites.length} sats; first=${msg.satellites[0].name}`,
    );
  } else if (msg.type === 'tick') {
    ticks++;
    if (ticks <= 1) {
      const iss = msg.satellites.find((s) => s.id === 25544);
      console.log(
        `[+${Date.now() - start}ms]  first tick: seq=${msg.seq}, sats=${msg.satellites.length}, ` +
          `ISS_ecef_km=[${iss?.ecef_km.map((v) => v.toFixed(2)).join(', ')}], ` +
          `ISS_alt_km=${iss?.alt_km?.toFixed(2)}`,
      );
    }
  }
});

ws.addEventListener('close', () => {
  console.log(`[+${Date.now() - start}ms]  closed; catalog=${catalog}, ticks=${ticks}`);
  process.exit(catalog && ticks > 0 ? 0 : 1);
});

ws.addEventListener('error', (err) => console.error('err:', err.message));

setTimeout(() => ws.close(), 2500);
