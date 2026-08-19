# Checklist pré-Bienal

- [ ] Supabase ativo e projeto fora de pausa.
- [ ] Migrations aplicadas na ordem e sem erro.
- [ ] RLS testado como anônima, leitora, autora e admin.
- [ ] Fluxo manual de conta e vínculo por e-mail testado conforme `docs/AUTHOR-ONBOARDING.md`.
- [ ] `passport_codes.code_plaintext` inacessível a leitoras.
- [ ] Storage e Database verificados no Dashboard, abaixo das faixas de 60/75/90% configuradas.
- [ ] `npm test`, `npm run build`, `npm run audit:assets` e `npm run simulate:usage` concluídos.
- [ ] `npm run backup:content` guardado em local seguro.
- [ ] `node scripts/freeze-report.mjs` revisado.
- [ ] Pacote offline preparado e reaberto em modo avião.
- [ ] Service Worker atualizado e manifesto sincronizado.
- [ ] Autoras publicadas com consentimento, foto, bio, livros e presença revisados.
- [ ] Hashes de códigos presentes; plaintext restrito.
- [ ] QR manual e câmera válidos no Safari iOS e Chrome Android.
- [ ] Programação, livros, mapa e rotas disponíveis offline.
- [ ] Fila de contribuições e carimbos testada sem duplicação.
- [ ] Feature flag `passport` programada para a data de liberação.
- [ ] Auditoria `npm audit` executada em ambiente com acesso ao registry.

Não publique o Passaporte se qualquer item crítico estiver pendente.
