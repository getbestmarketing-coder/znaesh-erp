'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { OverlayProvider } from './overlay';
import { Ava, Thumb } from './ui';
import { NAV, ROLES } from '@/lib/dicts';
import { useDB, usePrefs, setPrefs, isMemOnly, getSync, OPEN_ME } from '@/lib/store';
import { CLOUD, OPEN } from '@/lib/supabase';
import { Gate, signOut } from './Gate';
import { useUI } from './overlay';
import { CL, T, debtProjectsCount } from '@/lib/domain';
import { CUR_START, CUR_END, fLY, initials } from '@/lib/utils';

const navKey = (path: string) => {
  if (path.startsWith('/project')) return '/projects';
  if (path.startsWith('/client')) return '/clients';
  return path.replace(/\/$/, '') || '/';
};

function SearchSheet({ onClose }: { onClose: () => void }) {
  const S = useDB(); const router = useRouter(); const [q, setQ] = useState('');
  const go = (h: string) => { onClose(); router.push(h); };
  const s = q.trim().toLowerCase();
  const res = !s ? [] : [
    ...S.projects.filter((p) => p.name.toLowerCase().includes(s)).map((p) => ({ h: `/project?id=${p.id}`, k: p.id, el: <><Thumb p={p} cls="sm" /><span><b>{p.name}</b><small>Проект № {p.no}, {CL(p.clientId)?.name}</small></span></> })),
    ...S.clients.filter((c) => (c.name + c.phone + c.telegram).toLowerCase().includes(s)).map((c) => ({ h: `/client?id=${c.id}`, k: c.id, el: <><Ava name={c.name} /><span><b>{c.name}</b><small>Замовник, {c.phone}</small></span></> })),
    ...S.team.filter((t) => t.name.toLowerCase().includes(s)).map((t) => ({ h: '/team', k: t.id, el: <><Ava name={t.name} /><span><b>{t.name}</b><small>{ROLES[t.role]}</small></span></> })),
  ].slice(0, 10);
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="search-sheet" role="dialog" aria-label="Пошук">
        <div className="in">
          <div className="search-field">
            <span className="ico"><Icon name="search" size={22} /></span>
            <label className="visually-hidden" htmlFor="gsearch">Пошук</label>
            <input id="gsearch" type="search" autoFocus placeholder="Пошук проектів, замовників, команди" autoComplete="off" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {!s ? (
            <>
              <p className="search-hint">Швидкі посилання</p>
              {([['/project/new', 'Створити проект'], ['/projects?tab=debt', 'Проекти з боргом'], ['/free', 'Безкоштовні періоди'], ['/admin', 'ФОП і курс валют']] as const).map(([h, l]) => (
                <button key={h} type="button" className="sr" onClick={() => go(h)}><Icon name="arrow" size={16} /><span>{l}</span></button>
              ))}
            </>
          ) : (
            <>
              <p className="search-hint">Результати</p>
              {res.length ? res.map((x) => <button key={x.k} type="button" className="sr" onClick={() => go(x.h)}>{x.el}</button>) : <p className="muted">Нічого не знайдено.</p>}
            </>
          )}
        </div>
      </div>
    </>
  );
}

function SyncState() {
  const { sync, syncErr } = getSync();
  if (sync === 'saving') return <span>Зберігаю…</span>;
  if (sync === 'error') return <span className="warn" title={syncErr}>Не вдалося зберегти зміни. Перевірте інтернет і оновіть сторінку.</span>;
  return <span>Усі зміни збережено</span>;
}
function MeButton({ name, role, email }: { name?: string; role: string; email?: string }) {
  const ui = useUI();
  if (!CLOUD) return <span className="me-ava" title={`${name}, ${role}`}>{initials(name)}</span>;
  if (OPEN) return (
    <button type="button" className="me-ava" title={`${name}, ${role}`} aria-label="Змінити користувача"
      onClick={() => ui.confirm(<>Зараз ви працюєте як <b>{name}</b>. Обрати іншу людину з команди?</>, () => { try { localStorage.removeItem(OPEN_ME); } catch { /* */ } location.reload(); }, 'Змінити')}>{initials(name)}</button>
  );
  return (
    <button type="button" className="me-ava" title={`${name}, ${role}`} aria-label="Мій профіль"
      onClick={() => ui.confirm(<>Ви увійшли як <b>{name}</b> ({email}). Вийти з ERP?</>, () => { signOut(); }, 'Вийти')}>{initials(name)}</button>
  );
}

