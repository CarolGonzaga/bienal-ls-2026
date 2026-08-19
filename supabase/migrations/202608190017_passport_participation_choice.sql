-- Decisão explícita da autora sobre participar ou não do Passaporte.
alter table public.passport_profiles
  add column if not exists participation_status text;

alter table public.passport_profiles
  drop constraint if exists passport_profiles_participation_status_check;

alter table public.passport_profiles
  add constraint passport_profiles_participation_status_check
  check (participation_status is null or participation_status in ('participating', 'declined'));

-- Perfis que já possuíam consentimento eram participantes antes desta alteração.
update public.passport_profiles
set participation_status = 'participating'
where participation_status is null
  and consent_accepted_at is not null;

create index if not exists passport_profiles_participation_idx
  on public.passport_profiles(participation_status, updated_at);

-- Uma autora pode registrar a primeira decisão mesmo se houver um rascunho
-- pendente iniciado antes desta pergunta existir.
drop policy if exists "Authors update own passport draft" on public.passport_profiles;
create policy "Authors update own passport draft" on public.passport_profiles for update to authenticated
using (
  exists(select 1 from public.author_accounts aa where aa.author_id=passport_profiles.author_id and aa.user_id=(select auth.uid()) and aa.active)
  and (status in ('draft','rejected') or participation_status is null)
)
with check (
  status in ('draft','pending')
  and (consent_accepted_by_user_id is null or consent_accepted_by_user_id=(select auth.uid()))
);
