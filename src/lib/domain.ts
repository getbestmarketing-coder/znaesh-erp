import { db } from './store';
import type { Project, Service } from './types';
import { TODAY, CUR_START, addDays, addMonths, monthEnd, diff, uid } from './utils';

export const T = (id?: string) => db().team.find((t) => t.id === id);
export const ST = (id?: string) => db().serviceTypes.find((t) => t.id === id);
export const CL = (id?: string) => db().clients.find((c) => c.id === id);
export const PJ = (id?: string | null) => db().projects.find((p) => p.id === id);
export const FOP = (id?: string) => db().fops.find((f) => f.id === id);
export const SV = (id?: string) => db().services.find((s) => s.id === id);

export const priceUAH = (s: Service) => (s.free ? 0 : Math.round(s.price * (s.currency === 'UAH' ? 1 : +s.rate || 0)));
export const paidUAH = (s: Service) => s.payments.reduce((a, p) => a + (+p.amount || 0), 0);
export const debtUAH = (s: Service) => Math.max(0, priceUAH(s) - paidUAH(s));
export const svcName = (s: Service) => ST(s.typeId)?.name || '';
export const svcShort = (s: Service) => ST(s.typeId)?.short || '';

export const svcOf = (pid: string) =>
  db().services.filter((s) => s.projectId === pid).sort((a, b) => (a.start < b.start ? 1 : -1));
export const isCurrent = (s: Service) => s.start <= TODAY && s.end >= TODAY;
export const daysLeft = (s: Service) => diff(TODAY, s.end);

/** Послуги проекту на зараз; якщо їх немає, то майбутні або останній період */
export function currentSvcs(pid: string): Service[] {
  const all = svcOf(pid); const cur = all.filter(isCurrent);
  if (cur.length) return cur;
  const fut = all.filter((s) => s.start > TODAY); if (fut.length) return fut;
  if (!all.length) return [];
  const last = all[0].start;
  return all.filter((s) => s.start === last || s.end >= addDays(all[0].end, -3));
}

/** «Новий»: минулого місяця проект з нами не працював */
export function isNew(p: Project) {
  if (p.status !== 'active') return false;
  const cur = currentSvcs(p.id).filter((s) => s.end >= TODAY); if (!cur.length) return false;
  const minStart = cur.reduce((m, s) => (s.start < m ? s.start : m), cur[0].start);
  const from = addMonths(minStart, -1), to = addDays(minStart, -1);
  return !svcOf(p.id).some((s) => !cur.includes(s) && s.start <= to && s.end >= from);
}

export const isTraffic = (s: Service) => ST(s.typeId)?.team === 'traffic';
export const trafficLead = () => db().team.find((t) => t.role === 'tl_traffic');
export const clientLTV = (cid?: string) =>
  db().services.filter((s) => PJ(s.projectId)?.clientId === cid).reduce((a, s) => a + paidUAH(s), 0);
export const projectDebt = (pid: string) => currentSvcs(pid).reduce((a, s) => a + debtUAH(s), 0);

export function curPeriodTotals() {
  let total = 0, paid = 0, debt = 0;
  db().projects.forEach((p) => {
    if (p.status === 'stop') return;
    currentSvcs(p.id).filter((s) => s.end >= TODAY).forEach((s) => {
      total += priceUAH(s); paid += Math.min(paidUAH(s), priceUAH(s)); debt += debtUAH(s);
    });
  });
  return { total, paid, debt };
}

export function projStats(p: Project) {
  const cur = currentSvcs(p.id);
  const sum = cur.reduce((a, s) => a + priceUAH(s), 0);
  const paid = cur.reduce((a, s) => a + Math.min(priceUAH(s), paidUAH(s)), 0);
  const debt = cur.reduce((a, s) => a + debtUAH(s), 0);
  const live = cur.filter((s) => s.end >= TODAY && s.start <= TODAY);
  const minDays = live.length ? Math.min(...live.map(daysLeft)) : null;
  return { cur, sum, paid, debt, minDays, pct: sum ? Math.round((paid / sum) * 100) : 0 };
}

/** Чи вже створено наступний місяць для послуги */
export const hasNext = (s: Service) =>
  db().services.some((x) => x.projectId === s.projectId && x.typeId === s.typeId && x.start === addDays(s.end, 1));

/** Створює наступний місяць послуги. Повертає null, якщо він уже є. */
export function nextSvc(s: Service): Service | null {
  if (hasNext(s)) return null;
  const S = db(); const t = ST(s.typeId)!; const start = addDays(s.end, 1);
  const n: Service = {
    ...s, id: uid('s'), start, end: monthEnd(start), payments: [], free: false,
    price: s.free ? t.price : s.price, currency: s.free ? t.currency : s.currency, rate: 1,
  };
  n.rate = n.currency === 'UAH' ? 1 : S.rates[n.currency];
  S.services.push(n);
  return n;
}

export function newSvcDefaults(projectId: string, typeId = 'meta', free = false): Service {
  const S = db(); const t = ST(typeId)!; const start = free ? TODAY : CUR_START;
  return {
    id: uid('s'), projectId, typeId, specialistId: S.team.find((m) => t.roles.includes(m.role))?.id || '',
    start, end: free ? addDays(TODAY, 13) : monthEnd(start), price: free ? 0 : t.price,
    currency: t.currency, rate: S.rates[t.currency], free, payments: [],
  };
}

export const debtProjectsCount = () =>
  db().projects.filter((p) => p.status !== 'stop' && projectDebt(p.id) > 0).length;
