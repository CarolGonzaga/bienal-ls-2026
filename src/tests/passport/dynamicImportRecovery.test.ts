import test from 'node:test'
import assert from 'node:assert/strict'
import {
  isDynamicImportFailure,
  recoverFromDynamicImportFailure,
} from '../../lib/dynamicImportRecovery.js'

function fakeBrowser(lastReload = null) {
  const values = new Map(lastReload == null ? [] : [['mapasafico:dynamic-import-reload', String(lastReload)]])
  let reloads = 0
  return {
    sessionStorage: {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    location: { reload: () => { reloads += 1 } },
    reloadCount: () => reloads,
  }
}

test('reconhece falha de módulo dinâmico publicada pelo Vite', () => {
  assert.equal(isDynamicImportFailure(new TypeError('Failed to fetch dynamically imported module: /assets/BookShowcase-old.js')), true)
  assert.equal(isDynamicImportFailure(new Error('Falha comum da API')), false)
})

test('recarrega uma vez para buscar o HTML e os módulos da publicação atual', () => {
  const browser = fakeBrowser()
  const recovered = recoverFromDynamicImportFailure(
    new TypeError('Failed to fetch dynamically imported module: /assets/old.js'),
    browser,
    100_000,
  )

  assert.equal(recovered, true)
  assert.equal(browser.reloadCount(), 1)
  assert.equal(browser.sessionStorage.getItem('mapasafico:dynamic-import-reload'), '100000')
})

test('evita ciclo infinito de recargas quando o servidor continua indisponível', () => {
  const browser = fakeBrowser(90_000)
  const recovered = recoverFromDynamicImportFailure(
    new TypeError('Failed to fetch dynamically imported module: /assets/old.js'),
    browser,
    100_000,
  )

  assert.equal(recovered, false)
  assert.equal(browser.reloadCount(), 0)
})
