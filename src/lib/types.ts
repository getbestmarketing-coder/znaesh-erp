export type Cur = 'UAH' | 'USD' | 'EUR';
export type Role =
  | 'owner' | 'sysadmin' | 'coo' | 'cm' | 'tl_traffic'
  | 'target' | 'google' | 'designer' | 'video';
export type Status = 'active' | 'freeze' | 'stop';
export type ReqType = 'ТОВ' | 'ФОП' | 'Інвойс';

export interface Member { id: string; name: string; role: Role; phone: string; telegram: string }
export interface Fop { id: string; name: string; code: string; iban: string; bank: string; group: string }
export interface SvcType {
  id: string; name: string; short: string; team: 'traffic' | 'smm';
  roles: Role[]; price: number; currency: Cur;
}
export interface Client { id: string; name: string; phone: string; telegram: string; createdAt: string }
export interface Payment { id: string; date: string; amount: number; fopId: string }
export interface Service {
  id: string; projectId: string; typeId: string; specialistId: string;
  start: string; end: string; price: number; currency: Cur; rate: number;
  free: boolean; payments: Payment[];
}

export interface InvoiceLine { name: string; period: string; amount: number }
export interface InvoiceData {
  no: string; date: string;
  fop: Fop;
  buyer: Requisites;
  lines: InvoiceLine[];
  issuedBy: string;
}
export interface Doc {
  id: string; type: string; name: string; date: string;
  demo?: boolean;
  /** PDF, завантажений користувачем (data URL) */
  data?: string;
  /** Рахунок, згенерований у системі */
  invoice?: InvoiceData;
}
export interface Note { id: string; text: string; author: string; date: string }
export interface Requisites { type: ReqType; name: string; code: string; iban: string; addr: string; email?: string }
export interface Landing { site?: string; instagram?: string; tiktok?: string; facebook?: string }

export interface Project {
  id: string; no: number; name: string; clientId: string;
  cm: string; coo: string; status: Status;
  chat: string; drive: string; kpiUrl: string;
  land: Landing; req: Requisites; fop: string;
  logo: string; docs: Doc[]; notes: Note[]; createdAt: string;
}

export interface State {
  v: number;
  rates: Record<Cur, number>;
  fops: Fop[];
  serviceTypes: SvcType[];
  team: Member[];
  clients: Client[];
  projects: Project[];
  services: Service[];
  invoiceSeq: number;
  me: string;
}
