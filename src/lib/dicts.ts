import type { Role, Status, ReqType } from './types';

export const ROLES: Record<Role, string> = {
  owner: 'Власник', sysadmin: 'Системний адміністратор', coo: 'Операційний директор', cm: 'Клієнт-менеджер',
  tl_traffic: 'Тімлід трафіку', target: 'Таргетолог', google: 'Google-спеціаліст', designer: 'Дизайнер', video: 'Відеомейкер',
};
export const ROLE_ORDER = Object.keys(ROLES) as Role[];
export const SPECIALIST_ROLES: Role[] = ['target', 'google', 'designer', 'video'];

export const STATUS: Record<Status, { l: string; t: string }> = {
  active: { l: 'Активний', t: 'success' },
  freeze: { l: 'Заморозка', t: 'signal' },
  stop: { l: 'Стоп', t: 'error' },
};
export const DOC_TYPES = ['Договір', 'NDA', 'Рахунок', 'Акт виконаних робіт', 'Інвойс'];
export const REQ_TYPES: ReqType[] = ['ТОВ', 'ФОП', 'Інвойс'];
export const CURRENCIES = ['EUR', 'USD', 'UAH'] as const;

export const NAV: [string, string][] = [
  ['/', 'Цей місяць'], ['/projects', 'Проекти'], ['/services', 'Послуги'], ['/clients', 'Замовники'],
  ['/team', 'Команда'], ['/free', 'Безкоштовні'], ['/admin', 'Адміністрування'],
];
