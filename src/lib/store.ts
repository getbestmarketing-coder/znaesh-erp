'use client';
/*
 * Сховище даних.
 *
 * Хмарний режим (є erp.config.json): усі записи лежать у таблиці erp_records у Supabase.
 * Сторінки мутують стан напряму і викликають commit(); commit() сам знаходить, що змінилось,
 * і відправляє лише ці записи. Зміни колег приходять через realtime.
 *
 * Демо-режим (без конфігу): вигадані дані в localStorage цього браузера.
 */
import { useSyncExternalStore } from 'react';
import type { State } from './types';
import { seed, emptyState, defaultTypes } from './seed';
import { CLOUD, sb, TABLE } from './supabase';

const LS = 'znaesh-erp-next-v1';
const PREFS = 'znaesh-erp-prefs';
/** Режим без входу: хто працює в цьому браузері */
export const OPEN_ME = 'znaesh-erp-me';

type Kind = 'team' | 'fop' | 'stype' | 'client' | 'project' | 'service' | 'settings';
const KINDS: [Kind, 'team' | 'fops' | 'serviceTypes' | 'clients' | 'projects' | 'services'][] = [
  ['team', 'team'], ['fop', 'fops'], ['stype', 'serviceTypes'], ['client', 'clients'], ['project', 'projects'], ['service', 'services'],
];

let S: State | null = null;
let version = 0;
let memOnly = false;
const listeners = new Set<() => void>();
const emit = () => { version++; listeners.forEach((l) => l()); };

/* ---------- стабільне порівняння записів ---------- */
function stable(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return '{' + Object.keys(o).filter((k) => o[k] !== undefined).sort().map((k) => JSON.stringify(k) + ':' + stable(o[k])).join(',') + '}';
  }
  return JSON.stringify(v ?? null);
}
interface Row { kind: Kind; id: string; data: unknown }
function rowsOf(s: State): Map<string, Row> {
  const m = new Map<string, Row>();
  for (const [kind, key] of KINDS) for (const it of s[key] as { id: string }[]) m.set(`${kind}:${it.id}`, { kind, id: it.id, data: it });
  m.set('settings:main', { kind: 'settings', id: 'main', data: { rates: s.rates, invoiceSeq: s.invoiceSeq } });
  return m;
}
let snap = new Map<string, string>();
const takeSnap = () => { snap = new Map([...rowsOf(db())].map(([k, r]) => [k, stable(r.data)])); };

/* ---------- стан синхронізації (для футера) ---------- */
export type Sync = 'idle' | 'saving' | 'error';
let sync: Sync = 'idle';
let syncErr = '';
const setSync = (s: Sync, e = '') => { sync = s; syncErr = e; emit(); };
export const getSync = () => ({ sync, syncErr });

/* ---------- основне API ---------- */
export function db(): State {
  if (!S) {
    if (CLOUD || typeof window === 'undefined') S = emptyState();
    else {
      try { const raw = localStorage.getItem(LS); const s = raw ? (JSON.parse(raw) as State) : null; S = s && s.v === 2 ? s : seed(); }
      catch { S = seed(); }
    }
  }
  return S;
}

let chain: Promise<void> = Promise.resolve();
export function commit() {
  emit();
  if (!CLOUD) {
    try { localStorage.setItem(LS, JSON.stringify(S)); memOnly = false; } catch { memOnly = true; }
    return;
  }
  const rows = rowsOf(db());
  const ups: Row[] = []; const dels: Row[] = [];
  rows.forEach((r, k) => { const j = stable(r.data); if (snap.get(k) !== j) { ups.push(r); snap.set(k, j); } });
  [...snap.keys()].forEach((k) => { if (!rows.has(k)) { const [kind, ...rest] = k.split(':'); dels.push({ kind: kind as Kind, id: rest.join(':'), data: null }); snap.delete(k); } });
  if (!ups.length && !dels.length) return;
  chain = chain.then(async () => {
    setSync('saving');
    try {
      if (ups.length) {
        const { error } = await sb().from(TABLE).upsert(ups.map((r) => ({ kind: r.kind, id: r.id, data: r.data, updated_at: new Date().toISOString() })));
        if (error) throw error;
      }
      for (const kind of new Set(dels.map((d) => d.kind))) {
        const { error } = await sb().from(TABLE).delete().eq('kind', kind).in('id', dels.filter((d) => d.kind === kind).map((d) => d.id));
        if (error) throw error;
      }
      setSync('idle');
    } catch (e) {
      setSync('error', (e as { message?: string })?.message || 'Не вдалося зберегти');
    }
  });
}
export const isMemOnly = () => memOnly;
export function resetData() { S = seed(); commit(); }

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
/** Підписка компонента на зміни даних */
export function useDB(): State {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return db();
}

