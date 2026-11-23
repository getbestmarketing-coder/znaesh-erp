'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDB, usePrefs, setPrefs, commit } from '@/lib/store';
import { CL, isNew, projectDebt, currentSvcs, nextSvc, isTraffic } from '@/lib/domain';
import { SPECIALIST_ROLES } from '@/lib/dicts';
import type { Project } from '@/lib/types';
import { plural } from '@/lib/utils';
import { PageHead, NewProjectBtn, Seg, SearchPill } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ProjectTable, ProjectCompact } from '@/components/projects';
import { useUI } from '@/components/overlay';

type Tab = 'all' | 'active' | 'new' | 'debt' | 'freeze' | 'stop';
const TABS: [Tab, string, (p: Project) => boolean][] = [
  ['all', 'Усі', () => true], ['active', 'Активні', (p) => p.status === 'active'], ['new', 'Нові', isNew],
  ['debt', 'З боргом', (p) => projectDebt(p.id) > 0], ['freeze', 'Заморозка', (p) => p.status === 'freeze'], ['stop', 'Стоп', (p) => p.status === 'stop'],
];

function Projects() {
  const S = useDB(); const prefs = usePrefs(); const ui = useUI();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'all');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [fSpec, setFSpec] = useState(''); const [fLead, setFLead] = useState('');
  const [fSvc, setFSvc] = useState(''); const [fProj, setFProj] = useState('');
  const anyF = !!(fSpec || fLead || fSvc || fProj);
  const resetF = () => { setFSpec(''); setFLead(''); setFSvc(''); setFProj(''); };
  /* фільтри дивляться на поточні послуги проекту */
  const byPeople = (p: Project) => {
    if (fProj && p.id !== fProj) return false;
    if (!fSpec && !fLead && !fSvc) return true;
    const cur = currentSvcs(p.id);
    if (fSpec && !cur.some((x) => x.specialistId === fSpec)) return false;
    if (fSvc && !cur.some((x) => x.typeId === fSvc)) return false;
    if (fLead && !cur.some(isTraffic)) return false;
    return true;
  };
  const specs = S.team.filter((m) => SPECIALIST_ROLES.includes(m.role)).sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  const leads = S.team.filter((m) => m.role === 'tl_traffic');
  const byNo = [...S.projects].sort((a, b) => a.no - b.no);
  const tf = TABS.find((t) => t[0] === tab) || TABS[0];
  const s = q.toLowerCase();
  const list = S.projects.filter(tf[2]).filter(byPeople).filter((p) => !s || `${p.name} ${CL(p.clientId)?.name || ''} ${p.no}`.toLowerCase().includes(s)).sort((a, b) => a.no - b.no);
  const full = prefs.pdense !== 'compact';

  const bulkRenew = () => {
    let n = 0; sel.forEach((id) => currentSvcs(id).forEach((x) => { if (nextSvc(x)) n++; }));
    commit(); setSel(new Set());
    ui.toast(n ? `Створено ${n} ${plural(n, 'послугу', 'послуги', 'послуг')} на наступний місяць` : 'Наступний місяць для вибраних уже створено');
  };
  const bulkStatus = (st: Project['status']) => {
    const n = sel.size; sel.forEach((id) => { const p = S.projects.find((x) => x.id === id); if (p) p.status = st; });
    commit(); setSel(new Set()); ui.toast(`${st === 'freeze' ? 'Заморожено' : 'Активовано'}: ${n}`);
  };

  return (
    <div className={`page ${full ? 'wide' : ''}`}>
      <PageHead title="Проекти" actions={<NewProjectBtn />} />
      <div className="bar-row pl-top">
        <Seg label="Фільтр проектів" value={tab} onChange={setTab} items={TABS.map((t) => [t[0], t[1], S.projects.filter(t[2]).filter(byPeople).length])} />
        <div className="pfilters" role="group" aria-label="Фільтри">
          <label className="visually-hidden" htmlFor="fSpec">Спеціаліст</label>
          <select id="fSpec" className={`sel inline ${fSpec ? 'on' : ''}`} value={fSpec} onChange={(e) => setFSpec(e.target.value)}>
            <option value="">Усі спеціалісти</option>
            {specs.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="visually-hidden" htmlFor="fLead">Тімлід трафіку</label>
          <select id="fLead" className={`sel inline ${fLead ? 'on' : ''}`} value={fLead} onChange={(e) => setFLead(e.target.value)}>
            <option value="">Усі тімліди</option>
            {leads.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <label className="visually-hidden" htmlFor="fSvc">Послуга</label>
          <select id="fSvc" className={`sel inline ${fSvc ? 'on' : ''}`} value={fSvc} onChange={(e) => setFSvc(e.target.value)}>
            <option value="">Усі послуги</option>
            {S.serviceTypes.map((t) => <option key={t.id} value={t.id}>{t.short}</option>)}
          </select>
          <label className="visually-hidden" htmlFor="fProj">Проект</label>
          <select id="fProj" className={`sel inline ${fProj ? 'on' : ''}`} value={fProj} onChange={(e) => setFProj(e.target.value)}>
            <option value="">Усі проекти</option>
            {byNo.map((x) => <option key={x.id} value={x.id}>{x.no}. {x.name}</option>)}
          </select>
          {anyF && <button type="button" className="btn quiet sm" onClick={resetF}>Скинути</button>}
        </div>
        <div className="tools">
          <SearchPill id="pq" placeholder="Пошук проекту" value={q} onChange={setQ} />
          <div className="seg icons" role="group" aria-label="Вигляд списку">
            <button type="button" className="tab" aria-pressed={full} aria-selected={full} onClick={() => setPrefs({ pdense: 'full' })} title="Детально: з послугами" aria-label="Детально"><Icon name="rows" size={16} /></button>
            <button type="button" className="tab" aria-pressed={!full} aria-selected={!full} onClick={() => setPrefs({ pdense: 'compact' })} title="Компактно: один рядок на проект" aria-label="Компактно"><Icon name="lines" size={16} /></button>
          </div>
        </div>
      </div>
      {list.length ? (
        full ? <ProjectTable list={list} sel={sel} setSel={setSel} /> : <div className="plist dense">{list.map((p) => <ProjectCompact key={p.id} p={p} />)}</div>
      ) : (
        <div className="sec pl-empty">
          <h2>{q || anyF ? 'Нічого не знайдено' : 'Тут поки порожньо'}</h2>
          <p className="muted">{q ? `За запитом «${q}» проектів немає. Перевірте назву або номер.` : 'У цьому фільтрі немає проектів.'}</p>
          {anyF && <button type="button" className="btn" onClick={resetF}>Скинути фільтри</button>}
          {!q && !anyF && <Link className="btn primary" href="/project/new"><Icon name="plus" size={16} />Новий проект</Link>}
        </div>
      )}
      {sel.size > 0 && (
        <div className="bulk" role="region" aria-label="Дії з вибраними проектами">
          <b>Вибрано {sel.size}</b>
          <button type="button" className="btn sm" onClick={bulkRenew}><Icon name="refresh" size={14} />Продовжити послуги</button>
          <button type="button" className="btn sm" onClick={() => bulkStatus('freeze')}>Заморозити</button>
          <button type="button" className="btn sm" onClick={() => bulkStatus('active')}>Активувати</button>
          <button type="button" className="icon-btn" onClick={() => setSel(new Set())} aria-label="Зняти виділення" title="Зняти виділення"><Icon name="x" size={14} /></button>
        </div>
      )}
      <p className="muted xs pl-note">Позначка «Новий» означає, що минулого місяця проект з нами не працював. Тімлід трафіку потрібен лише для Meta, TikTok, Google Ads, Google Shopping і YouTube.</p>
    </div>
  );
}

export default function Page() { return <Suspense><Projects /></Suspense>; }
