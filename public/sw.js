// Alterar a versão invalida a resposta antiga do service worker quando há nova publicação.
const CACHE_NAME = 'mapasafico-v8'
const OFFLINE_ASSET_CACHE = 'mapasafico-offline-assets-v1'
const BASE = '/mapasaficobienal'
// Preenchido no diretório dist durante o build com todos os módulos, estilos e fontes versionados.
const BUILD_ASSETS = []
const APP_SHELL = [`${BASE}/login`, `${BASE}/index.html`, `${BASE}/manifest.json`, `${BASE}/logo-icon.png`, `${BASE}/logo-texto.png`, `${BASE}/logo-completo.png`, `${BASE}/logo-ls-watermark.png`]

function isCacheableResponse(url, response) {
  if (!response.ok) return false
  if (!url.pathname.startsWith(`${BASE}/assets/`)) return true

  // Uma regra de fallback do servidor pode devolver index.html para um chunk
  // antigo. Nunca salve esse HTML sob a URL de um módulo JavaScript ou CSS.
  const contentType = response.headers.get('content-type') || ''
  return !contentType.includes('text/html')
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll([...APP_SHELL, ...BUILD_ASSETS])).then(() => self.skipWaiting()))
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => ![CACHE_NAME, OFFLINE_ASSET_CACHE].includes(key)).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => Promise.allSettled(clients.map(client => client.navigate(client.url))))
  )
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
    event.respondWith(fetch(request, { cache: 'no-store' }).then(response => {
      const copy = response.clone()
      caches.open(CACHE_NAME).then(cache => cache.put(`${BASE}/index.html`, copy))
      return response
    }).catch(() => caches.match(`${BASE}/index.html`)))
    return
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    const cacheCopy = response.clone()
    if (isCacheableResponse(url, response)) caches.open(CACHE_NAME).then(cache => cache.put(request, cacheCopy))
    return response
  })))
})
