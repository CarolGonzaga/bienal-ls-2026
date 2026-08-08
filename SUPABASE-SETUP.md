# Configuração do Supabase

## 1. Criar as tabelas e políticas

No painel do projeto Supabase, abra **SQL Editor → New query** e execute, nesta ordem:

1. `supabase/migrations/202608080001_initial_schema.sql`
2. `supabase/migrations/202608080002_seed_exhibitors.sql`

O segundo arquivo insere ou atualiza os 29 expositores. Ele pode ser executado novamente sem duplicar registros.

## 2. Permitir cadastro com acesso imediato

Em **Authentication → Providers → Email**:

- mantenha **Allow new users to sign up** ativado;
- desative **Confirm email**.

Assim, o cadastro cria uma sessão imediatamente, sem aprovação administrativa nem confirmação por e-mail. Senha e sessão continuam protegidas pelo Supabase Auth.

Em **Authentication → URL Configuration**:

- defina `https://bienal-ls-2026-nine.vercel.app` como **Site URL**;
- adicione `https://bienal-ls-2026-nine.vercel.app/**` aos redirect URLs.

## 3. Fazer um novo deploy

Confirme no projeto Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Depois das migrations e das configurações de Auth, faça um novo deploy. A chave anônima é própria para o frontend; não adicione a `service_role` ao Vercel.

## 4. Conferência rápida

No SQL Editor:

```sql
select count(*) from public.exhibitors;
```

O resultado esperado é `29`.

Cadastre duas contas de teste e confirme que cada conta enxerga apenas seus próprios favoritos, visitas e rota. As políticas RLS usam `auth.uid()` em todas as tabelas pessoais.

## Atualizar o seed

Após alterar `src/data/initialExhibitors.ts`, regenere a migration com:

```text
node --experimental-strip-types scripts/generate-supabase-exhibitor-seed.mjs
```
