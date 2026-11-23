-- ЗНАЄШ ERP: тимчасовий режим БЕЗ ВХОДУ.
-- Поки ці політики діють, будь-хто з посиланням на сайт може читати й змінювати дані.
-- Вмикається разом з "openAccess": true в erp.config.json.

-- УВІМКНУТИ (запустіть у Supabase → SQL Editor):
drop policy if exists "erp open all"  on public.erp_records;
drop policy if exists "erp docs open" on storage.objects;
create policy "erp open all"  on public.erp_records for all to anon using (true) with check (true);
create policy "erp docs open" on storage.objects    for all to anon using (bucket_id = 'docs') with check (bucket_id = 'docs');

-- ВИМКНУТИ (коли повертаємо вхід за поштою):
-- 1) власник вписує свою пошту в розділі «Команда»;
-- 2) в erp.config.json ставимо "openAccess": false;
-- 3) запускаємо:
-- drop policy if exists "erp open all"  on public.erp_records;
-- drop policy if exists "erp docs open" on storage.objects;
