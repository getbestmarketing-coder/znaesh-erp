import type { Cur } from './types';

export const pad = (n: number) => String(n).padStart(2, '0');
export const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
export const addMonths = (s: string, n: number) => {
  const d = parse(s); const day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last));
  return iso(d);
};
/** Рівно місяць від початку: 15.10 → 14.11 */
export const monthEnd = (start: string) => addDays(addMonths(start, 1), -1);
export const diff = (a: string, b: string) => Math.round((parse(b).getTime() - parse(a).getTime()) / 864e5);

/** Сьогодні рахується в браузері, тож дати завжди актуальні */
export const TODAY = iso(new Date());

const MONTHS = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
export const fD = (s?: string) => (s ? `${s.slice(8, 10)}.${s.slice(5, 7)}.${s.slice(0, 4)}` : '');
export const fDs = (s?: string) => (s ? `${s.slice(8, 10)}.${s.slice(5, 7)}` : '');
export const fL = (s?: string) => (s ? `${+s.slice(8, 10)} ${MONTHS[+s.slice(5, 7) - 1]}` : '');
export const fLY = (s?: string) => (s ? `${fL(s)} ${s.slice(0, 4)}` : '');

/** Поточний період агенції: з 15-го по 14-те */
function defaultStart() {
  const d = parse(TODAY); let y = d.getFullYear(), m = d.getMonth();
  if (d.getDate() < 15) { m -= 1; if (m < 0) { m = 11; y--; } }
  return `${y}-${pad(m + 1)}-15`;
}
export const CUR_START = defaultStart();
export const CUR_END = monthEnd(CUR_START);

const SYM: Record<Cur, string> = { UAH: '₴', USD: '$', EUR: '€' };
export const num = (n: number) => Math.round(n).toLocaleString('uk-UA');
export const money = (n: number, c: Cur = 'UAH') =>
  c === 'UAH' ? `${num(n)} ₴` : `${SYM[c]}${(Math.round(n * 100) / 100).toLocaleString('uk-UA')}`;

export const uid = (p: string) => p + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 6);
export const url = (u?: string) => (!u ? '' : /^https?:\/\//.test(u) ? u : 'https://' + u.replace(/^@/, ''));
export const tg = (h?: string) => (!h ? '' : h.startsWith('http') ? h : 'https://t.me/' + h.replace(/^@/, ''));
export const initials = (n?: string) =>
  String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
export const shortName = (n: string) => { const [a, b] = n.split(' '); return `${a} ${(b || '')[0] || ''}.`; };

export function dayWord(n: number) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return 'днів';
  if (b === 1) return 'день';
  if (b >= 2 && b <= 4) return 'дні';
  return 'днів';
}
export const plural = (n: number, one: string, few: string, many: string) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};

export function translit(s: string) {
  const m: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'h', ґ: 'g', д: 'd', е: 'e', є: 'ie', ж: 'zh', з: 'z', и: 'y', і: 'i', ї: 'i', й: 'i', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ь: '', ю: 'iu', я: 'ia', "'": '' };
  return String(s).toLowerCase().split('').map((c) => m[c] ?? c).join('').replace(/[^a-z0-9]/g, '');
}

export const isUrl = (v: string) => /^https?:\/\//i.test(v);
export const BASE = process.env.NEXT_PUBLIC_BASE_PATH || '';
