-- Libera o Passaporte para todas as contas autenticadas.

insert into public.feature_flags (key, enabled, config, updated_at)
values (
  'passport',
  true,
  jsonb_build_object(
    'released_at', '2026-09-03',
    'audience', 'authenticated_users'
  ),
  now()
)
on conflict (key) do update
set enabled = true,
    config = (coalesce(public.feature_flags.config, '{}'::jsonb) - 'planned_release')
      || jsonb_build_object(
        'released_at', '2026-09-03',
        'audience', 'authenticated_users'
      ),
    updated_at = now(),
    updated_by = null;

notify pgrst, 'reload schema';
