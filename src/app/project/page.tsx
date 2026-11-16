'use client';
import Link from 'next/link';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDB, commit } from '@/lib/store';
import {
  PJ, CL, FOP, svcOf, currentSvcs, trafficLead, isTraffic, priceUAH, paidUAH, debtUAH, clientLTV, isNew, svcShort,
} from '@/lib/domain';
import { STATUS, DOC_TYPES } from '@/lib/dicts';
import type { Project } from '@/lib/types';
import { TODAY, fD, fLY, money, url, tg, uid, isUrl, plural } from '@/lib/utils';
import { PageHead, BackLink, Thumb, StatusBadge, NewBadge, Badge, Seg, Person, PersonC } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';
import { SvcTable } from '@/components/SvcTable';
import { useActions } from '@/components/dialogs';
import { useUI } from '@/components/overlay';

function WorkLinks({ p }: { p: Project }) {
  const act = useActions(); const ui = useUI();
  const [vals, setVals] = useState({ drive: '', kpiUrl: '' });
  const [errs, setErrs] = useState({ drive: '', kpiUrl: '' });
  const rows: ['drive' | 'kpiUrl', IconName, string, string, string][] = [
    ['drive', 'folder', 'Google Диск', 'Папка проекту', 'https://drive.google.com/…'],
    ['kpiUrl', 'chart', 'KPI', 'Таблиця KPI', 'https://docs.google.com/spreadsheets/…'],
  ];
  const save = (k: 'drive' | 'kpiUrl') => {
    const v = vals[k].trim();
    if (!v) return setErrs({ ...errs, [k]: 'Вставте посилання.' });
    if (!isUrl(v)) return setErrs({ ...errs, [k]: 'Посилання має починатися з https://' });
    p[k] = v; commit(); setErrs({ ...errs, [k]: '' }); setVals({ ...vals, [k]: '' }); ui.toast(`${p.name}: посилання збережено`);
  };
  return (
    <section><h2>Робочі посилання</h2>
      <p className="muted small">Клієнт-менеджер вставляє посилання тут. Після цього кнопки «Диск» і «KPI» у розділі «Проекти» ведуть прямо за ними.</p>
      {rows.map(([k, ic, t, l, ph]) => (
        <div key={k} className="wlink mt16"><p className="lbl">{t}</p>
          {p[k] ? (
            <div className="wlink-row"><a href={p[k]} target="_blank" rel="noopener noreferrer"><Icon name={ic} size={16} />{l}</a>
              <button type="button" className="btn quiet sm" onClick={() => act.link(p, k)}>Змінити</button></div>
          ) : (
            <>
              <div className="drive-form">
                <label className="visually-hidden" htmlFor={`lk_${k}`}>{t}: посилання</label>
                <input className="inp" id={`lk_${k}`} type="url" placeholder={ph} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') save(k); }} />
                <button type="button" className="btn sm" onClick={() => save(k)}>Зберегти</button>
              </div>
              <p className="hint" role="alert">{errs[k]}</p>
            </>
          )}
        </div>
      ))}
    </section>
  );
}

