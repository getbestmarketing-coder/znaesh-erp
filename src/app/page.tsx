'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDB } from '@/lib/store';
import {
  curPeriodTotals, isNew, svcOf, debtUAH, isCurrent, daysLeft, hasNext, priceUAH, PJ, svcShort, debtProjectsCount,
} from '@/lib/domain';
import { CUR_START, CUR_END, TODAY, fL, fLY, fDs, money, dayWord } from '@/lib/utils';
import { PageHead, NewProjectBtn, StatusBadge, PersonC, SvcIcon } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { useActions } from '@/components/dialogs';

export default function Dashboard() {
  const S = useDB(); const act = useActions(); const router = useRouter();
  const { total, paid, debt } = curPeriodTotals();
  const active = S.projects.filter((p) => p.status === 'active');
  const news = active.filter(isNew);
  const queue = S.projects.filter((p) => p.status !== 'stop').map((p) => {
    const svcs = svcOf(p.id);
    const debts = svcs.filter((s) => !s.free && debtUAH(s) > 0 && (isCurrent(s) || s.end < TODAY));
    const ends = p.status === 'active' ? svcs.filter((s) => isCurrent(s) && daysLeft(s) <= 7 && !hasNext(s)) : [];
    const minDays = ends.length ? Math.min(...ends.map(daysLeft)) : 99;
    return { p, debts, ends, debt: debts.reduce((a, s) => a + debtUAH(s), 0), minDays };
  }).filter((x) => x.debts.length || x.ends.length).sort((a, b) => a.minDays - b.minDays || b.debt - a.debt);
  const byType = S.serviceTypes.map((t) => { const l = S.services.filter((s) => s.typeId === t.id && isCurrent(s)); return { t, n: l.length, sum: l.reduce((a, s) => a + priceUAH(s), 0) }; }).filter((x) => x.n);
  const maxSum = Math.max(1, ...byType.map((x) => x.sum));
  const load = S.team.filter((t) => ['target', 'google', 'designer', 'video'].includes(t.role))
    .map((t) => ({ t, n: new Set(S.services.filter((s) => isCurrent(s) && s.specialistId === t.id).map((s) => s.projectId)).size }))
    .sort((a, b) => b.n - a.n);
  const maxN = Math.max(1, ...load.map((x) => x.n));
  const renewN = S.services.filter((s) => isCurrent(s) && PJ(s.projectId)?.status === 'active' && daysLeft(s) <= 7 && !hasNext(s)).length;
  const pp = total ? (paid / total) * 100 : 0;

  const bento = (
    <div className="bento">
      <div className="tile wide"><span className="k">Сума за період</span><span className="v">{money(total)}</span>
        <div className="split" aria-hidden="true"><i className="p" style={{ width: `${pp.toFixed(1)}%` }} /><i className="o" style={{ width: `${(100 - pp).toFixed(1)}%` }} /></div>
        <div className="legend"><span><i style={{ background: 'var(--blue-2)' }} />Оплачено {money(paid)}</span><span><i style={{ background: 'var(--yellow)' }} />Очікуємо {money(debt)}</span></div></div>
      <Link className="tile" href="/projects?tab=debt"><span className="k">Борг</span><span className={`v ${debt ? 'red' : ''}`}>{money(debt)}</span><span className="d">{debtProjectsCount()} проектів, показати</span></Link>
      <div className="tile"><span className="k">Продовжити</span><span className="v">{renewN}</span><span className="d">послуг за 7 днів</span></div>
      <div className="tile"><span className="k">Активні проекти</span><span className="v">{active.length}</span><span className="d">з {S.projects.length}, заморожено {S.projects.filter((p) => p.status === 'freeze').length}</span></div>
      <div className="tile"><span className="k">Нові проекти</span><span className="v yellow">{news.length}</span><span className="d">цього місяця</span></div>
      <Link className="tile wide" href="/projects"><span className="k">Оплачено</span><span className="v">{Math.round(pp)}<span className="u">%</span></span><span className="d">{money(paid)}</span></Link>
    </div>
  );

  return (
    <div className="page">
      <PageHead title="Цей місяць" text={`Період з ${fL(CUR_START)} по ${fLY(CUR_END)}.`} actions={<NewProjectBtn />} extra={bento} />
      <section className="sec" aria-labelledby="qh">
        <div className="sec-h"><h2 id="qh">Черга на сьогодні</h2><span className="r">{queue.length} {queue.length === 1 ? 'проект' : 'проектів'}</span></div>
        {queue.length ? (
          <div className="tbl-wrap"><table className="idx restack">
            <thead><tr><th>Проект</th><th>Зібрати оплату</th><th>Продовжити</th><th>Клієнт-менеджер</th><th className="num"><span className="visually-hidden">Дії</span></th></tr></thead>
            <tbody>{queue.map(({ p, debts, ends, debt: d, minDays }) => (
              <tr key={p.id} className="row-link" onClick={(e) => { if (!(e.target as HTMLElement).closest('a,button')) router.push(`/project?id=${p.id}`); }}>
                <td data-label="Проект"><div className="queue-name"><span className="qnum">{p.no}</span><Link className="row-title" href={`/project?id=${p.id}`}>{p.name}</Link></div>{p.status !== 'active' && <div className="mt8"><StatusBadge s={p.status} /></div>}</td>
                <td data-label="Зібрати оплату">{debts.length
                  ? <><span className="debt">{money(d)}</span><div className="muted xs">{debts.map(svcShort).join(', ')}</div></>
                  : <span className="paid"><Icon name="check" /><span className="visually-hidden">Боргу немає</span></span>}</td>
                <td data-label="Продовжити">{ends.length
                  ? <><span className="nowrap" style={{ fontWeight: 600 }}>{ends.length} {ends.length === 1 ? 'послуга' : 'послуги'} до {fDs(ends[0].end)}</span><div className="muted xs">{minDays === 0 ? 'закінчується сьогодні' : `залишилось ${minDays} ${dayWord(minDays)}`}</div></>
                  : <span className="muted">не потрібно</span>}</td>
                <td data-label="Клієнт-менеджер"><PersonC id={p.cm} /></td>
                <td className="num" data-label="Дії"><div className="btn-group">
                  {debts.length > 0 && <button type="button" className="btn sm" onClick={() => (debts.length === 1 ? act.pay(debts[0]) : router.push(`/project?id=${p.id}`))}>Внести оплату</button>}
                  {ends.length > 0 && <button type="button" className="btn sm" onClick={() => act.renewAll(p.id)}>Продовжити</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table></div>
        ) : <p className="empty">Черга порожня: усе оплачено, нічого не закінчується найближчі 7 днів.</p>}
      </section>
      <div className="layout-home">
        <section aria-labelledby="ch">
          <div className="sec-h"><h2 id="ch">Сума за послугами</h2><span className="r">у гривні</span></div>
          <figure className="chart" aria-label="Діаграма: сума поточних послуг за типом">
            {byType.map((x) => (
              <div key={x.t.id} className="chart-row"><span className="svc-cell"><SvcIcon type={x.t.id} size={28} /><span>{x.t.short} <span className="muted">({x.n})</span></span></span>
                <span className="bar"><i style={{ width: `${((x.sum / maxSum) * 100).toFixed(1)}%` }} /></span><span className="v">{money(x.sum)}</span></div>
            ))}
          </figure>
        </section>
        <section aria-labelledby="lh">
          <div className="sec-h"><h2 id="lh">Навантаження</h2><span className="r">проектів зараз</span></div>
          <div aria-label="Навантаження спеціалістів">
            {load.map((x) => (
              <div key={x.t.id} className="load-row"><span><PersonC id={x.t.id} /></span><span className="bar"><i style={{ width: `${((x.n / maxN) * 100).toFixed(1)}%` }} /></span><span className="right num">{x.n}</span></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
