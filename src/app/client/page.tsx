'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDB } from '@/lib/store';
import { CL, FOP, PJ, ST, clientLTV, currentSvcs, isNew, svcShort } from '@/lib/domain';
import { fD, fLY, money, tg } from '@/lib/utils';
import { PageHead, BackLink, Thumb, ProjLink, NewBadge, StatusBadge, period } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { ClientModal } from '@/components/dialogs';
import { useUI } from '@/components/overlay';

function ClientView() {
  const S = useDB(); const ui = useUI();
  const c = CL(useSearchParams().get('id') || undefined);
  if (!c) return <div className="page"><PageHead title="Замовника не знайдено" actions={<Link className="btn" href="/clients">До замовників</Link>} /></div>;
  const projects = S.projects.filter((p) => p.clientId === c.id);
  const svcs = S.services.filter((s) => projects.some((p) => p.id === s.projectId));
  const pays = svcs.flatMap((s) => s.payments.map((x) => ({ ...x, s }))).sort((a, b) => (a.date < b.date ? 1 : -1));
  const types = [...new Set(svcs.map((s) => s.typeId))];
  return (
    <div className="page narrow">
      <PageHead title={c.name} text={`Замовник з ${fLY(c.createdAt)}.`} lead={<BackLink href="/clients">Замовники</BackLink>}
        actions={<button type="button" className="btn" onClick={() => ui.open(<ClientModal key={Date.now()} c={c} />)}>Редагувати</button>}
        extra={<div className="bento" style={{ gridTemplateColumns: 'repeat(3,minmax(0,1fr))' }}>
          <div className="tile"><span className="k">LTV, усього принесено</span><span className="v">{money(clientLTV(c.id))}</span><span className="d">оновлюється з кожною оплатою</span></div>
          <div className="tile"><span className="k">Оплат</span><span className="v">{pays.length}</span></div>
          <div className="tile"><span className="k">Проектів</span><span className="v">{projects.length}</span></div>
        </div>} />
      <div className="layout-detail">
        <div>
          <section className="sec" aria-labelledby="cp"><div className="sec-h"><h2 id="cp">Проекти</h2></div>
            <div className="list">{projects.map((p) => (
              <div key={p.id} className="li"><Thumb p={p} /><div className="grow"><ProjLink p={p} /> {isNew(p) && <NewBadge />}<small>{currentSvcs(p.id).map(svcShort).join(', ')}</small></div><StatusBadge s={p.status} /></div>
            ))}</div>
          </section>
          <section className="sec" aria-labelledby="ph"><div className="sec-h"><h2 id="ph">Історія оплат</h2></div>
            {pays.length ? (
              <div className="tbl-wrap"><table className="idx">
                <thead><tr><th>Дата</th><th>Проект</th><th>Послуга</th><th>Отримувач</th><th className="num">Сума</th></tr></thead>
                <tbody>{pays.map((x) => (
                  <tr key={x.id}><td className="num nowrap">{fD(x.date)}</td><td>{PJ(x.s.projectId)?.name}</td><td>{svcShort(x.s)}<div className="muted xs">{period(x.s)}</div></td><td className="xs">{FOP(x.fopId)?.name || ''}</td><td className="num" style={{ fontWeight: 600 }}>{money(x.amount)}</td></tr>
                ))}</tbody>
              </table></div>
            ) : <p className="empty">Оплат ще немає.</p>}
          </section>
        </div>
        <aside className="panel" aria-label="Контакти">
          <section><h2>Контакти</h2><div className="links">
            <a href={`tel:${c.phone.replace(/\s/g, '')}`}><Icon name="phone" size={16} /><span className="num">{c.phone}</span></a>
            <a href={tg(c.telegram)} target="_blank" rel="noopener noreferrer"><Icon name="send" size={16} />{c.telegram}</a>
          </div></section>
          <section><h2>Послуги, з якими працювали</h2><p className="small">{types.map((t) => ST(t)?.name).join(', ') || 'Ще немає'}</p></section>
        </aside>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense><ClientView /></Suspense>; }
