-- ─────────────────────────────────────────────────────────────────────────────
-- Kmap 전 사용자 동기화용 스키마 (Supabase)
--
-- 설계 의도: 지금은 프로토타입이라 anon 키로 쓰기를 허용하지만,
--   나중에 Supabase Auth 를 붙일 때 "쓰기 정책 한 블록"만 교체하면 인증 기반으로
--   전환되도록 구조를 잡았습니다. (테이블/감사컬럼/관리자 allowlist/헬퍼는 미리 준비)
--
-- 사용법:
--   1) Supabase 프로젝트 생성 (무료 플랜 가능)
--   2) 대시보드 → SQL Editor 에 이 파일 전체를 붙여넣고 RUN
--   3) Project Settings → API 에서 Project URL / anon key 를 복사해
--      프로젝트 루트 .env 의 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 에 입력
--   4) Database → Replication(또는 Realtime) 에서 app_config 의 Realtime 을 켭니다.
--
-- 데이터 모델: 설정 종류별로 한 행(jsonb).
--   key = 'partners' | 'hidden' | 'collections' | 'curation'
--   value = 해당 store 의 스냅샷(JSON)
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1) 설정 테이블 (감사 컬럼 포함) ──────────────────────────────────────────
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  -- Auth 도입 후 "누가 마지막으로 수정했는가" 기록. anon 단계에선 null 로 남습니다.
  updated_by uuid
);

-- 기존(감사 컬럼 없던) 테이블에도 안전하게 컬럼 추가.
alter table public.app_config add column if not exists updated_at timestamptz not null default now();
alter table public.app_config add column if not exists updated_by uuid;

-- 수정 시각/수정자 자동 기록. auth.uid() 는 anon 이면 null, 로그인 사용자면 그 uid.
create or replace function public.app_config_set_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

drop trigger if exists app_config_audit on public.app_config;
create trigger app_config_audit
  before insert or update on public.app_config
  for each row execute function public.app_config_set_audit();

alter table public.app_config enable row level security;

-- ── 2) 관리자 allowlist (Auth 전환 대비, 지금은 비어 있어도 됨) ───────────────
-- Auth 도입 후, 관리자로 쓸 사용자의 auth.users.id 를 이 표에 넣으면 됩니다.
create table if not exists public.admins (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- 로그인 사용자가 "내가 관리자인지" 확인할 수 있게(선택).
drop policy if exists "admins self read" on public.admins;
create policy "admins self read"
  on public.admins for select
  to authenticated
  using (auth.uid() = user_id);

-- 현재 사용자가 관리자 allowlist 에 있는지. 정책에서 호출.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins a where a.user_id = auth.uid()
  );
$$;

-- ── 3) 정책 ─────────────────────────────────────────────────────────────────
-- 읽기: 누구나(공개 게시본). Auth 전환 후에도 그대로 두면 됩니다.
drop policy if exists "app_config read" on public.app_config;
create policy "app_config read"
  on public.app_config for select
  using (true);

-- 쓰기: ▼▼▼ 여기 한 블록만 교체하면 anon → 인증 기반으로 전환됩니다 ▼▼▼
--
-- [현재 / 프로토타입] anon 키로 쓰기 허용.
--   ⚠️ 키를 아는 누구나 게시본을 수정할 수 있으니 내부/시범용으로만 사용하세요.
drop policy if exists "app_config write" on public.app_config;
create policy "app_config write"
  on public.app_config for all
  using (true)
  with check (true);
--
-- [향후 / Auth 도입 시] 위 "app_config write" 정책을 지우고 아래로 교체:
--
--   drop policy if exists "app_config write" on public.app_config;
--   create policy "app_config write"
--     on public.app_config for all
--     to authenticated
--     using (public.is_admin())
--     with check (public.is_admin());
--
--   (이후 프론트엔드는 supabaseClient 에서 persistSession:true + 로그인 흐름만 추가하면 됨)
-- ▲▲▲ 전환 지점 끝 ▲▲▲

-- ── 4) 실시간 발행 등록(이미 등록돼 있으면 무시) ─────────────────────────────
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_config;
  exception
    when duplicate_object then null;
    when undefined_object then null;
  end;
end $$;

-- ── 5) Place hero images (admin upload) ─────────────────────────────────────
-- Naver/blog URLs cannot be hotlinked; admins upload files here instead.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-images',
  'place-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "place_images public read" on storage.objects;
create policy "place_images public read"
  on storage.objects for select
  using (bucket_id = 'place-images');

drop policy if exists "place_images write" on storage.objects;
create policy "place_images write"
  on storage.objects for insert
  with check (bucket_id = 'place-images');

drop policy if exists "place_images update" on storage.objects;
create policy "place_images update"
  on storage.objects for update
  using (bucket_id = 'place-images')
  with check (bucket_id = 'place-images');

-- ── 6) Curated place images (kmapimages bucket) ─────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'kmapimages',
  'kmapimages',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "kmapimages public read" on storage.objects;
create policy "kmapimages public read"
  on storage.objects for select
  using (bucket_id = 'kmapimages');

drop policy if exists "kmapimages write" on storage.objects;
create policy "kmapimages write"
  on storage.objects for insert
  with check (bucket_id = 'kmapimages');

drop policy if exists "kmapimages update" on storage.objects;
create policy "kmapimages update"
  on storage.objects for update
  using (bucket_id = 'kmapimages')
  with check (bucket_id = 'kmapimages');

-- ── 7) Image metadata (photo credits) ─────────────────────────────────────
create table if not exists public.image_assets (
  id uuid primary key default gen_random_uuid(),
  place_key text not null,
  place_name text not null,
  file_name text,
  image_source text,
  image_author text,
  image_license text,
  image_source_url text,
  notes text,
  is_active boolean not null default true
);

create unique index if not exists image_assets_place_key_unique
  on public.image_assets (place_key);

create index if not exists image_assets_place_name_idx
  on public.image_assets (place_name);

create index if not exists image_assets_file_name_idx
  on public.image_assets (file_name);

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

alter table public.image_assets enable row level security;

drop policy if exists "image_assets read" on public.image_assets;
create policy "image_assets read"
  on public.image_assets for select
  using (true);

drop policy if exists "image_assets write" on public.image_assets;
create policy "image_assets write"
  on public.image_assets for all
  using (true)
  with check (true);
