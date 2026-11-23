# ЗНАЄШ ERP

ERP для агенції комплексного маркетингу [ЗНАЄШ](https://znaesh.agency/): помісячні послуги, проекти, замовники, команда, оплати на ФОП, рахунки й безкоштовні періоди.

Дані зберігаються в спільній базі Supabase: усі в команді бачать одне й те саме, зміни колег з'являються одразу. PDF-документи лежать у приватному сховищі Supabase.

Вхід лише за запрошенням: увійти може тільки людина, чию пошту додано в розділі «Команда». Пароль не потрібен, на пошту приходить посилання для входу.

Якщо `erp.config.json` порожній, ERP запускається в демо-режимі з вигаданими даними в браузері.

## Технології

- Next.js (App Router) + React + TypeScript
- Статичний експорт (`output: 'export'`), хостинг на GitHub Pages
- Без сторонніх UI-бібліотек: стилі в `src/app/globals.css` (темна і світла тема)

## Підключення до Supabase

1. Створіть проект на https://supabase.com.
2. SQL Editor → New query → вставте `supabase/schema.sql` → Run.
3. Authentication → URL Configuration: Site URL `https://<логін>.github.io/<репозиторій>/`, у Redirect URLs додайте те саме з `**` в кінці.
4. Project Settings → API: скопіюйте Project URL і anon public key в `erp.config.json`.
5. Перший, хто увійде, стає власником. Далі він додає команду з поштами.

## Запуск локально

```bash
npm install
npm run dev
```

Відкрийте http://localhost:3000

## Публікація на GitHub Pages

1. Створіть репозиторій на GitHub і запуште код у гілку `main`.
2. У репозиторії: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Кожен push у `main` запускає `.github/workflows/deploy.yml`, який збирає сайт і публікує його.

Адреса сайту: `https://<ваш-логін>.github.io/<назва-репозиторію>/`

## Структура

```
src/
  app/                 сторінки (кожна папка = маршрут)
    page.tsx           «Цей місяць»
    projects/          список проектів
    project/           картка проекту (?id=), new/, edit/
    services/ clients/ client/ team/ free/ admin/
  components/          спільні компоненти, діалоги, таблиця проектів
  lib/
    types.ts           типи даних
    seed.ts            демо-дані
    store.ts           сховище: Supabase або демо в localStorage, тема
    supabase.ts        підключення до бази
    domain.ts          бізнес-логіка: борги, «Новий», продовження місяця тощо
    utils.ts           дати, гроші, форматування
public/icons/          об'ємні іконки платформ
```

## Що далі

- Права доступу за ролями (ролі вже закладені в `src/lib/dicts.ts`, перевірки додаються в політики `supabase/schema.sql`).
