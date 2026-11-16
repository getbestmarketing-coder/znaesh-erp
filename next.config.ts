import type { NextConfig } from 'next';

/*
 * Статичний експорт для GitHub Pages.
 * BASE_PATH = /назва-репозиторію; workflow підставляє його сам.
 * Локально (npm run dev) він порожній.
 */
const basePath = process.env.BASE_PATH || '';

const config: NextConfig = {
  output: 'export',
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default config;
