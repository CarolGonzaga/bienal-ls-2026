-- Remove categorias inferidas das instalações que já executaram a seed anterior.
update public.exhibitors set categories = '{}'::text[] where cardinality(categories) > 0;
