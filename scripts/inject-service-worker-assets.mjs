import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'

const root = process.cwd()
const distDir = join(root, 'dist')
const assetsDir = join(distDir, 'assets')
const serviceWorkerPath = join(distDir, 'sw.js')
const base = '/mapasaficobienal'

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = await Promise.all(entries.map(async entry => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return files.flat()
}

const buildAssets = (await listFiles(assetsDir))
  .map(path => `${base}/assets/${relative(assetsDir, path).split(sep).join('/')}`)
  .sort()

const marker = 'const BUILD_ASSETS = []'
const source = await readFile(serviceWorkerPath, 'utf8')
if (!source.includes(marker)) {
  throw new Error('Marcador BUILD_ASSETS não encontrado em dist/sw.js')
}

await writeFile(
  serviceWorkerPath,
  source.replace(marker, `const BUILD_ASSETS = ${JSON.stringify(buildAssets)}`),
  'utf8',
)

console.log(`[Offline] ${buildAssets.length} arquivos da build adicionados ao app shell.`)
