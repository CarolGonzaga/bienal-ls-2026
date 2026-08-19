import test from 'node:test'
import assert from 'node:assert/strict'
import { codeIsValidAt, extractPassportCode, normalizePassportCode, sha256Hex } from '../../lib/passportCode.ts'

test('normaliza código digitado', () => assert.equal(normalizePassportCode('  ana-k7mv-4qtx '), 'ANA-K7MV-4QTX'))
test('manual e QR extraem a mesma chave', () => assert.equal(extractPassportCode('LSB26|v1|ANA-K7MV-4QTX'), extractPassportCode('ANA-K7MV-4QTX')))
test('rejeita QR comum, URL, payload incompleto e versão desconhecida', () => {
  for (const value of ['https://example.com|x|y', 'LSB26|v1', 'LSB26|v2|ANA-K7MV-4QTX', 'OUTRO|v1|ANA-K7MV-4QTX']) assert.throws(() => extractPassportCode(value))
})
test('hash é determinístico e não expõe plaintext', async () => {
  const hash = await sha256Hex('ANA-K7MV-4QTX')
  assert.equal(hash.length, 64); assert.ok(!hash.includes('ANA'))
  assert.equal(hash, await sha256Hex('ANA-K7MV-4QTX'))
})
test('validade respeita início e fim inclusivos', () => {
  const from = '2026-09-04T03:00:00.000Z'; const until = '2026-09-14T02:59:59.000Z'
  assert.equal(codeIsValidAt(from, until, new Date(from)), true)
  assert.equal(codeIsValidAt(from, until, new Date(until)), true)
  assert.equal(codeIsValidAt(from, until, new Date('2026-09-03T12:00:00Z')), false)
})
