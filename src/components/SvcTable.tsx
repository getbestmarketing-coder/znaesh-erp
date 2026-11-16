'use client';
import type { Service } from '@/lib/types';
import { PJ, svcName, svcShort } from '@/lib/domain';
import { fD } from '@/lib/utils';
import { Icon } from './Icon';
import { SvcIcon, FreeBadge, PersonChip, DaysBadge, PriceTxt, PayCellX, ProjLink, period } from './ui';
import { useActions } from './dialogs';

export function SvcTable({ list, project, empty }: { list: Service[]; project?: boolean; empty?: string }) {
  const act = useActions();
  if (!list.length) return <p className="empty">{empty || 'Послуг немає.'}</p>;
  return (
    <div className="tbl-wrap"><table className="idx">
      <thead><tr>{project && <th>Проект</th>}<th>Послуга</th><th>Спеціаліст</th><th>Період</th><th>Ціна</th><th className="num">Оплата</th><th className="num"><span className="visually-hidden">Дії</span></th></tr></thead>
      <tbody>{list.map((s) => {
        const p = PJ(s.projectId);
        return (
          <tr key={s.id}>
            {project && <td>{p && <ProjLink p={p} />}</td>}
            <td className="nowrap"><span className="svc-cell"><SvcIcon type={s.typeId} size={34} /><span><span title={svcName(s)} className="row-title">{svcShort(s)}</span>{s.free && <span className="mt8" style={{ display: 'block' }}><FreeBadge /></span>}</span></span></td>
            <td><PersonChip id={s.specialistId} /></td>
            <td className="nowrap"><div title={`${fD(s.start)} по ${fD(s.end)}`}>{period(s)}</div><div className="mt8"><DaysBadge s={s} /></div></td>
            <td className="nowrap"><PriceTxt s={s} /></td>
            <td className="num"><span className="spay"><PayCellX s={s} onPay={act.pay} /></span></td>
            <td className="num nowrap"><div className="btn-group">
              {s.free && <button type="button" className="btn sm" onClick={() => act.toPaid(s)}>Зробити платною</button>}
              <button type="button" className="btn icon sm" onClick={() => act.renew(s)} aria-label="Продовжити на наступний місяць" title="Продовжити на наступний місяць"><Icon name="refresh" size={16} /></button>
              <button type="button" className="btn icon sm" onClick={() => act.editSvc(s)} aria-label="Редагувати послугу" title="Редагувати"><Icon name="edit" size={16} /></button>
            </div></td>
          </tr>
        );
      })}</tbody>
    </table></div>
  );
}
