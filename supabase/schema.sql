-- ЗНАЄШ ERP: схема бази для Supabase.
-- Запустіть один раз у Supabase → SQL Editor → New query → Run.

-- 1. Усі записи ERP (команда, ФОП, замовники, проекти, послуги, налаштування)
create table if not exists public.erp_records (
  kind        text        not null,
  id          text        not null,
  data        jsonb       not null,
  updated_at  timestamptz not null default now(),
  updated_by  text        default auth.email(),
  primary key (kind, id)
);
alter table public.erp_records enable row level security;
alter table public.erp_records replica identity full;

-- 2. Хто має доступ: лише люди, чия пошта вказана в розділі «Команда»
create or replace function public.erp_is_member() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.erp_records
    where kind = 'team' and lower(data->>'email') = lower(auth.email())
  );
$$;

-- База порожня: ще ніхто не має пошти в команді (перший вхід власника)
create or replace function public.erp_no_members() returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.erp_records
    where kind = 'team' and coalesce(data->>'email', '') <> ''
  );
$$;
revoke all on function public.erp_is_member() from public, anon;
revoke all on function public.erp_no_members() from public, anon;
grant execute on function public.erp_is_member() to authenticated;
grant execute on function public.erp_no_members() to authenticated;

drop policy if exists "erp read"   on public.erp_records;
drop policy if exists "erp insert" on public.erp_records;
drop policy if exists "erp update" on public.erp_records;
drop policy if exists "erp delete" on public.erp_records;

create policy "erp read" on public.erp_records
  for select to authenticated using (public.erp_is_member());

-- Перший користувач може створити лише себе-власника (з власною поштою)
create policy "erp insert" on public.erp_records
  for insert to authenticated with check (
    public.erp_is_member()
    or (public.erp_no_members() and kind = 'team'
        and data->>'role' = 'owner' and lower(data->>'email') = lower(auth.email()))
  );
create policy "erp update" on public.erp_records
  for update to authenticated using (public.erp_is_member()) with check (public.erp_is_member());
create policy "erp delete" on public.erp_records
  for delete to authenticated using (public.erp_is_member());

-- 3. Зміни колег з'являються одразу (realtime)
do $$ begin
  alter publication supabase_realtime add table public.erp_records;
exception when duplicate_object then null; end $$;

-- 4. Сховище для PDF (договори, NDA, акти). Приватне.
insert into storage.buckets (id, name, public) values ('docs', 'docs', false)
on conflict (id) do nothing;

drop policy if exists "erp docs read"   on storage.objects;
drop policy if exists "erp docs insert" on storage.objects;
drop policy if exists "erp docs delete" on storage.objects;
create policy "erp docs read"   on storage.objects for select to authenticated using (bucket_id = 'docs' and public.erp_is_member());
create policy "erp docs insert" on storage.objects for insert to authenticated with check (bucket_id = 'docs' and public.erp_is_member());
create policy "erp docs delete" on storage.objects for delete to authenticated using (bucket_id = 'docs' and public.erp_is_member());