function ProjectView() {
  const S = useDB(); const act = useActions(); const ui = useUI();
  const id = useSearchParams().get('id');
  const [docTab, setDocTab] = useState('all');
  const [note, setNote] = useState('');
  const p = PJ(id);
  if (!p) return <div className="page"><PageHead title="Проект не знайдено" text="Можливо, його видалили." actions={<Link className="btn" href="/projects">До проектів</Link>} /></div>;

  const c = CL(p.clientId), all = svcOf(p.id), cur = currentSvcs(p.id), hist = all.filter((s) => !cur.includes(s));
  const tl = trafficLead(), hasTraffic = cur.some(isTraffic);
  const specs = [...new Map(cur.map((s) => [s.specialistId + s.typeId, s])).values()];
  const tot = cur.reduce((a, s) => a + priceUAH(s), 0), paid = cur.reduce((a, s) => a + Math.min(priceUAH(s), paidUAH(s)), 0);
  const debtP = cur.reduce((a, s) => a + debtUAH(s), 0);
  const docs = p.docs.filter((d) => docTab === 'all' || d.type === docTab).sort((a, b) => (a.date < b.date ? 1 : -1));
  const fop = FOP(p.fop), L = p.land || {}, R = p.req;
  const lands = ([['Сайт', L.site], ['Instagram', L.instagram], ['TikTok', L.tiktok], ['Facebook', L.facebook]] as const).filter(([, u]) => u);
  const addNote = () => { if (!note.trim()) return; p.notes.push({ id: uid('n'), text: note.trim(), author: S.me, date: TODAY }); commit(); setNote(''); };

  const bento = (
    <div className="bento">
      <div className="tile"><span className="k">Сума за період</span><span className="v">{money(tot)}</span><span className="d">{cur.length} {plural(cur.length, 'послуга', 'послуги', 'послуг')} зараз</span></div>
      <div className="tile"><span className="k">Оплачено</span><span className="v">{money(paid)}</span><span className="d">{tot ? Math.round((paid / tot) * 100) : 0}% від суми</span></div>
      <div className="tile"><span className="k">Борг</span><span className={`v ${debtP ? 'red' : ''}`}>{money(debtP)}</span><span className="d">{debtP ? 'чекаємо оплату' : 'усе оплачено'}</span></div>
      <div className="tile"><span className="k">LTV замовника</span><span className="v yellow">{money(clientLTV(c?.id))}</span><span className="d">усього принесено</span></div>
    </div>
  );

  return (
    <div className="page">
      <PageHead title={p.name} badges={<><StatusBadge s={p.status} />{isNew(p) && <NewBadge />}</>}
        text={`№ ${p.no}. ${c?.name || ''}. Працюємо з ${fLY(p.createdAt)}.`}
        lead={<div className="flex" style={{ gap: 18 }}><Thumb p={p} cls="lg" /><BackLink href="/projects">Усі проекти</BackLink></div>}
        extra={bento}
        actions={<>
          <label className="visually-hidden" htmlFor="pStatusSel">Статус проекту</label>
          <select id="pStatusSel" className="sel inline" value={p.status} onChange={(e) => { p.status = e.target.value as Project['status']; commit(); }}>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
          </select>
          <button type="button" className="btn" onClick={() => act.invoice(p)}>Рахунок</button>
          <Link className="btn" href={`/project/edit?id=${p.id}`}>Редагувати</Link>
          <button type="button" className="btn primary" onClick={() => act.addSvc(p.id)}><Icon name="plus" size={16} />Додати послугу</button>
        </>} />
      <div className="layout-detail">
        <div>
          <section className="sec" aria-labelledby="sCur"><div className="sec-h"><h2 id="sCur">Поточні послуги</h2><span className="r num">Оплачено {money(paid)} з {money(tot)}</span></div>
            <SvcTable list={cur} empty="Активних послуг немає. Додайте послугу на поточний місяць." /></section>
          <section className="sec" aria-labelledby="sHist"><div className="sec-h"><h2 id="sHist">Історія</h2><span className="r">{hist.length} {plural(hist.length, 'запис', 'записи', 'записів')}</span></div>
            <SvcTable list={hist} empty="Історії ще немає: це перший місяць проекту." /></section>
          <section className="sec" aria-labelledby="sDocs">
            <div className="sec-h"><h2 id="sDocs">Документи</h2><span className="r"><button type="button" className="btn sm" onClick={() => act.upload(p)}><Icon name="upload" size={16} />Завантажити PDF</button></span></div>
            <div className="bar-row"><Seg label="Тип документа" value={docTab} onChange={setDocTab}
              items={['all', ...DOC_TYPES].map((t) => [t, t === 'all' ? 'Усі' : t, t === 'all' ? p.docs.length : p.docs.filter((d) => d.type === t).length])} /></div>
            {docs.length ? (
              <div className="list">{docs.map((d) => (
                <div key={d.id} className="li"><span className="doc-ico" aria-hidden="true"><Icon name="file" size={20} /></span>
                  <div className="grow"><button type="button" className="doc-link" onClick={() => act.openDoc(d)}>{d.name}</button><small>{d.type}, {fD(d.date)}{d.demo ? ', демо без файлу' : ''}</small></div>
                  <button type="button" className="btn icon sm danger" aria-label={`Видалити ${d.name}`} onClick={() => ui.confirm('Видалити документ? Скасувати це не можна.', () => { p.docs = p.docs.filter((x) => x.id !== d.id); commit(); })}><Icon name="trash" size={16} /></button>
                </div>
              ))}</div>
            ) : <p className="empty">Документів цього типу немає.</p>}
          </section>
          <section className="sec" aria-labelledby="sNotes"><div className="sec-h"><h2 id="sNotes">Нотатки</h2></div>
            <div className="note-form">
              <label className="visually-hidden" htmlFor="noteText">Нова нотатка</label>
              <textarea className="ta" id="noteText" placeholder="Нотатка для команди" value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }} />
              <button type="button" className="btn" onClick={addNote}>Додати</button>
            </div>
            {p.notes.length ? (
              <div className="list">{p.notes.slice().sort((a, b) => (a.date < b.date ? 1 : -1)).map((n) => (
                <div key={n.id} className="note-item"><div className="note-head"><PersonC id={n.author} /><time dateTime={n.date}>{fD(n.date)}</time>
                  <button type="button" className="btn quiet sm" onClick={() => { p.notes = p.notes.filter((x) => x.id !== n.id); commit(); }}>Видалити</button></div><p>{n.text}</p></div>
              ))}</div>
            ) : <p className="muted small">Нотаток ще немає.</p>}
          </section>
        </div>
        <aside className="panel" aria-label="Дані проекту">
          <section><h2>Замовник <Link className="r" href={`/client?id=${c?.id}`}>Профіль ›</Link></h2>
            <p className="client-name">{c?.name}</p><p className="ltv">Приніс агенції {money(clientLTV(c?.id))}</p>
            <div className="links mt16">
              <a href={`tel:${(c?.phone || '').replace(/\s/g, '')}`}><Icon name="phone" size={16} /><span className="num">{c?.phone}</span></a>
              <a href={tg(c?.telegram)} target="_blank" rel="noopener noreferrer"><Icon name="send" size={16} />Особистий Telegram {c?.telegram}</a>
              {p.chat ? <a href={p.chat} target="_blank" rel="noopener noreferrer"><Icon name="users" size={16} />Робочий чат проекту</a> : <span className="muted">Робочий чат не вказано</span>}
            </div>
          </section>
          <WorkLinks p={p} />
          <section><h2>Посадкові сторінки</h2>{lands.length
            ? <div className="links">{lands.map(([l, u]) => <a key={l} href={url(u)} target="_blank" rel="noopener noreferrer"><Icon name="link" size={16} />{l}</a>)}</div>
            : <p className="muted small">Не вказано</p>}</section>
          <section><h2>Команда проекту</h2><dl className="kv">
            {specs.map((s) => <div key={s.id} style={{ display: 'contents' }}><dt>{svcShort(s)}</dt><dd><Person id={s.specialistId} /></dd></div>)}
            <dt>Тімлід трафіку</dt><dd>{hasTraffic ? <Person id={tl?.id} /> : <span className="muted">не потрібен для SMM та упаковки</span>}</dd>
            <dt>Клієнт-менеджер</dt><dd><Person id={p.cm} /></dd>
            <dt>Опер. директор</dt><dd><Person id={p.coo} /></dd>
          </dl></section>
          <section><h2>Реквізити замовника <span className="r"><Badge>{R.type}</Badge></span></h2><dl className="kv">
            <dt>Назва</dt><dd>{R.name}</dd>
            <dt>{R.type === 'Інвойс' ? 'Податковий номер' : 'Код'}</dt><dd className="num">{R.code}</dd>
            <dt>{R.type === 'Інвойс' ? 'Рахунок' : 'IBAN'}</dt><dd className="num">{R.iban}</dd>
            <dt>Адреса</dt><dd>{R.addr}</dd>
            {R.email && <><dt>Ел. пошта</dt><dd>{R.email}</dd></>}
          </dl></section>
          <section><h2>Оплати надходять на <Link className="r" href="/admin">Усі ФОП ›</Link></h2>
            <label className="visually-hidden" htmlFor="fopSel">ФОП для оплат</label>
            <select id="fopSel" className="sel inline" style={{ width: '100%' }} value={p.fop} onChange={(e) => { p.fop = e.target.value; commit(); }}>
              {S.fops.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            {fop && <p className="muted xs mt8 num">{fop.iban}<br />{fop.bank}</p>}
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function Page() { return <Suspense><ProjectView /></Suspense>; }
