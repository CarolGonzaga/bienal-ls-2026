# Operação no Supabase Free

Os limites configuráveis ficam em `system_budget_config`; os padrões conservadores são 500 MB para Database e 1 GB para Storage, com alertas em 60%, 75% e 90%. A API segura do aplicativo não informa quotas reais, portanto o painel exibe “Verificar manualmente no Supabase Dashboard” em vez de números inventados.

Usuárias comuns não mantêm Realtime. O aplicativo lê um manifesto compacto ao iniciar, recuperar conexão, voltar ao foreground ou quando a usuária pede atualização. Só baixa a seção cuja versão mudou. QR é processado localmente; QR PNG não é armazenado; fotos são reduzidas para WebP de até 300 KB antes do upload.

O backup e o relatório de congelamento exigem `SUPABASE_SERVICE_ROLE_KEY` somente no terminal/CI seguro. Nunca crie variável `VITE_SUPABASE_SERVICE_ROLE_KEY`: o prefixo `VITE_` exporia a chave no navegador.

Comandos:

```text
npm run audit:offline
npm run audit:assets
npm run simulate:usage
npm run backup:content
node scripts/freeze-report.mjs
```
