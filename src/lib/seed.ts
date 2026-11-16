/* Вигадані демо-дані. Дати рахуються від сьогоднішнього дня. */
import type { State, Service, Project, Cur, Member, Requisites } from './types';
import { CUR_START, TODAY, addDays, addMonths, monthEnd, uid, translit } from './utils';

export function seed(): State {
  const C = CUR_START, PR = addMonths(C, -1), P2 = addMonths(C, -2), P3 = addMonths(C, -3), P4 = addMonths(C, -4);

  const team: Member[] = ([
    ['t1', 'Олександр Коваль', 'owner'], ['t2', 'Марина Литвин', 'owner'], ['t3', 'Денис Гриценко', 'sysadmin'], ['t4', 'Ірина Савчук', 'coo'],
    ['t5', 'Катерина Мельник', 'cm'], ['t6', 'Андрій Бондар', 'cm'], ['t7', 'Максим Ткаченко', 'tl_traffic'],
    ['t8', 'Юлія Шевчук', 'target'], ['t9', 'Владислав Кравець', 'target'], ['t10', 'Олена Поліщук', 'target'],
    ['t11', 'Артем Руденко', 'google'], ['t12', 'Софія Левченко', 'google'],
    ['t13', 'Анна Мороз', 'designer'], ['t14', 'Богдан Захарченко', 'designer'], ['t15', 'Тарас Іваненко', 'video'], ['t16', 'Дарина Онищенко', 'video'],
  ] as const).map(([id, name, role], i) => ({
    id, name, role,
    phone: `+380 6${i % 10} ${400 + i * 7} ${10 + i} ${20 + i}`,
    telegram: '@' + translit(name.split(' ')[0]) + '_' + translit(name.split(' ')[1]).slice(0, 3),
  }));

  const fops = [
    { id: 'f1', name: 'ФОП Коваль Олександр Петрович', code: '3120415678', iban: 'UA21 3052 9900 0002 6007 2335 6600 1', bank: 'АТ КБ «ПриватБанк»', group: '3 група, 5%' },
    { id: 'f2', name: 'ФОП Литвин Марина Сергіївна', code: '3254718890', iban: 'UA54 3220 0100 0002 6005 3301 8842 7', bank: 'АТ «Універсал Банк»', group: '3 група, 5%' },
    { id: 'f3', name: 'ФОП Савчук Ірина Василівна', code: '3398120456', iban: 'UA67 3510 0500 0002 6000 8812 4410 2', bank: 'АТ «Укрсиббанк»', group: '3 група, 5%' },
  ];

  const serviceTypes: State['serviceTypes'] = [
    { id: 'meta', name: 'Таргетована реклама Meta', short: 'Meta', team: 'traffic', roles: ['target'], price: 390, currency: 'EUR' },
    { id: 'tiktok', name: 'Таргетована реклама TikTok', short: 'TikTok', team: 'traffic', roles: ['target'], price: 390, currency: 'EUR' },
    { id: 'context', name: 'Контекстна реклама', short: 'Google Ads', team: 'traffic', roles: ['google'], price: 390, currency: 'EUR' },
    { id: 'shopping', name: 'Google Shopping', short: 'Google Shopping', team: 'traffic', roles: ['google'], price: 390, currency: 'EUR' },
    { id: 'youtube', name: 'YouTube реклама', short: 'YouTube', team: 'traffic', roles: ['google'], price: 350, currency: 'EUR' },
    { id: 'smm', name: 'Комплексний СММ', short: 'СММ', team: 'smm', roles: ['designer', 'video'], price: 590, currency: 'USD' },
    { id: 'pack', name: 'Упаковка профілю', short: 'Упаковка', team: 'smm', roles: ['designer'], price: 290, currency: 'USD' },
  ];
  const rates: Record<Cur, number> = { USD: 41.85, EUR: 48.7, UAH: 1 };

  const clients = ([
    ['c1', 'Гнатюк Роман Ігорович', '+380 67 123 45 67', '@roman_hnatiuk'],
    ['c2', 'Остапенко Вікторія Андріївна', '+380 50 334 21 09', '@vika_ostap'],
    ['c3', 'Чорновол Ігор Миколайович', '+380 63 908 77 12', '@igor_ch'],
    ['c4', 'Яковенко Наталія Олегівна', '+380 96 210 33 48', '@natali_bloom'],
    ['c5', 'Пилипенко Сергій Віталійович', '+380 68 455 90 01', '@s_pylypenko'],
    ['c6', 'Кузьменко Олена Петрівна', '+380 99 612 40 77', '@olena_zerno'],
    ['c7', 'Дяченко Павло Андрійович', '+380 73 118 52 64', '@pavlo_dia'],
    ['c8', 'Бойко Алла Вікторівна', '+380 97 703 15 26', '@alla_boyko'],
    ['c9', 'Ковальчук Євген Сергійович', '+380 66 870 44 39', '@evgen_smak'],
    ['c10', 'Савенко Тетяна Іванівна', '+380 93 245 67 80', '@tanya_linia'],
  ] as const).map(([id, name, phone, telegram]) => ({ id, name, phone, telegram, createdAt: P4 }));

  const req = (type: Requisites['type'], name: string, extra: Omit<Requisites, 'type' | 'name'>): Requisites => ({ type, name, ...extra });
  type PSeed = Omit<Project, 'no' | 'logo' | 'docs' | 'notes' | 'createdAt' | 'drive' | 'kpiUrl'>;
  const base: PSeed[] = [
    { id: 'p1', name: 'Kava Lab', clientId: 'c1', cm: 't5', coo: 't4', status: 'active', chat: 'https://t.me/+kavalab_work', land: { site: 'kavalab.com.ua', instagram: 'instagram.com/kavalab.ua', tiktok: 'tiktok.com/@kavalab', facebook: 'facebook.com/kavalab' }, req: req('ТОВ', 'ТОВ «Кава Лаб»', { code: 'ЄДРПОУ 44851230', iban: 'UA41 3052 9900 0002 6008 1234 5678 9', addr: 'м. Київ, вул. Саксаганського, 41' }), fop: 'f1' },
    { id: 'p2', name: 'Mriya Home', clientId: 'c2', cm: 't5', coo: 't4', status: 'active', chat: 'https://t.me/+mriyahome_ads', land: { site: 'mriyahome.ua', instagram: 'instagram.com/mriya.home', facebook: 'facebook.com/mriyahome' }, req: req('ТОВ', 'ТОВ «Мрія Хоум»', { code: 'ЄДРПОУ 43120987', iban: 'UA88 3220 0100 0002 6003 0099 1122 3', addr: 'м. Львів, вул. Городоцька, 120' }), fop: 'f2' },
    { id: 'p3', name: 'Lisova Spa', clientId: 'c3', cm: 't6', coo: 't4', status: 'active', chat: 'https://t.me/+lisova_spa', land: { site: 'lisovaspa.com', instagram: 'instagram.com/lisova.spa' }, req: req('ФОП', 'ФОП Чорновол Ігор Миколайович', { code: 'ІПН 3011245789', iban: 'UA12 3510 0500 0002 6001 2345 0099 8', addr: 'Київська обл., м. Ірпінь' }), fop: 'f1' },
    { id: 'p4', name: 'Sota Tech', clientId: 'c3', cm: 't6', coo: 't4', status: 'active', chat: 'https://t.me/+sotatech', land: { site: 'sotatech.com.ua', facebook: 'facebook.com/sotatech' }, req: req('ТОВ', 'ТОВ «Сота Тех»', { code: 'ЄДРПОУ 45001233', iban: 'UA30 3052 9900 0002 6009 8888 7777 1', addr: 'м. Київ, вул. Хрещатик, 10' }), fop: 'f2' },
    { id: 'p5', name: 'Bloom Flowers', clientId: 'c4', cm: 't5', coo: 't4', status: 'active', chat: 'https://t.me/+bloom_ads', land: { site: 'bloomflowers.com.ua', instagram: 'instagram.com/bloom.kyiv', tiktok: 'tiktok.com/@bloom.kyiv' }, req: req('ФОП', 'ФОП Яковенко Наталія Олегівна', { code: 'ІПН 3290034561', iban: 'UA77 3220 0100 0002 6002 4433 2211 0', addr: 'м. Київ' }), fop: 'f3' },
    { id: 'p6', name: 'Stalker Gym', clientId: 'c5', cm: 't6', coo: 't4', status: 'freeze', chat: 'https://t.me/+stalkergym', land: { instagram: 'instagram.com/stalker.gym', tiktok: 'tiktok.com/@stalker.gym' }, req: req('ФОП', 'ФОП Пилипенко Сергій Віталійович', { code: 'ІПН 3156700981', iban: 'UA19 3052 9900 0002 6004 5612 7845 3', addr: 'м. Дніпро' }), fop: 'f1' },
    { id: 'p7', name: 'Zerno Bakery', clientId: 'c6', cm: 't5', coo: 't4', status: 'stop', chat: '', land: { site: 'zerno.ua', instagram: 'instagram.com/zerno.bakery' }, req: req('ТОВ', 'ТОВ «Зерно»', { code: 'ЄДРПОУ 42998812', iban: 'UA02 3510 0500 0002 6000 1919 2828 3', addr: 'м. Одеса' }), fop: 'f2' },
    { id: 'p8', name: 'Polar Kids', clientId: 'c7', cm: 't6', coo: 't4', status: 'active', chat: 'https://t.me/+polarkids', land: { site: 'polarkids.com.ua', instagram: 'instagram.com/polar.kids', tiktok: 'tiktok.com/@polarkids', facebook: 'facebook.com/polarkids' }, req: req('Інвойс', 'Polar Kids Sp. z o.o.', { code: 'NIP PL5272981120', iban: 'PL61 1090 1014 0000 0712 1981 2874', addr: 'ul. Marszałkowska 84, Warszawa, Poland', email: 'billing@polarkids.pl' }), fop: 'f3' },
    { id: 'p9', name: 'Avto Dok', clientId: 'c8', cm: 't5', coo: 't4', status: 'active', chat: 'https://t.me/+avtodok', land: { site: 'avtodok.com.ua' }, req: req('ТОВ', 'ТОВ «Авто Док Груп»', { code: 'ЄДРПОУ 44112098', iban: 'UA65 3052 9900 0002 6001 9988 7766 5', addr: 'м. Харків' }), fop: 'f1' },
    { id: 'p10', name: 'Smak Delivery', clientId: 'c9', cm: 't6', coo: 't4', status: 'active', chat: 'https://t.me/+smak_delivery', land: { site: 'smak.delivery', instagram: 'instagram.com/smak.delivery', tiktok: 'tiktok.com/@smak.delivery' }, req: req('ФОП', 'ФОП Ковальчук Євген Сергійович', { code: 'ІПН 3401298765', iban: 'UA43 3220 0100 0002 6006 7788 9900 1', addr: 'м. Київ' }), fop: 'f2' },
    { id: 'p11', name: 'Linia Beauty', clientId: 'c10', cm: 't5', coo: 't4', status: 'active', chat: '', land: { instagram: 'instagram.com/linia.beauty' }, req: req('ФОП', 'ФОП Савенко Тетяна Іванівна', { code: 'ІПН 3367120045', iban: 'UA90 3052 9900 0002 6007 1100 2200 3', addr: 'м. Вінниця' }), fop: 'f3' },
  ];
  const slug = (n: string) => n.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const projects: Project[] = base.map((p, i) => ({
    ...p, no: i + 1, logo: '', docs: [], notes: [], createdAt: P4,
    drive: [4, 6, 10].includes(i) ? '' : `https://drive.google.com/drive/folders/${slug(p.name)}`,
    kpiUrl: [2, 6, 10].includes(i) ? '' : `https://docs.google.com/spreadsheets/d/kpi-${slug(p.name)}`,
  }));

  const services: Service[] = [];
  const S = (projectId: string, typeId: string, spec: string, start: string,
    o: { end?: string; price?: number; currency?: Cur; rate?: number; free?: boolean; pay?: number; payDay?: number } = {}) => {
    const t = serviceTypes.find((x) => x.id === typeId)!;
    const currency = o.currency || t.currency;
    const s: Service = {
      id: uid('s'), projectId, typeId, specialistId: spec, start, end: o.end || monthEnd(start),
      price: o.price ?? t.price, currency, rate: o.rate ?? rates[currency], free: !!o.free, payments: [],
    };
    const pr = s.free ? 0 : Math.round(s.price * (s.currency === 'UAH' ? 1 : s.rate));
    const pay = o.pay === undefined ? 1 : o.pay;
    const fop = projects.find((p) => p.id === projectId)!.fop;
    if (!s.free && pay > 0) s.payments.push({ id: uid('pay'), date: addDays(start, o.payDay ?? 2), amount: Math.round(pr * pay), fopId: fop });
    services.push(s);
  };
  [P3, P2, PR].forEach((d) => { S('p1', 'meta', 't8', d, { rate: 47.9 }); S('p1', 'tiktok', 't9', d, { rate: 47.9 }); });
  S('p1', 'meta', 't8', C); S('p1', 'tiktok', 't9', C);
  [P2, PR].forEach((d) => { S('p2', 'context', 't11', d, { rate: 48.1 }); S('p2', 'shopping', 't11', d, { rate: 48.1 }); });
  S('p2', 'context', 't11', C); S('p2', 'shopping', 't11', C, { pay: 0.5 }); S('p2', 'youtube', 't12', C, { pay: 0, price: 350 });
  S('p3', 'smm', 't13', C, { pay: 0.4 }); S('p3', 'pack', 't14', C);
  S('p4', 'meta', 't10', PR, { rate: 48.2 }); S('p4', 'context', 't12', PR, { rate: 48.2 });
  S('p4', 'meta', 't10', C); S('p4', 'context', 't12', C);
  S('p5', 'meta', 't8', P4, { rate: 46.9 }); S('p5', 'meta', 't8', C, { pay: 0 });
  S('p6', 'tiktok', 't9', PR, { rate: 48.2 }); S('p6', 'smm', 't15', PR, { rate: 41.6, currency: 'USD' }); S('p6', 'tiktok', 't9', C, { pay: 0 });
  S('p7', 'context', 't11', P2, { rate: 48.0 }); S('p7', 'context', 't11', PR, { rate: 48.1, pay: 0.7 });
  const p8s = addDays(C, 17).slice(0, 8) + '01';
  S('p8', 'meta', 't10', addMonths(p8s, -1), { rate: 48.3 }); S('p8', 'tiktok', 't10', addMonths(p8s, -1), { rate: 48.3 }); S('p8', 'smm', 't16', addMonths(p8s, -1), { rate: 41.7 });
  S('p8', 'meta', 't10', p8s, { pay: 1 }); S('p8', 'tiktok', 't10', p8s, { pay: 0 }); S('p8', 'smm', 't16', p8s, { pay: 0.5 });
  S('p9', 'shopping', 't12', C); S('p9', 'context', 't12', C, { price: 420 });
  S('p10', 'meta', 't9', PR, { rate: 48.2 }); S('p10', 'meta', 't9', C);
  S('p10', 'tiktok', 't8', addDays(TODAY, -4), { free: true, end: addDays(TODAY, 9), price: 0 });
  S('p11', 'pack', 't13', C, { pay: 0, price: 250 });
  S('p11', 'smm', 't15', addDays(TODAY, -2), { free: true, end: addDays(TODAY, 12), price: 0 });

  const D = (pid: string, type: string, name: string, date: string) =>
    projects.find((p) => p.id === pid)!.docs.push({ id: uid('d'), type, name, date, demo: true });
  projects.forEach((p) => {
    D(p.id, 'Договір', `Договір №${p.id.slice(1).padStart(3, '0')}-2026 ${p.name}.pdf`, P2);
    D(p.id, 'NDA', `NDA ${p.name}.pdf`, P2);
  });
  D('p1', 'Рахунок', 'Рахунок №INV-0412.pdf', addDays(C, 1)); D('p1', 'Акт виконаних робіт', 'Акт №A-0388.pdf', addDays(PR, 30));
  D('p2', 'Рахунок', 'Рахунок №INV-0415.pdf', addDays(C, 1)); D('p8', 'Інвойс', 'Invoice PK-2026-10.pdf', C);

  const N = (pid: string, text: string, author: string, date: string) =>
    projects.find((p) => p.id === pid)!.notes.push({ id: uid('n'), text, author, date });
  N('p1', 'Клієнт просить звіт щопонеділка до 12:00. Бюджет на рекламу оплачує сам, окремо від послуг.', 't5', addDays(C, 2));
  N('p2', 'YouTube запускаємо після погодження відео від клієнта. Оплату за YouTube обіцяли до кінця тижня.', 't5', addDays(C, 5));
  N('p6', 'Заморозка на час ремонту залу. Повернення орієнтовно з наступного місяця.', 't6', addDays(C, 6));
  N('p10', 'Тестуємо TikTok безкоштовно 2 тижні. Якщо CPL буде нижче 120 ₴, переводимо в платну послугу.', 't6', addDays(TODAY, -4));

  return { v: 2, rates, fops, serviceTypes, team, clients, projects, services, invoiceSeq: 421, me: 't1' };
}