/* ---------- хмара: завантаження й realtime ---------- */
function put(kind: Kind, id: string, data: unknown) {
  const s = db();
  if (kind === 'settings') {
    const d = data as { rates?: State['rates']; invoiceSeq?: number };
    if (d.rates) s.rates = d.rates; if (typeof d.invoiceSeq === 'number') s.invoiceSeq = d.invoiceSeq;
    return;
  }
  const key = KINDS.find((k) => k[0] === kind)?.[1]; if (!key) return;
  const arr = s[key] as unknown as { id: string }[];
  const cur = arr.find((x) => x.id === id);
  if (cur) { // зберігаємо той самий об'єкт, щоб відкриті форми не загубили посилання
    const o = cur as unknown as Record<string, unknown>;
    Object.keys(o).forEach((k) => delete o[k]); Object.assign(o, data);
  } else arr.push(data as { id: string });
}
function remove(kind: Kind, id: string) {
  const key = KINDS.find((k) => k[0] === kind)?.[1]; if (!key) return;
  (db() as unknown as Record<string, { id: string }[]>)[key] = (db()[key] as unknown as { id: string }[]).filter((x) => x.id !== id);
}
function sortState() {
  const s = db(); const order = defaultTypes().map((t) => t.id);
  s.team.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  s.fops.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  s.clients.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  s.projects.sort((a, b) => a.no - b.no);
  s.serviceTypes.sort((a, b) => ((order.indexOf(a.id) + 1) || 99) - ((order.indexOf(b.id) + 1) || 99));
}

/** Завантажує всі записи з бази. Повертає кількість записів. */
export async function loadCloud(): Promise<number> {
  S = emptyState(); S.serviceTypes = [];
  let from = 0; let total = 0;
  for (;;) {
    const { data, error } = await sb().from(TABLE).select('kind,id,data').range(from, from + 999);
    if (error) throw error;
    (data || []).forEach((r) => put(r.kind as Kind, r.id, r.data));
    total += data?.length || 0;
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  if (!S.serviceTypes.length) S.serviceTypes = defaultTypes();
  sortState(); takeSnap(); emit();
  return total;
}

let channel: ReturnType<ReturnType<typeof sb>['channel']> | null = null;
export function listenCloud() {
  if (channel) return;
  channel = sb().channel('erp').on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, (p) => {
    const n = p.new as { kind?: Kind; id?: string; data?: unknown } | null;
    const o = p.old as { kind?: Kind; id?: string } | null;
    if (p.eventType === 'DELETE' && o?.kind && o.id) { remove(o.kind, o.id); snap.delete(`${o.kind}:${o.id}`); }
    else if (n?.kind && n.id) {
      const k = `${n.kind}:${n.id}`; const j = stable(n.data);
      if (snap.get(k) === j) return; // це наша ж зміна
      put(n.kind, n.id, n.data); snap.set(k, j); sortState();
    }
    emit();
  }).subscribe();
}

/** Перший вхід у порожню базу: створює власника, каталог послуг і курси */
export async function bootstrap(name: string, email = '') {
  const owner = { id: 't' + Date.now().toString(36), name, role: 'owner' as const, phone: '', telegram: '', email };
  const { error } = await sb().from(TABLE).insert({ kind: 'team', id: owner.id, data: owner });
  if (error) throw error;
  const base = emptyState(owner.id);
  try { localStorage.setItem(OPEN_ME, owner.id); } catch { /* приватний режим */ }
  const rows = [
    { kind: 'settings', id: 'main', data: { rates: base.rates, invoiceSeq: 0 } },
    ...base.serviceTypes.map((t) => ({ kind: 'stype', id: t.id, data: t })),
  ];
  const r2 = await sb().from(TABLE).upsert(rows);
  if (r2.error) throw r2.error;
}

/* ---------- налаштування вигляду ---------- */
export interface Prefs { theme: 'dark' | 'light'; pdense: 'full' | 'compact' }
let prefs: Prefs | null = null;
let pv = 0;
const pl = new Set<() => void>();
export function getPrefs(): Prefs {
  if (!prefs) {
    prefs = { theme: 'dark', pdense: 'full' };
    if (typeof window !== 'undefined') {
      try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS) || '{}')); } catch { /* ignore */ }
    }
  }
  return prefs;
}
export function setPrefs(p: Partial<Prefs>) {
  prefs = { ...getPrefs(), ...p };
  try { localStorage.setItem(PREFS, JSON.stringify(prefs)); } catch { /* ignore */ }
  if (p.theme) document.documentElement.dataset.theme = p.theme;
  pv++;
  pl.forEach((l) => l());
}
export function usePrefs(): Prefs {
  useSyncExternalStore((l) => { pl.add(l); return () => pl.delete(l); }, () => pv, () => 0);
  return getPrefs();
}
