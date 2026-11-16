'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDB } from '@/lib/store';
import { clientLTV, ST } from '@/lib/domain';
import { money, tg } from '@/lib/utils';
import { PageHead, NewProjectBtn, SearchPill, StatusBadge } from '@/components/ui';

export default function Clients() {
  const S = useDB(); const router = useRouter(); const [q, setQ] = useState('');
  const s = q.toLowerCase();
  const list = S.clients.filter((c) => !s || (c.name + c.phone + c.telegram).toLowerCase().includes(s))
    .map((c) => ({ c, ltv: clientLTV(c.id), projects: S.projects.filter((p) => p.clientId === c.id) }))
    .sort((a, b) => b.ltv - a.ltv);
  const total = list.reduce((a, x) => a + x.ltv, 0);
  return (
    <div className="page">
      <PageHead title="Замовники" text={`${S.clients.length} замовників разом принесли агенції ${money(total)}. Новий замовник з’являється тут разом із проектом.`} actions={<NewProjectBtn />} />
      <div className="bar-row"><div className="tools"><SearchPill id="cq" placeholder="ПІБ, телефон або Telegram" value={q} onChange={setQ} /></div></div>
      <div className="tbl-wrap"><table className="idx">
        <thead><tr><th>ПІБ</th><th>Проекти</th><th>Послуги, з якими працювали</th><th>Телефон</th><th>Telegram</th><th className="num">LTV</th></tr></thead>
        <tbody>{list.length ? list.map(({ c, ltv, projects }) => {
          const types = [...new Set(S.services.filter((x) => projects.some((p) => p.id === x.projectId)).map((x) => x.typeId))];
          return (
            <tr key={c.id} className="row-link" onClick={(e) => { if (!(e.target as HTMLElement).closest('a')) router.push(`/client?id=${c.id}`); }}>
              <td><Link className="row-title" href={`/client?id=${c.id}`}>{c.name}</Link></td>
              <td>{projects.map((p) => <div key={p.id} className="flex" style={{ minHeight: 28 }}>{p.name} <StatusBadge s={p.status} /></div>)}</td>
              <td>{types.map((t) => ST(t)?.short).join(', ')}</td>
              <td className="nowrap num">{c.phone}</td>
              <td><a href={tg(c.telegram)} target="_blank" rel="noopener noreferrer">{c.telegram}</a></td>
              <td className="num" style={{ fontWeight: 600 }}>{money(ltv)}</td>
            </tr>
          );
        }) : <tr><td colSpan={6}><p className="empty">Нікого не знайдено.</p></td></tr>}</tbody>
      </table></div>
    </div>
  );
}
