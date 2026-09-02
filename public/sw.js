// Alterar a versão invalida a resposta antiga do service worker quando há nova publicação.
const CACHE_NAME = 'mapasafico-v4'
const OFFLINE_ASSET_CACHE = 'mapasafico-offline-assets-v1'
const BASE = '/mapasaficobienal'
const APP_SHELL = [`${BASE}/login`, `${BASE}/index.html`, `${BASE}/manifest.json`, `${BASE}/logo-icon.png`, `${BASE}/logo-texto.png`, `${BASE}/logo-completo.png`, `${BASE}/logo-ls-watermark.png`]

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => ![CACHE_NAME, OFFLINE_ASSET_CACHE].includes(key)).map(key => caches.delete(key)))).then(() => self.clients.claim()))
})

self.addEventListener('fetch', event => {
  const request = event.request
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) {
    event.respondWith(caches.match(request).then(cached => cached || fetch(request)))
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(response => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then(cache => cache.put(`${BASE}/index.html`, copy))
      return response
    }).catch(() => caches.match(`${BASE}/index.html`)))
    return
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    const cacheCopy = response.clone()
    if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, cacheCopy))
    return response
  })))
})
