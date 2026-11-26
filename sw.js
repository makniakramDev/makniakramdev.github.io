/* #EpikNOW service worker — offline cache + OneSignal Web Push. Build: mwwx4lts */
try { importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js'); } catch (e) { /* offline at install: push loads next time */ }

const CACHE = 'epiknow-mwwx4lts';
const SHELL = ['/', '/manifest.webmanifest', '/img/logo-now.png', '/img/epik-white.png', '/img/coin.png', '/img/background.jpg',
  '/fonts/bebas-neue.woff2', '/fonts/cairo.woff2', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('epiknow-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && res.ok && res.type === 'basic') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;                 // Supabase, OneSignal: always network

  if (req.mode === 'navigate') {                              // pages: network first, cached copy offline
    const fallback = url.pathname.startsWith('/admin') ? '/admin.html' : '/';
    e.respondWith(fetch(req).then((r) => put(url.pathname.startsWith('/admin') ? req : new Request('/'), r))
      .catch(() => caches.match(url.pathname.startsWith('/admin') ? req : '/').then((r) => r || caches.match(fallback))));
    return;
  }
  if (url.pathname.startsWith('/assets/')) {                  // hashed build files: cache first
    e.respondWith(caches.match(req).then((r) => r || fetch(req).then((x) => put(req, x))));
    return;
  }
  if (/^\/(img|fonts|icons)\//.test(url.pathname)) {          // images, fonts: cache, refresh in background
    e.respondWith(caches.match(req).then((r) => { const net = fetch(req).then((x) => put(req, x)).catch(() => r); return r || net; }));
  }
});
