'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useDB, commit, resetData } from '@/lib/store';
import { isCurrent, paidUAH } from '@/lib/domain';
import { money } from '@/lib/utils';
import { CLOUD } from '@/lib/supabase';
import { PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { FopModal } from '@/components/dialogs';
import { useUI } from '@/components/overlay';

export default function Admin() {
  const S = useDB(); const ui = useUI(); const router = useRouter();
  const [usd, setUsd] = useState(String(S.rates.USD));
  const [eur, setEur] = useState(String(S.rates.EUR));
  const [apply, setApply] = useState(false);
  const [err, setErr] = useState('');
  const recv = (fid: string, cur?: boolean) =>
    S.services.filter((s) => !cur || isCurrent(s)).flatMap((s) => s.payments).filter((x) => x.fopId === fid).reduce((a, x) => a + x.amount, 0);
  const saveRates = () => {
    const u = +usd, e = +eur; if (!(u > 0 && e > 0)) { setErr('Курс має бути більше нуля.'); return; }
    setErr(''); S.rates.USD = u; S.rates.EUR = e; let n = 0;
    if (apply) S.services.filter((s) => isCurrent(s) && !s.free && s.currency !== 'UAH' && paidUAH(s) === 0).forEach((s) => { s.rate = S.rates[s.currency]; n++; });
    commit(); ui.toast(n ? `Перераховано за новим курсом: ${n} послуг` : 'Курс збережено');
  };
  return (
    <div className="page narrow">
      <PageHead title="Адміністрування" text="ФОП, на які приходять оплати, і курси валют."
        actions={<button type="button" className="btn primary" onClick={() => ui.open(<FopModal key={Date.now()} />)}><Icon name="plus" size={16} />Додати ФОП</button>} />
      <section className="sec" aria-labelledby="fh">
        <div className="sec-h"><h2 id="fh">ФОП для оплат</h2><span className="r">На них клієнт-менеджер генерує рахунки</span></div>
        <div className="tbl-wrap"><table className="idx">
          <thead><tr><th>ФОП</th><th>ІПН</th><th>IBAN і банк</th><th className="num">Проектів</th><th className="num">За період</th><th className="num">Усього</th><th className="num"><span className="visually-hidden">Дії</span></th></tr></thead>
          <tbody>{S.fops.map((f) => (
            <tr key={f.id}>
              <td><span className="row-title">{f.name}</span><div className="muted xs">{f.group}</div></td>
              <td className="num">{f.code}</td>
              <td className="xs num">{f.iban}<div className="muted">{f.bank}</div></td>
              <td className="num">{S.projects.filter((p) => p.fop === f.id).length}</td>
              <td className="num">{money(recv(f.id, true))}</td>
              <td className="num" style={{ fontWeight: 600 }}>{money(recv(f.id))}</td>
              <td className="num"><button type="button" className="btn icon sm" onClick={() => ui.open(<FopModal key={f.id + Date.now()} fop={f} />)} aria-label={`Редагувати ${f.name}`}><Icon name="edit" size={16} /></button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
      <div className="layout-home">
        <section aria-labelledby="rh"><div className="sec-h"><h2 id="rh">Курси валют</h2></div>
          <div className="form">
            <div className="row2">
              <div className="fld"><label htmlFor="rUSD">USD до гривні</label><input className="inp num" id="rUSD" type="number" inputMode="decimal" step="0.01" value={usd} onChange={(e) => setUsd(e.target.value)} /></div>
              <div className="fld"><label htmlFor="rEUR">EUR до гривні</label><input className="inp num" id="rEUR" type="number" inputMode="decimal" step="0.01" value={eur} onChange={(e) => setEur(e.target.value)} /></div>
            </div>
            <label className="cb"><input type="checkbox" checked={apply} onChange={(e) => setApply(e.target.checked)} /> Перерахувати неоплачені поточні послуги</label>
            <p className="form-error" role="alert">{err}</p>
            <div><button type="button" className="btn" onClick={saveRates}>Зберегти курс</button></div>
            <p className="muted xs">Курс зберігається в кожній послузі окремо, тож його можна змінити і вручну.</p>
          </div>
        </section>
        {!CLOUD && <section aria-labelledby="dh"><div className="sec-h"><h2 id="dh">Демо-дані</h2></div>
          <p className="small" style={{ maxWidth: '48ch' }}>Спеціалісти, проекти й замовники вигадані. Зміни зберігаються лише в цьому браузері.</p>
          <div className="mt16"><button type="button" className="btn danger" onClick={() => ui.confirm('Повернути початкові демо-дані? Усі ваші зміни зникнуть.', () => { resetData(); router.push('/'); }, 'Повернути')}><Icon name="refresh" size={16} />Повернути початкові дані</button></div>
        </section>}
      </div>
    </div>
  );
}
