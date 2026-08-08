import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateMapFocusOffset, calculateMapPanBounds } from '../../utils/mapCamera.ts'

test('centraliza corretamente um estande da ala leste em tela widescreen', () => {
  const offset = calculateMapFocusOffset({
    centerXNorm: 1758 / 1920,
    centerYNorm: 880 / 1080,
    viewportWidth: 1280,
    viewportHeight: 638,
    zoom: 2.2
  })

  assert.ok(offset.x < -1000)
  assert.ok(offset.y < -400)
})

test('o centro do mapa não produz deslocamento', () => {
  assert.deepEqual(calculateMapFocusOffset({
    centerXNorm: .5,
    centerYNorm: .5,
    viewportWidth: 1280,
    viewportHeight: 720,
    zoom: 2.2
  }), { x: 0, y: 0 })
})

test('limite de arraste cresce com o zoom e preserva o foco da ala leste', () => {
  const bounds = calculateMapPanBounds(1280, 638, 4.4)
  const focus = calculateMapFocusOffset({
    centerXNorm: 1770 / 1920,
    centerYNorm: 880 / 1080,
    viewportWidth: 1280,
    viewportHeight: 638,
    zoom: 4.4
  })

  assert.ok(bounds.maxX > Math.abs(focus.x))
  assert.ok(bounds.maxY > Math.abs(focus.y))
})

test('mapa menor que a tela não pode ser arrastado para uma área vazia', () => {
  assert.deepEqual(calculateMapPanBounds(1280, 720, .55), { maxX: 0, maxY: 0 })
})
