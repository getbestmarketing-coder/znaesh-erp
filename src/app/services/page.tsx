'use client';
import { useDB } from '@/lib/store';
import { isCurrent } from '@/lib/domain';
import { ROLES } from '@/lib/dicts';
import { money } from '@/lib/utils';
import { PageHead, SvcIcon } from '@/components/ui';
import { TypeModal } from '@/components/dialogs';
import { useUI } from '@/components/overlay';

/** Каталог послуг і базові ціни */
export default function Services() {
  const S = useDB(); const ui = useUI();
  return (
    <div className="page">
      <PageHead title="Послуги" text="Каталог послуг і базові ціни. Нова послуга в проекті бере ціну звідси, чинні послуги не змінюються." />
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
    </div>
  );
}
