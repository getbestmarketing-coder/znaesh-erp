'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { MouseEvent } from 'react';
import type { Project, Service } from '@/lib/types';
import { STATUS, ROLES } from '@/lib/dicts';
import { commit } from '@/lib/store';
import {
  CL, T, currentSvcs, trafficLead, projectDebt, isNew, isTraffic, svcName, svcShort, debtUAH, daysLeft, projStats,
} from '@/lib/domain';
import { TODAY, fDs, dayWord, money, shortName, initials, plural } from '@/lib/utils';
import { Icon } from './Icon';
import { AvaX, Who, Thumb, NewBadge, StatusBadge, FreeBadge, SvcIcon, svcFamily, cx } from './ui';
import { useActions } from './dialogs';
import { useUI } from './overlay';

const isInteractive = (e: MouseEvent) => !!(e.target as HTMLElement).closest('a,button,select,input,label');

function StatusPill({ p }: { p: Project }) {
  const ui = useUI();
  return (
    <span className={`spill t-${p.status}`}>
      <label className="visually-hidden" htmlFor={`st_${p.id}`}>Статус проекту {p.name}</label>
      <select id={`st_${p.id}`} value={p.status} onChange={(e) => { p.status = e.target.value as Project['status']; commit(); ui.toast(`${p.name}: ${STATUS[p.status].l.toLowerCase()}`); }}>
        {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
      </select>
    </span>
  );
}

function PayMini({ s }: { s: Service }) {
  const act = useActions();
  if (s.free) return <FreeBadge />;
  const d = debtUAH(s);
  if (d <= 0) return <span className="ok-ic" role="img" aria-label="Оплачено" title="Оплачено"><Icon name="check" size={13} /></span>;
  return <button type="button" className="debt-l" onClick={() => act.pay(s)} title="Рахунок виставлено, не оплачено. Натисніть, щоб внести оплату">−{money(d)}</button>;
}

function SvcLine({ s }: { s: Service }) {
  const act = useActions(); const t = T(s.specialistId); const tl = trafficLead();
  const ended = s.end < TODAY, fut = s.start > TODAY, d = daysLeft(s);
  const left = ended ? 'завершено' : fut ? `старт ${fDs(s.start)}` : d === 0 ? 'останній день' : `${d} ${dayWord(d)}`;
  const tone = ended || fut ? '' : d <= 3 ? 'hot' : d <= 7 ? 'warm' : '';
  return (
    <div className="sl">
      <span className="sl-svc">
        <span className="sl-ic">{t && <AvaX name={t.name} />}<SvcIcon type={s.typeId} size={36} /></span>
        <span className="sl-t">
          <b title={svcName(s)}>{svcName(s)}</b>
          <small>
            <span className="sl-who" title={t ? `${t.name}, ${ROLES[t.role]}` : ''}>{t ? shortName(t.name) : 'не призначено'}</span>
            <span className="dot" /><span className="num">{fDs(s.start)} – {fDs(s.end)}</span><em className={tone}>{left}</em>
          </small>
        </span>
        <span className="sl-acts">
          <button type="button" className="tb ic sm" onClick={() => act.renew(s)} aria-label="Продовжити на наступний місяць" title="Продовжити на наступний місяць"><Icon name="refresh" size={14} /></button>
          <button type="button" className="tb ic sm" onClick={() => act.editSvc(s)} aria-label="Редагувати послугу" title="Редагувати послугу"><Icon name="edit" size={14} /></button>
        </span>
      </span>
      <span className="sl-lead">{isTraffic(s) && tl && <Who id={tl.id} role="Тімлід трафіку" />}</span>
      <span className="sl-pay"><PayMini s={s} /></span>
    </div>
  );
}

function RowActions({ p }: { p: Project }) {
  const act = useActions();
  const link = (k: 'kpiUrl' | 'drive', cls: string, txt: string, on: string, off: string, ico?: 'folder') => p[k]
    ? <a className={`tb ${cls} on`} href={p[k]} target="_blank" rel="noopener noreferrer" title={on}>{ico && <Icon name={ico} size={16} />}<span>{txt}</span></a>
    : <span className={`tb ${cls} off`} role="link" aria-disabled="true" title={off}>{ico && <Icon name={ico} size={16} />}<span>{txt}</span></span>;
  return (
    <span className="tacts">
      {link('kpiUrl', 'kpi', 'KPI', 'Відкрити KPI проекту', 'Посилання на KPI ще не додано. Клієнт-менеджер додає його в картці проекту')}
      {link('drive', 'drive', 'Диск', 'Відкрити папку проекту на Google Диску', 'Посилання на Google Диск ще не додано. Клієнт-менеджер додає його в картці проекту', 'folder')}
      {p.chat
        ? <a className="tb chat on" href={p.chat} target="_blank" rel="noopener noreferrer" title="Робочий чат у Telegram"><Icon name="send" size={16} /><span>Чат</span></a>
        : <button type="button" className="tb chat" onClick={() => act.link(p, 'chat')} title="Робочий чат: додати посилання"><Icon name="send" size={16} /><span>Чат</span></button>}
      <Link className="tb ic" href={`/project/edit?id=${p.id}`} title="Редагувати проект" aria-label="Редагувати проект"><Icon name="edit" size={16} /></Link>
    </span>
  );
}

function TRow({ p, sel, onSel }: { p: Project; sel: boolean; onSel: (on: boolean) => void }) {
  const router = useRouter(); const act = useActions();
  const c = CL(p.clientId), cur = currentSvcs(p.id), debt = projectDebt(p.id);
  return (
    <div className={cx('trow', `is-${p.status}`, sel && 'is-sel')} onClick={(e) => { if (!isInteractive(e)) router.push(`/project?id=${p.id}`); }}>
      <span className="tsel"><input type="checkbox" className="chk" checked={sel} onChange={(e) => onSel(e.target.checked)} aria-label={`Вибрати проект ${p.name}`} /></span>
      <span className="tno">{p.no}</span>
      <span className="tstat"><StatusPill p={p} />{debt > 0 && <i className="tag-debt">Борг</i>}</span>
      <span className="tproj"><Thumb p={p} />
        <span className="tproj-t"><span className="tname"><Link className="pname" href={`/project?id=${p.id}`}>{p.name}</Link>{isNew(p) && <NewBadge />}</span><small>{c?.name || ''}</small></span>
      </span>
      <span className="tcm"><Who id={p.cm} role="Клієнт-менеджер" /></span>
      <div className="tsvcs">
        {cur.length ? cur.map((s) => <SvcLine key={s.id} s={s} />)
          : <div className="sl-empty">Послуг у поточному періоді немає<button type="button" className="tb sm" onClick={() => act.addSvc(p.id)}><Icon name="plus" size={14} />Додати послугу</button></div>}
      </div>
      <RowActions p={p} />
    </div>
  );
}

export function ProjectTable({ list, sel, setSel }: { list: Project[]; sel: Set<string>; setSel: (s: Set<string>) => void }) {
  const all = list.length > 0 && list.every((p) => sel.has(p.id));
  const toggle = (id: string, on: boolean) => { const n = new Set(sel); if (on) n.add(id); else n.delete(id); setSel(n); };
  return (
    <div className="ptable" role="table" aria-label="Проекти">
      <div className="thead" role="row">
        <span className="tsel"><input type="checkbox" className="chk" checked={all} aria-label="Вибрати всі проекти"
          onChange={(e) => { const n = new Set(sel); list.forEach((p) => (e.target.checked ? n.add(p.id) : n.delete(p.id))); setSel(n); }} /></span>
        <span className="tno">№</span><span>Статус</span><span>Проект</span><span className="tcm" title="Клієнт-менеджер">Клієнт-менеджер</span>
        <span className="tsvcs-h"><span>Послуга, спеціаліст і період</span><span className="sl-lead" title="Тімлід трафіку">Тімлід трафіку</span><span className="sl-pay">Оплата</span></span>
        <span className="tacts-h">Робота з проектом</span>
      </div>
      {list.map((p) => <TRow key={p.id} p={p} sel={sel.has(p.id)} onSel={(on) => toggle(p.id, on)} />)}
    </div>
  );
}

function TotalBlock({ p }: { p: Project }) {
  const st = projStats(p);
  if (!st.sum) return <div className="ptotal"><em className="muted">Без оплати</em></div>;
  if (!st.debt) return <div className="ptotal is-ok"><span className="paid-l"><span className="paid"><Icon name="check" /></span>Усе оплачено</span></div>;
  return <div className="ptotal"><span className="lbl">Борг за проектом</span><b className="num debt">{money(st.debt)}</b></div>;
}

/** Компактний вигляд: один рядок на проект */
export function ProjectCompact({ p }: { p: Project }) {
  const router = useRouter();
  const c = CL(p.clientId), st = projStats(p), cur = st.cur, tl = trafficLead(), hasTraffic = cur.some(isTraffic);
  const people = [hasTraffic && tl ? tl.id : null, p.cm, p.coo].filter(Boolean) as string[];
  const kinds = [...new Map(cur.map((s) => [svcFamily(s.typeId), s])).values()];
  const d = st.minDays;
  return (
    <div className={`prow is-${p.status}`}>
      <div className="pnum" aria-label={`Проект номер ${p.no}`}>{p.no}</div>
      <article className="pcard compact" onClick={(e) => { if (!isInteractive(e)) router.push(`/project?id=${p.id}`); }}>
        <header className="pcard-h">
          <Thumb p={p} />
          <div className="pmain"><div className="ptitle"><Link className="pname" href={`/project?id=${p.id}`}>{p.name}</Link><StatusBadge s={p.status} />{isNew(p) && <NewBadge />}</div><span className="pclient">{c?.name || ''}</span></div>
          <div className="picons" aria-label={`Послуги: ${cur.map(svcShort).join(', ')}`}>
            {kinds.map((s) => <span key={s.id} title={cur.filter((x) => svcFamily(x.typeId) === svcFamily(s.typeId)).map(svcShort).join(', ')}><SvcIcon type={s.typeId} size={40} /></span>)}
            <small>{cur.length} {plural(cur.length, 'послуга', 'послуги', 'послуг')}</small>
          </div>
          <div className="pavas">{people.map((id) => { const t = T(id); return t ? <span key={id} className="ava" title={`${t.name}, ${ROLES[t.role]}`}>{initials(t.name)}</span> : null; })}</div>
          <div className="pend">{d === null ? <span className="muted">немає активних</span>
            : <><span className={cx('left', d <= 3 ? 'hot' : d <= 7 && 'warm')}>{d === 0 ? 'Останній день' : `${d} ${dayWord(d)}`}</span><small>до кінця періоду</small></>}</div>
          <TotalBlock p={p} />
        </header>
      </article>
    </div>
  );
}
