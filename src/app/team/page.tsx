'use client';
import { Fragment } from 'react';
import { useDB } from '@/lib/store';
import { isCurrent, isTraffic } from '@/lib/domain';
import { ROLES, ROLE_ORDER } from '@/lib/dicts';
import { tg } from '@/lib/utils';
import { PageHead, Person } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { MemberModal } from '@/components/dialogs';
import { useUI } from '@/components/overlay';

export default function Team() {
  const S = useDB(); const ui = useUI();
  const cnt = (id: string) => new Set([
    ...S.services.filter((s) => isCurrent(s) && s.specialistId === id).map((s) => s.projectId),
    ...S.projects.filter((p) => p.status !== 'stop' && (p.cm === id || p.coo === id)).map((p) => p.id),
  ]).size;
  const tlCount = new Set(S.services.filter((s) => isCurrent(s) && isTraffic(s)).map((s) => s.projectId)).size;
  return (
    <div className="page narrow">
      <PageHead title="Команда" text={`${S.team.length} людей у ${ROLE_ORDER.length} ролях.`}
        actions={<button type="button" className="btn primary" onClick={() => ui.open(<MemberModal key={Date.now()} />)}><Icon name="plus" size={16} />Додати людину</button>} />
      <div className="info-line"><span className="ico"><Icon name="shield" /></span><p>Наразі всі бачать усе. Ролі вже закладені, тож права доступу можна буде обмежити для кожної ролі окремо.</p></div>
      <div className="sec"><div className="tbl-wrap"><table className="idx">
        <thead><tr><th>Ім’я</th><th>Телефон</th><th>Telegram</th><th className="num">Проектів зараз</th><th>Доступ</th><th className="num"><span className="visually-hidden">Дії</span></th></tr></thead>
        <tbody>{ROLE_ORDER.map((r) => {
          const m = S.team.filter((t) => t.role === r); if (!m.length) return null;
          return (
            <Fragment key={r}>
              <tr className="group"><td colSpan={6}>{ROLES[r]}</td></tr>
              {m.map((t) => (
                <tr key={t.id}>
                  <td><Person id={t.id} /></td><td className="nowrap num">{t.phone}</td>
                  <td><a href={tg(t.telegram)} target="_blank" rel="noopener noreferrer">{t.telegram}</a></td>
                  <td className="num">{(r === 'tl_traffic' ? tlCount : cnt(t.id)) || ''}</td><td>Повний</td>
                  <td className="num"><button type="button" className="btn icon sm" onClick={() => ui.open(<MemberModal key={t.id + Date.now()} t={t} />)} aria-label={`Редагувати ${t.name}`}><Icon name="edit" size={16} /></button></td>
                </tr>
              ))}
            </Fragment>
          );
        })}</tbody>
      </table></div></div>
    </div>
  );
}
