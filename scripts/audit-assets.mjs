import { createHash } from 'node:crypto'
import { readFile, readdir, stat } from 'node:fs/promises'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const root = path.join(process.cwd(), 'public')
const walk = async directory => (await Promise.all((await readdir(directory, { withFileTypes: true })).map(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : stat(path.join(directory, entry.name)).then(info => ({ file: path.join(directory, entry.name), bytes: info.size }))))).flat()
const files = await walk(root)
const images = files.filter(item => /\.(png|jpe?g|webp|gif|svg)$/i.test(item.file))
const groups = new Map()
for (const item of images) {
  const hash = createHash('sha256').update(await readFile(item.file)).digest('hex')
  groups.set(hash, [...(groups.get(hash) || []), item])
}
console.log('\nASSETS GRANDES (> 500 KB)')
for (const item of images.filter(item => item.bytes > 500 * 1024).sort((a, b) => b.bytes - a.bytes)) console.log(`${(item.bytes / 1024).toFixed(0)} KB\t${path.relative(process.cwd(), item.file)}`)
console.log('\nIMAGENS DUPLICADAS (mesmo SHA-256)')
const duplicates = [...groups.values()].filter(group => group.length > 1)
if (!duplicates.length) console.log('Nenhuma duplicata binária encontrada.')
for (const group of duplicates) console.log(group.map(item => path.relative(process.cwd(), item.file)).join(' | '))
console.log(`\n${images.length} imagens analisadas. Nenhum arquivo foi removido.`)
console.log('\nASSETS NÃO RASTREADOS PELO GIT (revisão manual)')
try {
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', 'public'], { encoding: 'utf8' }).trim()
  console.log(untracked || 'Nenhum asset público não rastreado.')
} catch { console.log('Não foi possível consultar o Git neste ambiente.') }