function Shell({ children }: { children: ReactNode }) {
  const S = useDB(); const prefs = usePrefs(); const path = usePathname(); const k = navKey(path);
  const [overlay, setOverlay] = useState<'search' | 'menu' | null>(null);
  const me = T(S.me); const debtN = debtProjectsCount();
  useEffect(() => { setOverlay(null); window.scrollTo(0, 0); }, [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOverlay('search'); }
      if (e.key === 'Escape') setOverlay(null);
    };
    document.addEventListener('keydown', onKey); return () => document.removeEventListener('keydown', onKey);
  }, []);
  const dark = prefs.theme === 'dark';
  return (
    <>
      <header className="gnav"><div className="gnav-in">
        <Link className="brand" href="/" aria-label="ЗНАЄШ, на головну"><Logo /></Link>
        <nav className="gnav-links" aria-label="Розділи">
          {NAV.map(([h, l]) => (
            <Link key={h} href={h} aria-current={k === h ? 'page' : undefined}>{l}{h === '/projects' && debtN > 0 && <span className="dot-n" title="Проектів з боргом">{debtN}</span>}</Link>
          ))}
        </nav>
        <div className="gnav-r">
          <button type="button" className="icon-btn theme-btn" onClick={() => setPrefs({ theme: dark ? 'light' : 'dark' })}
            aria-label={dark ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'} title={dark ? 'Світла тема' : 'Темна тема'}><Icon name={dark ? 'sun' : 'moon'} /></button>
          <button type="button" className="icon-btn" onClick={() => setOverlay('search')} aria-label="Пошук"><Icon name="search" /></button>
          <Link className="btn primary sm gnav-cta" href="/project/new"><Icon name="plus" size={16} />Новий проект</Link>
          <MeButton name={me?.name} role={me ? ROLES[me.role] : ''} email={me?.email} />
          <button type="button" className="icon-btn burger" onClick={() => setOverlay(overlay === 'menu' ? null : 'menu')} aria-label="Меню" aria-expanded={overlay === 'menu'}><Icon name="menu" size={20} /></button>
        </div>
      </div></header>
      {overlay === 'search' && <SearchSheet onClose={() => setOverlay(null)} />}
      {overlay === 'menu' && (
        <nav className="mnav" aria-label="Розділи">
          {NAV.map(([h, l], i) => <Link key={h} href={h} aria-current={k === h ? 'page' : undefined} onClick={() => setOverlay(null)}><span>{String(i + 1).padStart(2, '0')}</span>{l}</Link>)}
        </nav>
      )}
      <main className="main" id="main">{children}</main>
      <footer className="footer"><div className="in">
        <span>Поточний період: <b>з {fLY(CUR_START)} по {fLY(CUR_END)}</b></span>
        <span>Курс: <b>USD {S.rates.USD.toFixed(2)} ₴</b>, <b>EUR {S.rates.EUR.toFixed(2)} ₴</b></span>
        <span>Доступ: {OPEN ? 'тестовий режим без входу' : 'поки всі бачать усе'}</span>
        {CLOUD ? <SyncState /> : <span>Демо-режим: дані вигадані й живуть лише в цьому браузері</span>}
        {isMemOnly() && <span className="warn">Зміни не збережуться після перезавантаження сторінки.</span>}
      </div></footer>
    </>
  );
}

/** Дані живуть у браузері, тож рендеримо лише на клієнті */
export function AppShell({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (!ready) return <div className="boot" aria-busy="true" />;
  return <Gate><OverlayProvider><Shell>{children}</Shell></OverlayProvider></Gate>;
}
