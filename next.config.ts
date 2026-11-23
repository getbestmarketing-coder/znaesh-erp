import type { NextConfig } from 'next';
import fs from 'node:fs';

/*
 * Статичний експорт для GitHub Pages.
 * BASE_PATH = /назва-репозиторію; workflow підставляє його сам.
 * Локально (npm run dev) він порожній.
 *
 * Підключення до Supabase береться з erp.config.json (або зі змінних середовища).
 * Якщо його немає, ERP працює в демо-режимі з даними в браузері.
 */
const basePath = process.env.BASE_PATH || '';
let cfg: { supabaseUrl?: string; supabaseAnonKey?: string; openAccess?: boolean } = {};
try { cfg = JSON.parse(fs.readFileSync('erp.config.json', 'utf8')); } catch { /* немає файлу */ }

const config: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || cfg.supabaseUrl || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || cfg.supabaseAnonKey || '',
    // Тимчасовий режим без входу (openAccess: true в erp.config.json)
    NEXT_PUBLIC_ERP_OPEN: cfg.openAccess ? '1' : '',
  },
};

export default config;
