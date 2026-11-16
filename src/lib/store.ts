'use client';
/*
 * Сховище даних. Поки що все живе в localStorage цього браузера.
 * Коли з'явиться бекенд (Supabase, Postgres тощо), достатньо замінити load() і commit().
 */
import { useSyncExternalStore } from 'react';
import type { State } from './types';
import { seed } from './seed';

const LS = 'znaesh-erp-next-v1';
const PREFS = 'znaesh-erp-prefs';

let S: State | null = null;
let version = 0;
let memOnly = false;
const listeners = new Set<() => void>();

function load(): State {
  try {
    const raw = localStorage.getItem(LS);
    const s = raw ? (JSON.parse(raw) as State) : null;
    if (s && s.v === 2) return s;
  } catch { /* пошкоджені дані: беремо демо */ }
  return seed();
}

/** Поточний стан. Мутуємо його напряму, а потім викликаємо commit(). */
export function db(): State {
  if (!S) { S = typeof window === 'undefined' ? seed() : load(); }
  return S;
}

export function commit() {
  try { localStorage.setItem(LS, JSON.stringify(S)); memOnly = false; } catch { memOnly = true; }
  version++;
  listeners.forEach((l) => l());
}
export const isMemOnly = () => memOnly;

export function resetData() { S = seed(); commit(); }

const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };

/** Підписка компонента на зміни даних */
export function useDB(): State {
  useSyncExternalStore(subscribe, () => version, () => 0);
  return db();
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
export const PREFS_KEY = PREFS;
