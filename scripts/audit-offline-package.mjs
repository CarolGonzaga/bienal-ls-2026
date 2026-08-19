import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const root = process.cwd()
const filesUnder = async directory => {
  try {
    const entries = await readdir(directory, { withFileTypes: true })
    return (await Promise.all(entries.map(entry => entry.isDirectory() ? filesUnder(path.join(directory, entry.name)) : stat(path.join(directory, entry.name)).then(info => ({ file: path.join(directory, entry.name), bytes: info.size }))))).flat()
  } catch { return [] }
}
const sum = files => files.reduce((total, file) => total + file.bytes, 0)
const shell = await filesUnder(path.join(root, 'dist'))
const publicFiles = await filesUnder(path.join(root, 'public'))
const map = publicFiles.filter(item => /[\\/]mapa[\\/]|mapa-guia|MAPA\./i.test(item.file))
const photos = publicFiles.filter(item => /[\\/](autoras|passport)[\\/]/i.test(item.file))
const exhibitorImages = publicFiles.filter(item => /[\\/]expositores[\\/]/i.test(item.file))
const jsonAssets = publicFiles.filter(item => /\.(json|csv)$/i.test(item.file))
const categories = [
  ['App shell (dist)', sum(shell)], ['Mapa', sum(map)], ['Fotos do Passaporte', sum(photos)],
  ['Imagens de expositores', sum(exhibitorImages)], ['Dados estáticos', sum(jsonAssets)]
]
const total = categories.reduce((value, [, bytes]) => value + bytes, 0)
const mb = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`
console.log('\nAUDITORIA DO PACOTE OFFLINE\n')
for (const [label, bytes] of categories) console.log(`${label.padEnd(28)} ${mb(bytes)}`)
console.log(`${'Total estimado'.padEnd(28)} ${mb(total)}`)
console.log('\nObservação: fotos remotas do bucket passport-photos devem ser somadas pelo painel de Storage do Supabase.')
if (total > 50 * 1024 * 1024) { console.error('\nFALHA: pacote local acima do orçamento conservador de 50 MB.'); process.exitCode = 1 }
