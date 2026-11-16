# ЗНАЄШ ERP

ERP для агенції комплексного маркетингу [ЗНАЄШ](https://znaesh.agency/): помісячні послуги, проекти, замовники, команда, оплати на ФОП, рахунки й безкоштовні періоди.

Зараз це демо з вигаданими даними. Усе зберігається в `localStorage` браузера, сервера й бази поки немає.

## Технології

- Next.js (App Router) + React + TypeScript
- Статичний експорт (`output: 'export'`), хостинг на GitHub Pages
- Без сторонніх UI-бібліотек: стилі в `src/app/globals.css` (темна і світла тема)

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
    store.ts           сховище (localStorage) і налаштування теми
    domain.ts          бізнес-логіка: борги, «Новий», продовження місяця тощо
    utils.ts           дати, гроші, форматування
public/icons/          об'ємні іконки платформ
```

## Що далі

- Бекенд і спільна база (наприклад, Supabase): замінити `load()` і `commit()` у `src/lib/store.ts`.
- Вхід користувачів і права доступу за ролями (ролі вже закладені в `src/lib/dicts.ts`).
