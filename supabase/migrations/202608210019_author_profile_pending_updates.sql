-- A autora vinculada pode ajustar o próprio rascunho ou envio pendente.
-- A publicação continua sendo exclusiva do fluxo administrativo.
drop policy if exists "Authors update own passport draft" on public.passport_profiles;
create policy "Authors update own passport draft" on public.passport_profiles for update to authenticated
using (
  exists(
    select 1 from public.author_accounts account
    where account.author_id=passport_profiles.author_id
      and account.user_id=(select auth.uid())
      and account.active
  )
  and status in ('draft','pending','rejected')
)
with check (
  status in ('draft','pending')
  and (consent_accepted_by_user_id is null or consent_accepted_by_user_id=(select auth.uid()))
);
