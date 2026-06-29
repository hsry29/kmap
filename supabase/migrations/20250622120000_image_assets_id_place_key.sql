-- image_assets: add id (PK) + place_key (unique dedupe key)
-- Safe to run on existing data — backfills keys, dedupes, then adds constraints.

create or replace function public.derive_image_asset_place_key(name text)
returns text
language sql
immutable
as $$
  select nullif(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(trim(coalesce(name, ''))), '[\s_]+', '-', 'g'),
      '-+', '-', 'g'
    )),
    ''
  )
$$;

alter table public.image_assets add column if not exists id uuid default gen_random_uuid();

update public.image_assets
set id = gen_random_uuid()
where id is null;

alter table public.image_assets
  alter column id set default gen_random_uuid(),
  alter column id set not null;

alter table public.image_assets add column if not exists place_key text;

update public.image_assets
set place_key = public.derive_image_asset_place_key(place_name)
where place_key is null or trim(place_key) = '';

-- Remove duplicate rows (keep the most complete; tie-break by id desc).
with ranked as (
  select
    id,
    row_number() over (
      partition by place_key
      order by
        (
          (case when coalesce(file_name, '') <> '' then 1 else 0 end)
          + (case when coalesce(image_author, '') <> '' then 1 else 0 end)
          + (case when coalesce(image_source, '') <> '' then 1 else 0 end)
          + (case when coalesce(image_license, '') <> '' then 1 else 0 end)
          + (case when coalesce(image_source_url, '') <> '' then 1 else 0 end)
          + (case when coalesce(notes, '') <> '' then 1 else 0 end)
        ) desc,
        id desc
    ) as rn
  from public.image_assets
  where place_key is not null and trim(place_key) <> ''
)
delete from public.image_assets
where id in (select id from ranked where rn > 1);

-- Rows that still lack place_key cannot be deduped safely — remove empty-key rows.
delete from public.image_assets
where place_key is null or trim(place_key) = '';

alter table public.image_assets
  alter column place_key set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'image_assets_pkey'
      and conrelid = 'public.image_assets'::regclass
  ) then
    alter table public.image_assets add primary key (id);
  end if;
end $$;

create unique index if not exists image_assets_place_key_unique
  on public.image_assets (place_key);
