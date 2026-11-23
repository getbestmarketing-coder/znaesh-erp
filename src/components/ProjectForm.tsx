'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent, type ReactNode } from 'react';
import { useDB, commit } from '@/lib/store';
import { PJ, ST } from '@/lib/domain';
import { STATUS, REQ_TYPES, CURRENCIES } from '@/lib/dicts';
import type { Cur, Project, ReqType } from '@/lib/types';
import { CUR_START, CUR_END, TODAY, fL, uid } from '@/lib/utils';
import { PageHead, BackLink, Thumb } from './ui';
import { Icon } from './Icon';
import { SpecOptions } from './dialogs';
import { useUI } from './overlay';

interface Row { key: string; typeId: string; spec: string; price: string; cur: Cur; rate: string }

const Fld = ({ id, label, children, span, err }: { id: string; label: string; children: ReactNode; span?: number; err?: string }) => (
  <div className="fld" style={span ? { gridColumn: `span ${span}` } : undefined}><label htmlFor={id}>{label}</label>{children}{err ? <span className="hint" role="alert">{err}</span> : null}</div>
);

export function ProjectForm({ id }: { id?: string | null }) {
  const S = useDB(); const router = useRouter(); const ui = useUI();
  const isNew = !id; const p0 = id ? PJ(id) : undefined;
  const newRow = (): Row => { const t = S.serviceTypes[0]; return { key: uid('r'), typeId: t.id, spec: S.team.find((m) => t.roles.includes(m.role))?.id || '', price: String(t.price), cur: t.currency, rate: String(S.rates[t.currency]) }; };
  const [f, setF] = useState(() => ({
    name: p0?.name || '', status: p0?.status || 'active',
    cm: p0?.cm || S.team.find((t) => t.role === 'cm')?.id || '', coo: p0?.coo || S.team.find((t) => t.role === 'coo')?.id || '',
    clientId: p0?.clientId || '__new', cName: '', cPhone: '', cTg: '',
    chat: p0?.chat || '', drive: p0?.drive || '', kpiUrl: p0?.kpiUrl || '',
    site: p0?.land.site || '', instagram: p0?.land.instagram || '', tiktok: p0?.land.tiktok || '', facebook: p0?.land.facebook || '',
    rType: (p0?.req.type || 'ФОП') as ReqType, rName: p0?.req.name || '', rCode: p0?.req.code || '', rIban: p0?.req.iban || '', rAddr: p0?.req.addr || '',
    fop: p0?.fop || S.fops[0]?.id || '', logo: p0?.logo || '',
  }));
  const [rows, setRows] = useState<Row[]>(() => (isNew ? [newRow()] : []));
  const [err, setErr] = useState({ name: '', cName: '' });
  type F = typeof f;
  const set = (k: keyof F) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }));
  const setRow = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  if (!isNew && !p0) return <div className="page"><PageHead title="Проект не знайдено" actions={<Link className="btn" href="/projects">До проектів</Link>} /></div>;
  const back = isNew ? '/projects' : `/project?id=${p0!.id}`;

  /** Логотип зменшуємо до 160 px, щоб база лишалась легкою */
  const onLogo = (file?: File) => {
    if (!file) return;
    const img = new Image(); const u = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 160 / Math.max(img.width, img.height)); const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u);
      setF((x) => ({ ...x, logo: c.toDataURL('image/webp', 0.85) }));
    };
    img.src = u;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const name = f.name.trim();
    if (!name) { setErr({ name: 'Вкажіть назву проекту', cName: '' }); document.getElementById('pName')?.focus(); return; }
    let clientId = f.clientId;
    if (clientId === '__new') {
      if (!f.cName.trim()) { setErr({ name: '', cName: 'Вкажіть ПІБ замовника' }); document.getElementById('cName')?.focus(); return; }
      const c = { id: uid('c'), name: f.cName.trim(), phone: f.cPhone.trim(), telegram: f.cTg.trim(), createdAt: TODAY };
      S.clients.push(c); clientId = c.id;
    }
    const data = {
      name, clientId, status: f.status as Project['status'], cm: f.cm, coo: f.coo, chat: f.chat.trim(), drive: f.drive.trim(), kpiUrl: f.kpiUrl.trim(),
      land: { site: f.site, instagram: f.instagram, tiktok: f.tiktok, facebook: f.facebook },
      req: { ...(p0?.req || {}), type: f.rType, name: f.rName, code: f.rCode, iban: f.rIban, addr: f.rAddr }, fop: f.fop, logo: f.logo,
    };
    let pid: string;
    if (p0) { Object.assign(p0, data); pid = p0.id; }
    else {
      const np: Project = { id: uid('p'), no: Math.max(0, ...S.projects.map((x) => x.no || 0)) + 1, docs: [], notes: [], createdAt: TODAY, ...data };
      S.projects.push(np); pid = np.id;
      rows.forEach((r) => S.services.push({
        id: uid('s'), projectId: pid, typeId: r.typeId, specialistId: r.spec, start: CUR_START, end: CUR_END,
        price: +r.price || 0, currency: r.cur, rate: r.cur === 'UAH' ? 1 : +r.rate || 0, free: false, payments: [],
      }));
    }
    commit(); router.push(`/project?id=${pid}`);
  };

  return (
    <div className="page narrow">
      <PageHead title={isNew ? 'Новий проект' : p0!.name} lead={<BackLink href={back}>{isNew ? 'Проекти' : 'Назад до проекту'}</BackLink>}
        text={isNew ? `Заповніть один раз, і проект з’явиться в списку, а замовник у розділі «Замовники». Послуги стартують з ${fL(CUR_START)}.` : 'Редагування проекту. Зміни збережуться після натискання «Зберегти».'} />
      <form className="form" noValidate style={{ gap: 20 }} onSubmit={submit}>
        <fieldset><legend>Проект</legend>
          <div className="logo-pick">
            <span><Thumb p={{ name: f.name || 'Новий', logo: f.logo }} cls="lg" /></span>
            <div style={{ flex: 1 }}><Fld id="pName" label="Назва проекту" err={err.name}><input className="inp" id="pName" value={f.name} onChange={set('name')} required autoComplete="off" /></Fld></div>
            <label className="btn" style={{ cursor: 'pointer' }}><Icon name="upload" size={16} />Логотип<input type="file" accept="image/*" className="visually-hidden" onChange={(e) => onLogo(e.target.files?.[0])} /></label>
          </div>
          <div className="row3">
            <Fld id="pStatus" label="Статус"><select className="sel" id="pStatus" value={f.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}</select></Fld>
            <Fld id="pCm" label="Клієнт-менеджер"><select className="sel" id="pCm" value={f.cm} onChange={set('cm')}><option value="">Не призначено</option>{S.team.filter((t) => t.role === 'cm').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Fld>
            <Fld id="pCoo" label="Операційний директор"><select className="sel" id="pCoo" value={f.coo} onChange={set('coo')}><option value="">Не призначено</option>{S.team.filter((t) => t.role === 'coo').map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Fld>
          </div>
        </fieldset>
        <fieldset><legend>Замовник</legend>
          <Fld id="pClient" label="Замовник"><select className="sel" id="pClient" value={f.clientId} onChange={set('clientId')}><option value="__new">Новий замовник</option>{S.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Fld>
          {f.clientId === '__new' && (
            <div className="row3">
              <Fld id="cName" label="ПІБ" err={err.cName}><input className="inp" id="cName" autoComplete="off" value={f.cName} onChange={set('cName')} /></Fld>
              <Fld id="cPhone" label="Телефон"><input className="inp" id="cPhone" type="tel" inputMode="tel" autoComplete="off" placeholder="+380" value={f.cPhone} onChange={set('cPhone')} /></Fld>
              <Fld id="cTg" label="Особистий Telegram"><input className="inp" id="cTg" autoComplete="off" placeholder="@username" value={f.cTg} onChange={set('cTg')} /></Fld>
            </div>
          )}
          <Fld id="pChat" label="Посилання на робочий чат"><input className="inp" id="pChat" type="url" placeholder="https://t.me/+" value={f.chat} onChange={set('chat')} /></Fld>
          <Fld id="pDrive" label="Папка проекту на Google Диску"><input className="inp" id="pDrive" type="url" placeholder="https://drive.google.com/drive/folders/" value={f.drive} onChange={set('drive')} /></Fld>
          <Fld id="pKpi" label="Посилання на KPI"><input className="inp" id="pKpi" type="url" placeholder="https://docs.google.com/spreadsheets/" value={f.kpiUrl} onChange={set('kpiUrl')} /></Fld>
        </fieldset>
        <fieldset><legend>Посадкові сторінки</legend>
          <div className="row4">
            <Fld id="lSite" label="Сайт"><input className="inp" id="lSite" value={f.site} onChange={set('site')} /></Fld>
            <Fld id="lIg" label="Instagram"><input className="inp" id="lIg" value={f.instagram} onChange={set('instagram')} /></Fld>
            <Fld id="lTt" label="TikTok"><input className="inp" id="lTt" value={f.tiktok} onChange={set('tiktok')} /></Fld>
            <Fld id="lFb" label="Facebook"><input className="inp" id="lFb" value={f.facebook} onChange={set('facebook')} /></Fld>
          </div>
        </fieldset>
        <fieldset><legend>Реквізити й оплата</legend>
          <div className="row3">
            <Fld id="rType" label="Тип"><select className="sel" id="rType" value={f.rType} onChange={set('rType')}>{REQ_TYPES.map((x) => <option key={x}>{x}</option>)}</select></Fld>
            <Fld id="rName" label="Назва або ПІБ" span={2}><input className="inp" id="rName" value={f.rName} onChange={set('rName')} /></Fld>
          </div>
          <div className="row3">
            <Fld id="rCode" label="ЄДРПОУ, ІПН або податковий номер"><input className="inp" id="rCode" value={f.rCode} onChange={set('rCode')} /></Fld>
            <Fld id="rIban" label="IBAN або рахунок"><input className="inp" id="rIban" value={f.rIban} onChange={set('rIban')} /></Fld>
            <Fld id="rAddr" label="Адреса"><input className="inp" id="rAddr" value={f.rAddr} onChange={set('rAddr')} /></Fld>
          </div>
          <Fld id="pFop" label="Оплати надходять на ФОП"><select className="sel" id="pFop" value={f.fop} onChange={set('fop')}><option value="">Ще не обрано</option>{S.fops.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Fld>
        </fieldset>
        {isNew && (
          <fieldset><legend>Послуги на цей місяць</legend>
            <div className="form">{rows.map((r) => (
              <div key={r.key} className="svc-row">
                <Fld id={`${r.key}t`} label="Послуга"><select className="sel" id={`${r.key}t`} value={r.typeId} onChange={(e) => { const t = ST(e.target.value)!; setRow(r.key, { typeId: t.id, spec: S.team.find((m) => t.roles.includes(m.role))?.id || '', price: String(t.price), cur: t.currency, rate: String(S.rates[t.currency]) }); }}>
                  {S.serviceTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Fld>
                <Fld id={`${r.key}s`} label="Спеціаліст"><select className="sel" id={`${r.key}s`} value={r.spec} onChange={(e) => setRow(r.key, { spec: e.target.value })}><SpecOptions typeId={r.typeId} /></select></Fld>
                <Fld id={`${r.key}p`} label="Ціна"><input className="inp num" id={`${r.key}p`} type="number" inputMode="decimal" value={r.price} onChange={(e) => setRow(r.key, { price: e.target.value })} /></Fld>
                <Fld id={`${r.key}c`} label="Валюта"><select className="sel" id={`${r.key}c`} value={r.cur} onChange={(e) => { const c = e.target.value as Cur; setRow(r.key, { cur: c, rate: String(c === 'UAH' ? 1 : S.rates[c]) }); }}>{CURRENCIES.map((c) => <option key={c}>{c}</option>)}</select></Fld>
                <Fld id={`${r.key}r`} label="Курс"><input className="inp num" id={`${r.key}r`} type="number" inputMode="decimal" step="0.01" value={r.rate} onChange={(e) => setRow(r.key, { rate: e.target.value })} /></Fld>
                <button type="button" className="btn icon" onClick={() => setRows(rows.filter((x) => x.key !== r.key))} aria-label="Прибрати послугу"><Icon name="x" size={16} /></button>
              </div>
            ))}</div>
            <div><button type="button" className="btn sm" onClick={() => setRows([...rows, newRow()])}><Icon name="plus" size={16} />Ще одна послуга</button></div>
          </fieldset>
        )}
        <div className="form-actions">
          {!isNew && <button type="button" className="btn danger l" onClick={() => ui.confirm(`Видалити проект «${p0!.name}» разом з усіма послугами й оплатами? Скасувати це не можна.`, () => {
            S.services = S.services.filter((s) => s.projectId !== p0!.id); S.projects = S.projects.filter((x) => x.id !== p0!.id); commit(); router.push('/projects');
          })}><Icon name="trash" size={16} />Видалити проект</button>}
          <Link className="btn" href={back}>Скасувати</Link>
          <button type="submit" className="btn primary">{isNew ? 'Створити проект' : 'Зберегти'}</button>
        </div>
      </form>
    </div>
  );
}
