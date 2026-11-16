'use client';
import { useDB } from '@/lib/store';
import { TODAY } from '@/lib/utils';
import { PageHead } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { SvcTable } from '@/components/SvcTable';
import { useActions } from '@/components/dialogs';

export default function Free() {
  const S = useDB(); const act = useActions();
  const list = S.services.filter((s) => s.free).sort((a, b) => (a.end < b.end ? 1 : -1));
  const active = list.filter((s) => s.end >= TODAY);
  return (
    <div className="page">
      <PageHead title="Безкоштовні періоди" text={`Зараз активних: ${active.length}.`}
        actions={<button type="button" className="btn primary" onClick={() => act.addSvc(undefined, true)}><Icon name="plus" size={16} />Новий безкоштовний період</button>} />
      <div className="info-line"><span className="ico"><Icon name="gift" /></span><p>Тестові періоди без оплати. Вони не рахуються в борги й дохід, але лишаються в історії проекту. Пізніше сюди додамо задачі й умови переходу в платну послугу.</p></div>
      <div className="sec"><SvcTable list={list} project empty="Безкоштовних періодів ще немає." /></div>
    </div>
  );
}
