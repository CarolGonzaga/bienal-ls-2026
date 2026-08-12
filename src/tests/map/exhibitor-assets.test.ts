import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { INITIAL_EXHIBITORS } from '../../data/initialExhibitors.ts'

test('todos os expositores possuem um logo WEBP disponível em public/expositores', () => {
  assert.equal(INITIAL_EXHIBITORS.length, 32)
  INITIAL_EXHIBITORS.forEach(exhibitor => {
    assert.match(exhibitor.logo, /\.webp$/i, exhibitor.id)
    assert.ok(existsSync(resolve(process.cwd(), 'public', 'expositores', exhibitor.logo)), exhibitor.logo)
  })
})
