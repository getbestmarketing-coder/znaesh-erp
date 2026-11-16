'use client';
import Link from 'next/link';
import type { ReactNode, CSSProperties } from 'react';
import { Icon } from './Icon';
import { STATUS, ROLES } from '@/lib/dicts';
import type { Project, Service, Status } from '@/lib/types';
import { T, debtUAH, daysLeft, ST } from '@/lib/domain';
import { TODAY, fDs, fD, dayWord, initials, money, shortName, BASE } from '@/lib/utils';
import { getPrefs } from '@/lib/store';

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ');

export const Badge = ({ t, children }: { t?: string; children: ReactNode }) => <span className={cx('badge', t)}>{children}</span>;
export const StatusBadge = ({ s }: { s: Status }) => <Badge t={STATUS[s].t}>{STATUS[s].l}</Badge>;
export const NewBadge = () => <Badge t="accent">Новий</Badge>;
export const FreeBadge = () => <Badge t="free">Безкоштовно</Badge>;

export const Ava = ({ name }: { name?: string }) => <span className="ava" aria-hidden="true">{initials(name)}</span>;

const PAL = [['#E8E9FF', '#2B2FE0'], ['#E3F4EA', '#1F7A45'], ['#FFF0D9', '#9A5800'], ['#FDE7EC', '#B4234A'], ['#E4F1FB', '#1C6DA8'], ['#EFE8FB', '#6B3FB5'], ['#E5F4F1', '#1E7468'], ['#F3EDE6', '#7A5232']];
const PAL_D = [['#26285C', '#A9ABFF'], ['#173A24', '#5EE08A'], ['#3D2C0D', '#FFC266'], ['#45182A', '#FF8FAE'], ['#14304A', '#7CC4FF'], ['#2F2148', '#C9A8FF'], ['#123A35', '#5FD8C6'], ['#3A2C1F', '#E0B48A']];
function avaStyle(name: string, size: number): CSSProperties {
  let h = 7; for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [background, color] = (getPrefs().theme === 'dark' ? PAL_D : PAL)[h % PAL.length];
  return { background, color, width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.34)) };
}
/** Кольоровий аватар з ініціалами */
export const AvaX = ({ name, size = 32 }: { name: string; size?: number }) =>
  <span className="avx" style={avaStyle(name, size)} aria-hidden="true">{initials(name)}</span>;

export function Person({ id }: { id?: string }) {
  const t = T(id); if (!t) return <span className="muted">не призначено</span>;
  return <span className="person"><Ava name={t.name} /><span>{t.name}</span></span>;
}
export function PersonC({ id }: { id?: string }) {
  const t = T(id); if (!t) return <span className="muted">не призначено</span>;
  return <span className="person" title={`${t.name}, ${ROLES[t.role]}`}><Ava name={t.name} /><span>{shortName(t.name)}</span></span>;
}
export function PersonChip({ id }: { id?: string }) {
  const t = T(id); if (!t) return <span className="pchip empty">не призначено</span>;
  return <span className="pchip" title={`${t.name}, ${ROLES[t.role]}`}><Ava name={t.name} /><span>{shortName(t.name)}</span></span>;
}
export function Who({ id, role }: { id?: string; role?: string }) {
  const t = T(id); if (!t) return <span className="muted xs">не призначено</span>;
  const r = role || ROLES[t.role];
  return (
    <span className="who" title={`${t.name}, ${r}`}>
      <AvaX name={t.name} />
      <span className="who-t"><b>{t.name}</b><small>{r}</small></span>
    </span>
  );
}
export function Thumb({ p, cls }: { p: Pick<Project, 'name' | 'logo'>; cls?: string }) {
  return p.logo
    ? <span className={cx('thumb', cls)}><img src={p.logo} alt="" width={56} height={56} /></span>
    : <span className={cx('thumb', cls)} aria-hidden="true">{initials(p.name)}</span>;
}

