/*
 * Service Worker des Notenbuchs: hält den Programmcode für den Offline-Start vor.
 * Er speichert KEINE Notendaten und sendet nichts ins Internet; er lädt nur die eigenen Dateien
 * von der Adresse, von der die App stammt. __VERSION__ ersetzt der Build durch eine Prüfsumme.
 */
const VERSION = 'd8719c4ee907';
const CACHE = `notenbuch-${VERSION}`;
const DATEIEN = ['./notenbuch.html', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './icon-maskable-512.png', './apple-touch-icon.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(DATEIEN.map((d) => new Request(d, { cache: 'reload' })))));
  // kein skipWaiting: eine neue Version wird erst nach „Jetzt neu laden“ aktiv
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('notenbuch-') && k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // Seitenaufrufe (auch mit #/… oder ?v=…) immer aus dem Programm-Cache
    if (req.mode === 'navigate') {
      const seite = (await cache.match('./notenbuch.html')) ?? (await cache.match(req, { ignoreSearch: true }));
      if (seite) return seite;
    }
    const treffer = await cache.match(req, { ignoreSearch: true });
    if (treffer) return treffer;
    try {
      return await fetch(req);
    } catch {
      return (await cache.match('./notenbuch.html')) ?? Response.error();
    }
  })());
});
