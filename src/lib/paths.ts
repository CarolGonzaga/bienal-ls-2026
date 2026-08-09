const configuredBase = import.meta.env?.BASE_URL || '/'

export const BASE_PATH = configuredBase === '/' ? '' : configuredBase.replace(/\/$/, '')

export const appPath = (path = '') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${BASE_PATH}${normalizedPath}`
}
