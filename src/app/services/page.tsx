'use client';
import { useState } from 'react';
import { useDB } from '@/lib/store';
import { isCurrent, PJ, priceUAH, debtUAH } from '@/lib/domain';
import { ROLES } from '@/lib/dicts';
import { CUR_START, CUR_END, fL, money, plural } from '@/lib/utils';
import { PageHead, Seg, SvcIcon } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SvcTable } from '@/components/SvcTable';
import { useActions, TypeModal } from '@/components/dialogs';
import { useUI } from '@/components/overlay';

export default function Services() {
  const S = useDB(); const act = useActions(); const ui = useUI();
  const [tab, setTab] = useState<'monthly' | 'catalog'>('monthly');
  const [type, setType] = useState('all');
  const [scope, setScope] = useState<'current' | 'all'>('current');
  let list = S.services.slice();
  if (scope === 'current') list = list.filter(isCurrent);
  if (type !== 'all') list = list.filter((s) => s.typeId === type);
  list.sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : (PJ(a.projectId)?.name || '').localeCompare(PJ(b.projectId)?.name || '')));
  const sum = list.reduce((a, s) => a + priceUAH(s), 0), debt = list.reduce((a, s) => a + debtUAH(s), 0);

  return (
    <div className="page">
      <PageHead title="Послуги" text={`Помісячні. За замовчуванням з ${fL(CUR_START)} по ${fL(CUR_END)}, дати й ціну можна змінити.`}
        actions={<button type="button" className="btn primary" onClick={() => act.addSvc()}><Icon name="plus" size={16} />Створити послугу</button>} />
      <div className="bar-row"><Seg label="Вигляд" value={tab} onChange={setTab} items={[['monthly', 'Помісячні послуги'], ['catalog', 'Каталог і ціни']]} /></div>
      {tab === 'catalog' ? (
        <div className="sec"><div className="tbl-wrap"><table className="idx">
          <thead><tr><th>Послуга</th><th>Команда</th><th>Хто веде</th><th className="num">Базова ціна</th><th className="num">У гривні</th><th className="num">Діють зараз</th><th className="num"><span className="visually-hidden">Дії</span></th></tr></thead>
          <tbody>{S.serviceTypes.map((t) => (
            <tr key={t.id}>
              <td><span className="svc-cell"><SvcIcon type={t.id} size={34} /><span className="row-title">{t.name}</span></span></td>
              <td>{t.team === 'traffic' ? 'Трафік, з тімлідом' : 'SMM, без тімліда'}</td>
              <td>{t.roles.map((r) => ROLES[r]).join(', ')}</td>
              <td className="num">{money(t.price, t.currency)}</td>
              <td className="num">{money(t.price * S.rates[t.currency])}</td>
              <td className="num">{S.services.filter((s) => s.typeId === t.id && isCurrent(s)).length}</td>
              <td className="num"><button type="button" className="btn sm" onClick={() => ui.open(<TypeModal key={t.id + Date.now()} t={t} />)}>Змінити ціну</button></td>
            </tr>
          ))}</tbody>
        </table></div></div>
      ) : (
        <>
          <div className="bar-row">
            <div className="chips" role="group" aria-label="Тип послуги">
              <button type="button" className="chip" aria-pressed={type === 'all'} onClick={() => setType('all')}>Усі</button>
              {S.serviceTypes.map((t) => <button key={t.id} type="button" className="chip" aria-pressed={type === t.id} onClick={() => setType(t.id)}>{t.short}</button>)}
            </div>
            <div className="tools">
              <label className="visually-hidden" htmlFor="scope">Період</label>
              <select id="scope" className="sel inline" value={scope} onChange={(e) => setScope(e.target.value as 'current' | 'all')}>
                <option value="current">Діють зараз</option><option value="all">Уся історія</option>
              </select>
            </div>
          </div>
          <div className="sec">
            <div className="sec-h"><h2>{list.length} {plural(list.length, 'послуга', 'послуги', 'послуг')}</h2>
              <span className="r num">Сума {money(sum)}{debt > 0 && <>, борг <span className="debt">{money(debt)}</span></>}</span></div>
            <SvcTable list={list} project empty="Послуг цього типу немає." />
          </div>
        </>
      )}
    </div>
  );
}
