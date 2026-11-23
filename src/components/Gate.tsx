'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { CLOUD, OPEN, sb } from '@/lib/supabase';
import { db, loadCloud, listenCloud, bootstrap, OPEN_ME } from '@/lib/store';
import { ROLES } from '@/lib/dicts';
import { BASE } from '@/lib/utils';
import { Logo } from './Logo';

type Phase = 'loading' | 'login' | 'bootstrap' | 'denied' | 'ready' | 'error' | 'pick';

function Card({ children }: { children: ReactNode }) {
  return (
    <div className="gate">
      <div className="gate-card">
        <div className="gate-logo"><Logo /></div>
        {children}
      </div>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState(''); const [sent, setSent] = useState(false);
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const send = async () => {
    const e = email.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(e)) { setErr('Вкажіть робочу пошту.'); return; }
    setBusy(true); setErr('');
    const { error } = await sb().auth.signInWithOtp({ email: e, options: { emailRedirectTo: location.origin + BASE + '/' } });
    setBusy(false);
    if (error) setErr(error.message.includes('rate') ? 'Забагато спроб. Зачекайте кілька хвилин і спробуйте знову.' : error.message);
    else setSent(true);
  };
  if (sent) return <Card><h1>Перевірте пошту</h1><p className="muted">Ми надіслали посилання для входу на <b>{email}</b>. Відкрийте лист і натисніть посилання.</p><button type="button" className="btn quiet" onClick={() => setSent(false)}>Ввести іншу пошту</button></Card>;
  return (
    <Card>
      <h1>Вхід у ЗНАЄШ ERP</h1>
      <p className="muted">Вкажіть пошту, яку власник додав у розділ «Команда». Пароль не потрібен: прийде посилання для входу.</p>
      <form className="form" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <div className="fld"><label htmlFor="lEmail">Робоча пошта</label><input className="inp" id="lEmail" type="email" autoComplete="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <p className="form-error" role="alert">{err}</p>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? 'Надсилаю…' : 'Надіслати посилання'}</button>
      </form>
    </Card>
  );
}

function Bootstrap({ email, onDone }: { email: string; onDone: () => void }) {
  const [name, setName] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  return (
    <Card>
      <h1>Перший запуск</h1>
      <p className="muted">{email ? <>База ще порожня. Ви станете власником ERP ({email}). Потім додасте команду в розділі «Команда».</> : <>База ще порожня. Ви станете власником ERP. Потім додасте команду в розділі «Команда».</>}</p>
      <form className="form" onSubmit={async (e) => {
        e.preventDefault(); if (!name.trim()) { setErr('Вкажіть ім’я та прізвище.'); return; }
        setBusy(true);
        try { await bootstrap(name.trim(), email); onDone(); } catch (x) { setErr((x as Error).message); setBusy(false); }
      }}>
        <div className="fld"><label htmlFor="bName">Ім’я та прізвище</label><input className="inp" id="bName" autoFocus value={name} onChange={(e) => setName(e.target.value)} /></div>
        <p className="form-error" role="alert">{err}</p>
        <button type="submit" className="btn primary" disabled={busy}>Почати роботу</button>
      </form>
    </Card>
  );
}

/** Режим без входу: людина обирає себе зі списку команди */
function Pick({ onDone }: { onDone: () => void }) {
  const team = db().team;
  return (
    <Card>
      <h1>Хто ви?</h1>
      <p className="muted">Тестовий режим без входу. Оберіть себе, щоб нотатки й дії підписувались вашим ім’ям.</p>
      <div className="list">
        {team.map((t) => (
          <button key={t.id} type="button" className="sr" onClick={() => { try { localStorage.setItem(OPEN_ME, t.id); } catch { /* */ } onDone(); }}>
            <span><b>{t.name}</b><small>{ROLES[t.role]}</small></span>
          </button>
        ))}
      </div>
    </Card>
  );
}

export function signOut() { return sb().auth.signOut().then(() => location.reload()); }

/** Пускає в ERP лише учасників команди. У демо-режимі просто показує застосунок. */
export function Gate({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<Phase>(CLOUD ? 'loading' : 'ready');
  const [session, setSession] = useState<Session | null>(null);
  const [err, setErr] = useState('');
  const [tick, setTick] = useState(0);

  /* тестовий режим без входу */
  useEffect(() => {
    if (!OPEN) return;
    let alive = true;
    (async () => {
      try {
        setPhase('loading');
        await loadCloud();
        if (!db().team.length) { if (alive) setPhase('bootstrap'); return; }
        let id = ''; try { id = localStorage.getItem(OPEN_ME) || ''; } catch { /* */ }
        const me = db().team.find((t) => t.id === id);
        if (!me) { if (alive) setPhase('pick'); return; }
        db().me = me.id; listenCloud();
        if (alive) setPhase('ready');
      } catch (x) {
        if (alive) { setErr((x as Error).message); setPhase('error'); }
      }
    })();
    return () => { alive = false; };
  }, [tick]);

  useEffect(() => {
    if (!CLOUD || OPEN) return;
    sb().auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setPhase('login'); });
    const { data: sub } = sb().auth.onAuthStateChange((_e, s) => { setSession(s); if (!s) setPhase('login'); });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!CLOUD || !session) return;
    const email = (session.user.email || '').toLowerCase();
    let alive = true;
    (async () => {
      try {
        setPhase('loading');
        const { data: empty, error } = await sb().rpc('erp_no_members');
        if (error) throw error;
        if (empty) { if (alive) setPhase('bootstrap'); return; }
        await loadCloud();
        const me = db().team.find((t) => (t.email || '').toLowerCase() === email);
        if (!me) { if (alive) setPhase('denied'); return; }
        db().me = me.id; listenCloud();
        if (alive) setPhase('ready');
      } catch (x) {
        if (alive) { setErr((x as Error).message); setPhase('error'); }
      }
    })();
    return () => { alive = false; };
  }, [session, tick]);

  if (phase === 'ready') return <>{children}</>;
  if (phase === 'login') return <Login />;
  if (OPEN && phase === 'bootstrap') return <Bootstrap email="" onDone={() => setTick((t) => t + 1)} />;
  if (phase === 'pick') return <Pick onDone={() => setTick((t) => t + 1)} />;
  if (phase === 'bootstrap' && session) return <Bootstrap email={(session.user.email || '').toLowerCase()} onDone={() => setTick((t) => t + 1)} />;
  if (phase === 'denied') return <Card><h1>Немає доступу</h1><p className="muted">Пошти <b>{session?.user.email}</b> немає в команді. Попросіть власника додати її в розділі «Команда» і увійдіть знову.</p><button type="button" className="btn" onClick={signOut}>Вийти</button></Card>;
  if (phase === 'error') return <Card><h1>Не вдалося підключитися</h1><p className="muted">{err}</p><button type="button" className="btn" onClick={() => location.reload()}>Спробувати ще раз</button></Card>;
  return <div className="gate"><div className="gate-spin" aria-label="Завантаження" /></div>;
}
