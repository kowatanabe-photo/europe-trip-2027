/* Offline support: network first (so updates show up right away), falling back to the
   last copy in the cache when there is no signal or the network is very slow. */
const CACHE = 'europe-trip-2027';
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['./', 'vendor/leaflet/leaflet.js', 'vendor/leaflet/leaflet.css', 'vendor/pdf/html2canvas.min.js', 'vendor/pdf/jspdf.umd.min.js'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return; // map tiles etc. go straight to the network
  const nav = req.mode === 'navigate';
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const net = fetch(req).then(r => { if (r.ok) c.put(nav ? './' : req, r.clone()); return r; });
    const cached = nav ? await c.match('./') : await c.match(req);
    if (!cached) return net;
    return Promise.race([net.catch(() => cached), new Promise(res => setTimeout(() => res(cached), 3500))]);
  })());
});
