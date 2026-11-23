'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, useUI } from './overlay';
import { Icon } from './Icon';
import { Logo } from './Logo';
import { period } from './ui';
import { db, commit, useDB, isMemOnly } from '@/lib/store';
import { CLOUD, AUTH, sb, BUCKET } from '@/lib/supabase';
import { ROLES, CURRENCIES, DOC_TYPES, SPECIALIST_ROLES } from '@/lib/dicts';
import type { Client, Cur, Doc, Fop, InvoiceData, Member, Project, Role, Service, SvcType } from '@/lib/types';
import {
  ST, PJ, FOP, T, SV, priceUAH, debtUAH, clientLTV, svcName, svcShort, currentSvcs, nextSvc, newSvcDefaults, svcOf, isCurrent, daysLeft, hasNext,
} from '@/lib/domain';
import { TODAY, fD, money, monthEnd, num, uid, isUrl } from '@/lib/utils';

/* ---------- спільне ---------- */
export function SpecOptions({ typeId }: { typeId: string }) {
  const S = db(); const t = ST(typeId);
  const pref = S.team.filter((m) => t?.roles.includes(m.role));
  const other = S.team.filter((m) => !t?.roles.includes(m.role) && SPECIALIST_ROLES.includes(m.role));
  return (
    <>
      <option value="">Не призначено</option>
      <optgroup label={t?.roles.map((r) => ROLES[r]).join(', ') || ''}>
        {pref.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </optgroup>
      <optgroup label="Інші спеціалісти">
        {other.map((m) => <option key={m.id} value={m.id}>{m.name}, {ROLES[m.role].toLowerCase()}</option>)}
      </optgroup>
    </>
  );
}
const Fld = ({ id, label, children, hint, span }: { id: string; label: string; children: ReactNode; hint?: ReactNode; span?: number }) => (
  <div className="fld" style={span ? { gridColumn: `span ${span}` } : undefined}><label htmlFor={id}>{label}</label>{children}{hint && <span className="hint">{hint}</span>}</div>
);

/* ---------- послуга ---------- */
export function ServiceModal({ s, isNew, withProject, free: freeDefault }: { s: Service; isNew?: boolean; withProject?: boolean; free?: boolean }) {
  const S = useDB(); const ui = useUI(); const act = useActions();
  const [f, setF] = useState({ ...s, free: s.free || !!freeDefault });
  const set = (p: Partial<Service>) => setF((x) => ({ ...x, ...p }));
  const live = !isNew ? SV(s.id) : undefined;
  const uah = f.free ? '0 ₴, безкоштовно' : money((+f.price || 0) * (f.currency === 'UAH' ? 1 : +f.rate || 0));
  const onType = (typeId: string) => {
    const t = ST(typeId)!;
    const spec = S.team.find((m) => t.roles.includes(m.role))?.id || '';
    set(f.free ? { typeId, specialistId: spec } : { typeId, specialistId: spec, price: t.price, currency: t.currency, rate: t.currency === 'UAH' ? 1 : S.rates[t.currency] });
  };
  const save = () => {
    if (!f.start || !f.end || f.end < f.start) return 'Кінець періоду має бути пізніше за початок.';
    const n: Service = { ...f, price: f.free ? 0 : +f.price || 0, rate: f.currency === 'UAH' ? 1 : +f.rate || 0 };
    if (isNew) S.services.push(n); else Object.assign(SV(s.id)!, { ...n, payments: SV(s.id)!.payments });
    commit();
  };
  return (
    <Modal title={isNew ? (freeDefault ? 'Новий безкоштовний період' : 'Нова послуга') : 'Послуга'} lg primary={isNew ? 'Створити' : 'Зберегти'} onSave={save}
      left={!isNew && <button type="button" className="btn danger" onClick={() => ui.confirm('Видалити цю послугу разом з оплатами? Скасувати це не можна.', () => { S.services = S.services.filter((x) => x.id !== s.id); commit(); })}><Icon name="trash" size={16} />Видалити</button>}>
      <div className="form">
        {withProject && (
          <Fld id="sProject" label="Проект">
            <select className="sel" id="sProject" value={f.projectId} onChange={(e) => set({ projectId: e.target.value })}>
              {S.projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Fld>
        )}
        <div className="row2">
          <Fld id="sType" label="Послуга">
            <select className="sel" id="sType" value={f.typeId} onChange={(e) => onType(e.target.value)}>
              {S.serviceTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Fld>
          <Fld id="sSpec" label="Спеціаліст">
            <select className="sel" id="sSpec" value={f.specialistId} onChange={(e) => set({ specialistId: e.target.value })}><SpecOptions typeId={f.typeId} /></select>
          </Fld>
        </div>
        <div className="row2">
          <Fld id="sStart" label="Початок">
            <input className="inp" type="date" id="sStart" value={f.start} onChange={(e) => set(e.target.value && !f.free ? { start: e.target.value, end: monthEnd(e.target.value) } : { start: e.target.value })} />
          </Fld>
          <Fld id="sEnd" label="Кінець" hint="Рівно місяць від початку, можна змінити">
            <input className="inp" type="date" id="sEnd" value={f.end} onChange={(e) => set({ end: e.target.value })} />
          </Fld>
        </div>
        <label className="cb"><input type="checkbox" checked={f.free} onChange={(e) => set({ free: e.target.checked })} />Безкоштовний період</label>
        <div className="row4">
          <Fld id="sPrice" label="Ціна"><input className="inp num" type="number" inputMode="decimal" step="0.01" id="sPrice" disabled={f.free} value={f.price} onChange={(e) => set({ price: e.target.value as unknown as number })} /></Fld>
          <Fld id="sCur" label="Валюта">
            <select className="sel" id="sCur" disabled={f.free} value={f.currency} onChange={(e) => { const c = e.target.value as Cur; set({ currency: c, rate: c === 'UAH' ? 1 : S.rates[c] }); }}>
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Fld>
          <Fld id="sRate" label="Курс до гривні"><input className="inp num" type="number" inputMode="decimal" step="0.01" id="sRate" disabled={f.free} readOnly={f.currency === 'UAH'} value={f.currency === 'UAH' ? 1 : f.rate} onChange={(e) => set({ rate: e.target.value as unknown as number })} /></Fld>
          <Fld id="sUAH" label="У гривні"><input className="inp num" id="sUAH" readOnly value={uah} /></Fld>
        </div>
      </div>
      {live && !live.free && (
        <div className="mt16 pay-block">
          <h3>Оплати</h3>
          <div className="mt8">
            {live.payments.length ? (
              <table className="idx"><thead><tr><th>Дата</th><th>Отримувач</th><th className="num">Сума</th><th className="num"><span className="visually-hidden">Дії</span></th></tr></thead>
                <tbody>{live.payments.map((x) => (
                  <tr key={x.id}><td className="num">{fD(x.date)}</td><td className="xs">{FOP(x.fopId)?.name || ''}</td><td className="num">{money(x.amount)}</td>
                    <td className="num"><button type="button" className="btn quiet sm" onClick={() => { live.payments = live.payments.filter((y) => y.id !== x.id); commit(); }}>Видалити</button></td></tr>
                ))}</tbody></table>
            ) : <p className="muted small">Оплат ще немає.</p>}
            <div className="flex mt8 small">
              <span>Залишок: <b className={debtUAH(live) ? 'debt' : ''}>{money(debtUAH(live))}</b></span>
              {debtUAH(live) > 0 && <button type="button" className="btn sm" style={{ marginLeft: 'auto' }} onClick={() => act.pay(live)}>Внести оплату</button>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

/* ---------- оплата ---------- */
export function PayModal({ s }: { s: Service }) {
  const S = useDB(); const ui = useUI(); const p = PJ(s.projectId)!;
  const [amt, setAmt] = useState(String(debtUAH(s)));
  const [date, setDate] = useState(TODAY);
  const [fop, setFop] = useState(p.fop);
  return (
    <Modal title="Внести оплату" primary="Зарахувати" onSave={() => {
      const a = +amt; if (!(a > 0)) return 'Вкажіть суму більше нуля.';
      SV(s.id)!.payments.push({ id: uid('pay'), date: date || TODAY, amount: Math.round(a), fopId: fop });
      commit(); ui.toast(`LTV замовника тепер ${money(clientLTV(p.clientId))}`);
    }}>
      <div className="form">
        <div className="summary"><b>{p.name}</b>, {svcName(s)}<br /><span className="muted">{period(s, true)}. До сплати {money(priceUAH(s))}, залишок {money(debtUAH(s))}.</span></div>
        <div className="row3">
          <Fld id="payAmt" label="Сума, ₴"><input className="inp num" id="payAmt" type="number" inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value)} /></Fld>
          <Fld id="payDate" label="Дата"><input className="inp" id="payDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Fld>
          <Fld id="payFop" label="Отримувач">
            <select className="sel" id="payFop" value={fop} onChange={(e) => setFop(e.target.value)}>{S.fops.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          </Fld>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- рахунок ---------- */
export function Invoice({ d }: { d: InvoiceData }) {
  const total = d.lines.reduce((a, l) => a + l.amount, 0); const R = d.buyer;
  return (
    <div className="invoice">
      <div className="ihead"><div><p className="ititle">Рахунок на оплату № {d.no}</p><p>від {fD(d.date)}</p></div><div className="ilogo" role="img" aria-label="ЗНАЄШ agency"><Logo /></div></div>
      <div className="parties">
        <div><b>Постачальник</b><br />{d.fop.name}<br />ІПН {d.fop.code}<br />IBAN {d.fop.iban}<br />{d.fop.bank}<br />{d.fop.group}, без ПДВ</div>
        <div><b>Покупець</b><br />{R.name}<br />{R.code}<br />{R.iban && <>Р/р {R.iban}<br /></>}{R.addr}</div>
      </div>
      <table><thead><tr><th>№</th><th>Послуга</th><th>Од.</th><th className="num">К-сть</th><th className="num">Ціна, ₴</th><th className="num">Сума, ₴</th></tr></thead>
        <tbody>{d.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.name} {l.period}</td><td>послуга</td><td className="num">1</td><td className="num">{num(l.amount)}</td><td className="num">{num(l.amount)}</td></tr>)}</tbody>
      </table>
      <p className="tot">Разом до сплати {money(total)}</p><p className="xs right">Без ПДВ</p>
      <div className="sign"><span>Виписав: {d.issuedBy}</span><span>Підпис ____________</span></div>
    </div>
  );
}
export function InvoiceModal({ p }: { p: Project }) {
  const S = useDB(); const ui = useUI();
  const unpaid = currentSvcs(p.id).filter((s) => !s.free && debtUAH(s) > 0);
  const [fopId, setFop] = useState(p.fop);
  const [sel, setSel] = useState<string[]>(unpaid.map((s) => s.id));
  if (!unpaid.length) return <Modal title="Згенерувати рахунок"><p>Усі поточні послуги цього проекту оплачені, рахунок не потрібен.</p></Modal>;
  if (!S.fops.length) return <Modal title="Згенерувати рахунок"><p>Спершу додайте ФОП у розділі «Адміністрування»: рахунок виставляється на нього.</p></Modal>;
  const no = `INV-${String(S.invoiceSeq + 1).padStart(4, '0')}`;
  const data: InvoiceData = {
    no, date: TODAY, fop: FOP(fopId) || S.fops[0], buyer: p.req, issuedBy: T(p.cm)?.name || '',
    lines: unpaid.filter((s) => sel.includes(s.id)).map((s) => ({ name: svcName(s), period: period(s, true), amount: debtUAH(s) })),
  };
  return (
    <Modal title="Згенерувати рахунок" lg primary="Зберегти в документи"
      left={<button type="button" className="btn" onClick={() => ui.print(<Invoice d={data} />)}><Icon name="print" size={16} />Друк або PDF</button>}
      onSave={() => {
        if (!sel.length) return 'Оберіть хоча б одну послугу.';
        S.invoiceSeq++;
        PJ(p.id)!.docs.push({ id: uid('d'), type: 'Рахунок', name: `Рахунок № ${no}, ${data.fop.name}`, date: TODAY, invoice: data });
        commit(); ui.toast(`Рахунок № ${no} збережено в документах`);
      }}>
      <div className="form">
        <div className="row2">
          <Fld id="invFop" label="ФОП з розділу «Адміністрування»">
            <select className="sel" id="invFop" value={fopId} onChange={(e) => setFop(e.target.value)}>{S.fops.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
          </Fld>
          <fieldset><legend className="lbl" style={{ fontSize: 13, marginBottom: 6 }}>Послуги в рахунку</legend>
            <div style={{ display: 'grid', gap: 6 }}>
              {unpaid.map((s) => (
                <label key={s.id} className="cb"><input type="checkbox" checked={sel.includes(s.id)} onChange={(e) => setSel(e.target.checked ? [...sel, s.id] : sel.filter((x) => x !== s.id))} />{svcShort(s)}, {money(debtUAH(s))}</label>
              ))}
            </div>
          </fieldset>
        </div>
        <Invoice d={data} />
      </div>
    </Modal>
  );
}

/* ---------- документи ---------- */
export function UploadModal({ p }: { p: Project }) {
  const ui = useUI();
  const [type, setType] = useState('Договір'); const [date, setDate] = useState(TODAY); const [file, setFile] = useState<File | null>(null);
  return (
    <Modal title="Завантажити документ" primary="Завантажити" onSave={() => {
      if (!file) return 'Оберіть PDF-файл.';
      if (CLOUD) {
        const path = `${p.id}/${uid('f')}.pdf`;
        sb().storage.from(BUCKET).upload(path, file, { contentType: 'application/pdf' }).then(({ error }) => {
          if (error) { ui.toast('Не вдалося завантажити файл: ' + error.message); return; }
          PJ(p.id)!.docs.push({ id: uid('d'), type, name: file.name, date: date || TODAY, path });
          commit(); ui.close(); ui.toast('Документ завантажено');
        });
        return false;
      }
      const r = new FileReader();
      r.onload = () => {
        PJ(p.id)!.docs.push({ id: uid('d'), type, name: file.name, date: date || TODAY, data: String(r.result) });
        commit(); ui.close();
        if (isMemOnly()) ui.toast('Файл завеликий для пам’яті браузера: він зникне після перезавантаження');
      };
      r.readAsDataURL(file); return false;
    }}>
      <div className="form">
        <div className="row2">
          <Fld id="dType" label="Тип документа"><select className="sel" id="dType" value={type} onChange={(e) => setType(e.target.value)}>{DOC_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Fld>
          <Fld id="dDate" label="Дата"><input className="inp" type="date" id="dDate" value={date} onChange={(e) => setDate(e.target.value)} /></Fld>
        </div>
        <Fld id="dFile" label="PDF-файл"><input className="inp" type="file" id="dFile" accept="application/pdf" style={{ paddingBlock: 8 }} onChange={(e) => setFile(e.target.files?.[0] || null)} /></Fld>
      </div>
    </Modal>
  );
}
export function DocModal({ d }: { d: Doc }) {
  const ui = useUI();
  if (d.invoice) {
    const inv = d.invoice;
    return <Modal title={d.name} lg left={<button type="button" className="btn" onClick={() => ui.print(<Invoice d={inv} />)}><Icon name="print" size={16} />Друк або PDF</button>}><Invoice d={inv} /></Modal>;
  }
  if (d.path) return <CloudDoc d={d} />;
  if (d.data) {
    const b = atob(d.data.split(',')[1]); const u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    const src = URL.createObjectURL(new Blob([u], { type: 'application/pdf' }));
    return <Modal title={d.name} lg><iframe src={src} style={{ width: '100%', height: '70dvh', border: 0, borderRadius: 10 }} title={d.name} /></Modal>;
  }
  return <Modal title={d.name}><p>Це демо-документ без файлу. Завантажте справжній PDF кнопкою «Завантажити PDF».</p></Modal>;
}

function CloudDoc({ d }: { d: Doc }) {
  const [src, setSrc] = useState(''); const [err, setErr] = useState('');
  useEffect(() => {
    sb().storage.from(BUCKET).createSignedUrl(d.path!, 600).then(({ data, error }) => { if (error) setErr(error.message); else setSrc(data.signedUrl); });
  }, [d.path]);
  return (
    <Modal title={d.name} lg left={src && <a className="btn" href={src} target="_blank" rel="noopener noreferrer"><Icon name="link" size={16} />Відкрити в новій вкладці</a>}>
      {err ? <p className="form-error">{err}</p> : src ? <iframe src={src} style={{ width: '100%', height: '70dvh', border: 0, borderRadius: 10 }} title={d.name} /> : <p className="muted">Завантажую…</p>}
    </Modal>
  );
}
/** Видаляє документ разом із файлом у сховищі */
export function deleteDoc(p: Project, d: Doc) {
  PJ(p.id)!.docs = PJ(p.id)!.docs.filter((x) => x.id !== d.id); commit();
  if (CLOUD && d.path) sb().storage.from(BUCKET).remove([d.path]);
}

/* ---------- команда, ФОП, замовник, каталог ---------- */
export function MemberModal({ t }: { t?: Member }) {
  const S = useDB(); const ui = useUI();
  const [f, setF] = useState<Omit<Member, 'id'>>(t ? { ...t, email: t.email || '' } : { name: '', role: 'target', phone: '', telegram: '', email: '' });
  const set = (p: Partial<Member>) => setF((x) => ({ ...x, ...p }));
  return (
    <Modal title={t ? 'Людина в команді' : 'Нова людина в команді'}
      left={t && <button type="button" className="btn danger" onClick={() => {
        const used = S.services.some((s) => s.specialistId === t.id) || S.projects.some((p) => p.cm === t.id || p.coo === t.id);
        if (used) { ui.toast('Людина закріплена за проектами. Спершу призначте на них когось іншого.'); return; }
        if (t.id === S.me) { ui.toast('Себе видалити не можна.'); return; }
        S.team = S.team.filter((x) => x.id !== t.id); commit(); ui.close();
      }}><Icon name="trash" size={16} />Видалити</button>}
      onSave={() => {
        if (!f.name.trim()) return 'Вкажіть ім’я.';
        const email = (f.email || '').trim().toLowerCase();
        if (email && !/^\S+@\S+\.\S+$/.test(email)) return 'Перевірте пошту.';
        if (email && S.team.some((x) => x.id !== t?.id && (x.email || '').toLowerCase() === email)) return 'Ця пошта вже є в команді.';
        if (t && t.id === S.me && AUTH && email !== (t.email || '').toLowerCase()) return 'Свою пошту змінити не можна: ви втратите доступ.';
        const d = { ...f, name: f.name.trim(), email };
        if (t) Object.assign(T(t.id)!, d); else S.team.push({ id: uid('t'), ...d });
        if (AUTH && email && (!t || email !== (t.email || ''))) ui.toast(`Надішліть ${d.name} посилання на ERP: увійти можна з пошти ${email}`);
        commit();
      }}>
      <div className="form">
        <div className="row2">
          <Fld id="mName" label="Ім’я та прізвище"><input className="inp" id="mName" value={f.name} autoComplete="off" onChange={(e) => set({ name: e.target.value })} /></Fld>
          <Fld id="mRole" label="Роль"><select className="sel" id="mRole" value={f.role} onChange={(e) => set({ role: e.target.value as Role })}>{Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Fld>
        </div>
        <div className="row2">
          <Fld id="mPhone" label="Телефон"><input className="inp" id="mPhone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Fld>
          <Fld id="mTg" label="Telegram"><input className="inp" id="mTg" value={f.telegram} onChange={(e) => set({ telegram: e.target.value })} /></Fld>
        </div>
        <Fld id="mEmail" label="Пошта для входу" hint={CLOUD ? 'Людина зможе увійти в ERP лише з цієї пошти. Без пошти доступу немає.' : 'У демо-режимі вхід не потрібен.'}>
          <input className="inp" id="mEmail" type="email" autoComplete="off" value={f.email || ''} onChange={(e) => set({ email: e.target.value })} /></Fld>
        <Fld id="mAcc" label="Права доступу"><select className="sel" id="mAcc" disabled><option>Повний доступ, поки всі бачать усе</option></select></Fld>
      </div>
    </Modal>
  );
}
export function FopModal({ fop }: { fop?: Fop }) {
  const S = useDB();
  const [f, setF] = useState<Omit<Fop, 'id'>>(fop ? { ...fop } : { name: 'ФОП ', code: '', iban: 'UA', bank: '', group: '3 група, 5%' });
  const set = (p: Partial<Fop>) => setF((x) => ({ ...x, ...p }));
  return (
    <Modal title={fop ? 'ФОП' : 'Новий ФОП'} onSave={() => {
      if (!f.name.trim() || f.name.trim() === 'ФОП') return 'Вкажіть назву ФОП.';
      if (fop) Object.assign(FOP(fop.id)!, f); else S.fops.push({ id: uid('f'), ...f });
      commit();
    }}>
      <div className="form">
        <Fld id="fName" label="Назва ФОП"><input className="inp" id="fName" value={f.name} onChange={(e) => set({ name: e.target.value })} /></Fld>
        <div className="row2">
          <Fld id="fCode" label="ІПН"><input className="inp num" id="fCode" inputMode="numeric" value={f.code} onChange={(e) => set({ code: e.target.value })} /></Fld>
          <Fld id="fGroup" label="Група і податок"><input className="inp" id="fGroup" value={f.group} onChange={(e) => set({ group: e.target.value })} /></Fld>
        </div>
        <div className="row2">
          <Fld id="fIban" label="IBAN"><input className="inp num" id="fIban" value={f.iban} onChange={(e) => set({ iban: e.target.value })} /></Fld>
          <Fld id="fBank" label="Банк"><input className="inp" id="fBank" value={f.bank} onChange={(e) => set({ bank: e.target.value })} /></Fld>
        </div>
      </div>
    </Modal>
  );
}
export function ClientModal({ c }: { c: Client }) {
  const [f, setF] = useState({ name: c.name, phone: c.phone, telegram: c.telegram });
  return (
    <Modal title="Замовник" onSave={() => {
      if (!f.name.trim()) return 'Вкажіть ПІБ.';
      Object.assign(db().clients.find((x) => x.id === c.id)!, f); commit();
    }}>
      <div className="form">
        <Fld id="cName" label="ПІБ"><input className="inp" id="cName" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Fld>
        <div className="row2">
          <Fld id="cPhone" label="Телефон"><input className="inp" id="cPhone" type="tel" inputMode="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Fld>
          <Fld id="cTg" label="Особистий Telegram"><input className="inp" id="cTg" value={f.telegram} onChange={(e) => setF({ ...f, telegram: e.target.value })} /></Fld>
        </div>
      </div>
    </Modal>
  );
}
export function TypeModal({ t }: { t: SvcType }) {
  const [price, setPrice] = useState(String(t.price)); const [cur, setCur] = useState<Cur>(t.currency);
  return (
    <Modal title={t.name} onSave={() => { const x = ST(t.id)!; x.price = +price || 0; x.currency = cur; commit(); }}>
      <div className="form">
        <div className="row2">
          <Fld id="tPrice" label="Базова ціна"><input className="inp num" id="tPrice" type="number" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} /></Fld>
          <Fld id="tCur" label="Валюта"><select className="sel" id="tCur" value={cur} onChange={(e) => setCur(e.target.value as Cur)}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Fld>
        </div>
        <p className="muted small">Нова ціна підставлятиметься в нові послуги. Чинні не зміняться.</p>
      </div>
    </Modal>
  );
}

const LINKS = {
  drive: ['Google Диск проекту', 'Посилання на папку проекту', 'https://drive.google.com/drive/folders/…'],
  kpiUrl: ['KPI проекту', 'Посилання на таблицю KPI', 'https://docs.google.com/spreadsheets/…'],
  chat: ['Робочий чат', 'Посилання на чат у Telegram', 'https://t.me/+…'],
} as const;
export type LinkKey = keyof typeof LINKS;
export function LinkModal({ p, k }: { p: Project; k: LinkKey }) {
  const ui = useUI(); const [v, setV] = useState(p[k] || ''); const L = LINKS[k];
  return (
    <Modal title={L[0]} onSave={() => {
      const x = v.trim(); if (!x) return 'Вставте посилання.'; if (!isUrl(x)) return 'Посилання має починатися з https://';
      PJ(p.id)![k] = x; commit(); ui.toast(`${p.name}: посилання збережено`);
    }}>
      <div className="fld"><label htmlFor="lnk">{L[1]}</label><input className="inp" id="lnk" type="url" placeholder={L[2]} value={v} onChange={(e) => setV(e.target.value)} /></div>
    </Modal>
  );
}

/* ---------- дії, які викликаються з різних сторінок ---------- */
export function useActions() {
  const ui = useUI();
  return {
    pay: (s: Service) => ui.open(<PayModal key={uid('m')} s={s} />),
    editSvc: (s: Service) => ui.open(<ServiceModal key={uid('m')} s={s} />),
    addSvc: (projectId?: string, free = false) => {
      const S = db(); const pid = projectId || S.projects[0]?.id;
      if (!pid) { ui.toast('Спершу створіть проект'); return; }
      ui.open(<ServiceModal key={uid('m')} s={newSvcDefaults(pid, 'meta', free)} isNew withProject={!projectId} free={free} />);
    },
    toPaid: (s: Service) => {
      const t = ST(s.typeId)!;
      ui.open(<ServiceModal key={uid('m')} s={{ ...s, free: false, price: t.price, currency: t.currency, rate: db().rates[t.currency] }} />);
    },
    renew: (s: Service) => {
      const n = nextSvc(s);
      if (!n) { ui.toast('Наступний місяць для цієї послуги вже створено'); return; }
      commit(); ui.toast(`${PJ(s.projectId)?.name}: ${svcShort(s)} створено з ${fD(n.start)} по ${fD(n.end)}`);
    },
    renewAll: (pid: string) => {
      const ends = svcOf(pid).filter((s) => isCurrent(s) && daysLeft(s) <= 7 && !hasNext(s));
      ends.forEach((s) => nextSvc(s)); commit();
      ui.toast(`${PJ(pid)?.name}: продовжено ${ends.length} ${ends.length === 1 ? 'послугу' : 'послуги'} на наступний місяць`);
    },
    invoice: (p: Project) => ui.open(<InvoiceModal key={uid('m')} p={p} />),
    upload: (p: Project) => ui.open(<UploadModal key={uid('m')} p={p} />),
    openDoc: (d: Doc) => ui.open(<DocModal key={uid('m')} d={d} />),
    link: (p: Project, k: LinkKey) => ui.open(<LinkModal key={uid('m')} p={p} k={k} />),
  };
}
