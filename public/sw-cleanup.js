// Kill-switch service worker for the legacy `vite-plugin-pwa` registration.
//
// During the Vite era the app registered `/sw.js` (or `/registerSW.js`) which
// installed Workbox-based runtime caching. Returning users may still have that
// SW active when they hit the new Next.js build — and stale Workbox caches can
// serve old HTML/RSC payloads that no longer match the deployed routes.
//
// Deployment runbook:
//   For at least ONE release after the Next.js cutover, the old SW URL must be
//   served WITH THIS FILE'S CONTENTS (typed: `application/javascript`, no SW
//   `Cache-Control` — must always re-fetch). Once metrics show no remaining
//   legacy SW installs, this file can be removed.
//
// What it does on activation:
//   1. Unregisters itself (so the browser stops invoking it on future loads).
//   2. Deletes every Cache Storage entry — wiping any leftover Workbox caches.
//   3. Tells all open clients to reload, so they pick up the new Next.js SW
//      (`/sw.js` from @serwist/next) on the next request.

self.addEventListener('install', () => {
  // Take over as soon as installed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        // Wipe any caches Workbox / vite-plugin-pwa created.
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      } catch (err) {
        // Best-effort cleanup — never break clients.
        // eslint-disable-next-line no-console
        console.warn('[sw-cleanup] cache wipe failed:', err);
      }

      try {
        await self.registration.unregister();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[sw-cleanup] unregister failed:', err);
      }

      // Reload open tabs so they pick up the new SW (or none).
      try {
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          client.navigate(client.url);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('[sw-cleanup] client reload failed:', err);
      }
    })(),
  );
});

// Pass through fetches untouched while we're alive (until activate completes).
self.addEventListener('fetch', () => {
  // No-op: let the browser handle the network request normally.
});
