export const normalizePassportCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')

export const extractPassportCode = (raw: string) => {
  const trimmed = raw.trim()
  if (!trimmed.includes('|')) return normalizePassportCode(trimmed)
  const parts = trimmed.split('|')
  if (parts.length !== 3 || parts[0] !== 'LSB26' || parts[1] !== 'v1' || !parts[2]) throw new Error('QR Code inválido ou de versão desconhecida.')
  return normalizePassportCode(parts[2])
}

export const sha256Hex = async (value: string) => {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export const codeIsValidAt = (validFrom: string, validUntil: string, now = new Date()) => now >= new Date(validFrom) && now <= new Date(validUntil)
