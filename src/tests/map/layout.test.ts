import test from 'node:test'
import assert from 'node:assert/strict'
import { MAP_HEIGHT, MAP_WIDTH, OFFICIAL_LAYOUT_FEATURES, buildMapLayout } from '../../data/map/map-layout.ts'
import { validateLayout } from '../../services/mapLayoutValidationService.ts'
import {
  mapToReference,
  referenceToMap
} from '../../data/map/map-reference-calibration.ts'

test('layout usa o viewBox do novo guia 2D', () => {
  assert.equal(MAP_WIDTH, 1920)
  assert.equal(MAP_HEIGHT, 1080)
})

test('MAPA.png e SVG compartilham coordenadas nativas idênticas', () => {
  assert.deepEqual(referenceToMap({ x: 0, y: 0 }), { x: 0, y: 0 })
  assert.deepEqual(referenceToMap({ x: 1920, y: 1080 }), { x: 1920, y: 1080 })
  assert.deepEqual(referenceToMap({ x: 873, y: 850 }), { x: 873, y: 850 })
})

test('conversão referência/mapa é reversível', () => {
  const source = { x: 5370, y: 4435 }
  const restored = mapToReference(referenceToMap(source))
  assert.ok(Math.abs(restored.x - source.x) < 1e-9)
  assert.ok(Math.abs(restored.y - source.y) < 1e-9)
})

test('layout oficial não possui IDs duplicados, dimensões inválidas ou coordenadas externas', () => {
  const errors = validateLayout(buildMapLayout([]))
  assert.deepEqual(errors, [])
})

test('não existem espaços oficiais sem identificação', () => {
  assert.equal(OFFICIAL_LAYOUT_FEATURES.filter(feature => feature.interactive && !feature.label && !feature.boothCode).length, 0)
})
