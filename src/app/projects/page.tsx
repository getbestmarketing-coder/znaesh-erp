'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDB, usePrefs, setPrefs, commit } from '@/lib/store';
import { CL, isNew, projectDebt, currentSvcs, nextSvc } from '@/lib/domain';
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
  const tf = TABS.find((t) => t[0] === tab) || TABS[0];
  const s = q.toLowerCase();
  const list = S.projects.filter(tf[2]).filter((p) => !s || `${p.name} ${CL(p.clientId)?.name || ''} ${p.no}`.toLowerCase().includes(s)).sort((a, b) => a.no - b.no);
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
        <Seg label="Фільтр проектів" value={tab} onChange={setTab} items={TABS.map((t) => [t[0], t[1], S.projects.filter(t[2]).length])} />
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
          <h2>{q ? 'Нічого не знайдено' : 'Тут поки порожньо'}</h2>
          <p className="muted">{q ? `За запитом «${q}» проектів немає. Перевірте назву або номер.` : 'У цьому фільтрі немає проектів.'}</p>
          {!q && <Link className="btn primary" href="/project/new"><Icon name="plus" size={16} />Новий проект</Link>}
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
