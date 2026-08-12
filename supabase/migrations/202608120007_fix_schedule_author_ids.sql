-- Corrige IDs de autoras caso a importação Sheet10 já tenha sido executada.
-- Os nomes são usados somente como chave de correção dos registros importados.
update public.events
set author_source_id = case trim(author_name)
  when 'Carol Cara' then 'carol-cara'
  when 'Danda Odeleci' then 'danda-odeleci'
  when 'Gih Alves' then 'gih-alves'
  when 'Mariana Rosa' then 'mariana-rosa'
  when 'Marina Basso' then 'marina-basso'
  when 'Rina Rodriguez' then 'rina-rodriguez'
  when 'Stephanie Cruz' then 'stephanie-cruz'
  when 'Victoria Moon' then 'victoria-moon'
  else author_source_id
end,
updated_at = now()
where source_key is not null
  and trim(author_name) in ('Carol Cara', 'Danda Odeleci', 'Gih Alves', 'Mariana Rosa', 'Marina Basso', 'Rina Rodriguez', 'Stephanie Cruz', 'Victoria Moon');
