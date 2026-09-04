const RELOAD_MARKER = 'mapasafico:dynamic-import-reload'
const RELOAD_COOLDOWN_MS = 30_000

export function isDynamicImportFailure(error) {
  const message = String(error?.message || error || '')
  return /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed|unable to preload css/i.test(message)
}

export function recoverFromDynamicImportFailure(error, browser = globalThis.window, now = Date.now()) {
  if (!isDynamicImportFailure(error) || !browser?.location) return false

  let lastReload
  try {
    lastReload = Number(browser.sessionStorage?.getItem(RELOAD_MARKER)) || 0
  } catch {
    // Evita um ciclo de recargas caso o navegador bloqueie o sessionStorage.
    return false
  }

  if (now - lastReload < RELOAD_COOLDOWN_MS) return false

  try {
    browser.sessionStorage?.setItem(RELOAD_MARKER, String(now))
  } catch {
    return false
  }

  browser.location.reload()
  return true
}

export function importWithRecovery(loader) {
  return loader().catch(error => {
    if (recoverFromDynamicImportFailure(error)) {
      return new Promise(() => {})
    }
    throw error
  })
}

export function installDynamicImportRecovery(browser = globalThis.window) {
  if (!browser?.addEventListener) return

  browser.addEventListener('vite:preloadError', event => {
    if (recoverFromDynamicImportFailure(event?.payload || event, browser)) {
      event.preventDefault?.()
    }
  })
}