const SVC_MAP: Record<string, string> = { meta: 'meta', tiktok: 'tiktok', context: 'google', shopping: 'google', youtube: 'youtube', smm: 'instagram', pack: 'instagram' };
export const svcFamily = (typeId: string) => SVC_MAP[typeId] || typeId;
/** Об'ємна іконка платформи */
export function SvcIcon({ type, size = 36 }: { type: string; size?: number }) {
  const k = SVC_MAP[type]; if (!k) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="i3d" src={`${BASE}/icons/${k}.webp`} width={size} height={size} alt="" loading="lazy" />;
}

export function DaysBadge({ s }: { s: Service }) {
  if (s.end < TODAY) return <Badge>Завершено</Badge>;
  if (s.start > TODAY) return <Badge t="accent">з {fDs(s.start)}</Badge>;
  const d = daysLeft(s);
  return <Badge t={d <= 3 ? 'error' : d <= 7 ? 'signal' : ''}>{d === 0 ? 'Сьогодні' : `${d} ${dayWord(d)}`}</Badge>;
}
export const period = (s: Service, full?: boolean) => `з ${fDs(s.start)} по ${full ? fD(s.end) : fDs(s.end)}`;

export function PriceTxt({ s }: { s: Service }) {
  if (s.free) return <span className="amt muted">0 ₴</span>;
  return <span className="amt num">{money(s.price, s.currency)}</span>;
}

/** Оплата послуги: оплачено, або рахунок виставлено і борг у гривні */
export function PayCellX({ s, onPay }: { s: Service; onPay: (s: Service) => void }) {
  if (s.free) return <FreeBadge />;
  const d = debtUAH(s);
  if (d <= 0) return <span className="paid-l"><span className="paid"><Icon name="check" /></span>Оплачено</span>;
  return (
    <span className="pay-wrap">
      <small>Рахунок виставлено</small>
      <button type="button" className="pay-chip" onClick={(e) => { e.stopPropagation(); onPay(s); }} title="Внести оплату">
        Борг {money(d)}<Icon name="arrow" size={14} />
      </button>
    </span>
  );
}

export function Seg<K extends string>({ items, value, onChange, label }: {
  items: [K, string, number?][]; value: K; onChange: (k: K) => void; label: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {items.map(([k, l, n]) => (
        <button key={k} type="button" role="tab" className="tab" aria-selected={value === k} onClick={() => onChange(k)}>
          {l}{n !== undefined && <> <span className="n">{n}</span></>}
        </button>
      ))}
    </div>
  );
}

export function SearchPill({ id, placeholder, value, onChange }: { id: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="search-pill">
      <span className="ico"><Icon name="search" size={16} /></span>
      <label className="visually-hidden" htmlFor={id}>{placeholder}</label>
      <input id={id} type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function PageHead({ title, text, badges, actions, lead, extra }: {
  title: ReactNode; text?: ReactNode; badges?: ReactNode; actions?: ReactNode; lead?: ReactNode; extra?: ReactNode;
}) {
  return (
    <header className="page-head">
      <div className="titles">
        {lead}
        <div className="title-row"><h1>{title}</h1>{badges}</div>
        {text && <p className="sub">{text}</p>}
      </div>
      <div className="actions">{actions}</div>
      {extra && <div className="extra">{extra}</div>}
    </header>
  );
}

export const BackLink = ({ href, children }: { href: string; children: ReactNode }) =>
  <Link className="back-link" href={href}><Icon name="back" size={14} />{children}</Link>;

export const ProjLink = ({ p }: { p: Project }) => <Link className="row-title" href={`/project?id=${p.id}`}>{p.name}</Link>;

export const NewProjectBtn = () =>
  <Link className="btn primary head-cta" href="/project/new"><Icon name="plus" size={16} />Новий проект</Link>;

export const svcLabel = (typeId: string) => ST(typeId)?.short || '';
