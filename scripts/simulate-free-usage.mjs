const users = [100, 500, 1000, 2000]
const manifestBytes = 700
const packageBytes = Number(process.env.OFFLINE_PACKAGE_BYTES || 8 * 1024 * 1024)
const changedSectionBytes = Number(process.env.CHANGED_SECTION_BYTES || 120 * 1024)
const reconnects = Number(process.env.RECONNECTS_PER_USER || 3)
console.log('\nSIMULAÇÃO CONSERVADORA — SUPABASE FREE')
console.log('Hipótese: 1 pacote inicial + manifesto por retorno ao foreground/rede + 1 seção alterada para 20% das usuárias. Realtime comum = 0.\n')
console.log('Usuárias\tRequests\tEgress estimado\tRealtime')
for (const count of users) {
  const requests = count * (1 + reconnects + 0.2)
  const bytes = count * packageBytes + count * reconnects * manifestBytes + count * 0.2 * changedSectionBytes
  console.log(`${count}\t\t${Math.ceil(requests)}\t\t${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB\t\t0`)
}
console.log('\nO crescimento é 1 sincronização por aparelho, não N × telas abertas. Ajuste as variáveis de ambiente para cenários medidos.')
