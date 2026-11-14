const CACHE_NAME = 'littlefox-study-calendar-journey-v1';
const APP_FILES = ['./', './index.html', './app.css', './app.js', './manifest.json', './icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith('/data/records.json')) {
    event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put('./data/records.json', copy)); return response;
    }).catch(() => caches.match('./data/records.json')));
    return;
  }
  event.respondWith(fetch(event.request, {cache:'no-store'}).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || caches.match('./index.html'))));
});
