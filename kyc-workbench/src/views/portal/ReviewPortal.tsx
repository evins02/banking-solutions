import { useState } from 'react';
import { CheckCircle2, Fingerprint } from 'lucide-react';
import { useStore } from '../../store';
import { customerRespond } from '../../lib/actions';
import { effectiveOwners } from '../../lib/domain';
import { fmtChfShort, fmtNumber } from '../../lib/format';
import { customerOf, personName } from '../../lib/selectors';
import { Button, cx, DemoTag, InfoBox, Modal, Textarea } from '../../components/ui';
import { PortalShell } from './PortalShell';

export function ReviewPortal({ reviewId }: { reviewId: string }) {
  const { state, act } = useStore();
  const [changes, setChanges] = useState<Record<string, string | undefined>>({});
  const [eid, setEid] = useState(false);
  const r = state.reviews.find((x) => x.id === reviewId);
  if (!r) return <PortalShell title="Link ungültig">Dieser Link ist nicht mehr gültig.</PortalShell>;
  const c = customerOf(state, r.customerId)!;
  const owners = effectiveOwners(c);
  const answered = Boolean(r.response) || r.status === 'abgeschlossen' || r.status === 'aktualisierung';

  const sections: { id: string; title: string; rows: [string, string][] }[] = [
    { id: 'Firma und Sitz', title: 'Firma und Sitz', rows: [['Firma', c.name], ['UID-Nummer', c.uid], ['Adresse', `${c.street}, ${c.seat}`]] },
    { id: 'Geschäftstätigkeit', title: 'Zweck und Geschäftstätigkeit', rows: [['Zweck', c.purpose], ['Branche', c.industry], ['Zweck der Geschäftsbeziehung', c.relationshipPurpose]] },
    { id: 'Zeichnungsberechtigte', title: 'Zeichnungsberechtigte Personen', rows: c.signatories.map((s) => [personName(state, s.personId), `${s.function}, ${s.signature}`]) },
    {
      id: 'Wirtschaftlich Berechtigte',
      title: c.formType === 'A' ? 'Wirtschaftlich berechtigte Personen' : 'Kontrollinhaber',
      rows: c.controllerIds.map((id) => {
        const o = owners.find((x) => x.personId === id);
        return [personName(state, id), o ? `${fmtNumber(o.percent, 1)} %` : 'kontrollierende Person'];
      }),
    },
    { id: 'Erwartete Volumen', title: 'Erwartete Volumen', rows: [['Jahresvolumen', fmtChfShort(c.expectedVolume)], ['Bargeldanteil', `${c.expectedCashShare} %`]] },
  ];

  const list = Object.entries(changes).filter(([, v]) => v !== undefined && v.trim().length > 0).map(([section, note]) => ({ section, note: note! }));
  const pendingEmpty = Object.values(changes).some((v) => v !== undefined && v.trim().length === 0);

  const submit = (viaEid: boolean) => act(customerRespond, r.id, list, viaEid);

  if (answered) {
    return (
      <PortalShell title="Vielen Dank">
        <div className="mt-6">
          <InfoBox tone="green" title="Ihre Angaben sind bei uns eingegangen." icon={<CheckCircle2 className="mt-0.5 size-4" />}>
            {r.response?.changes.length ? 'Ihre Kundenberaterin bzw. Ihr Kundenberater meldet sich bei Ihnen zu den gemeldeten Änderungen.' : 'Sie haben Ihre Daten unverändert bestätigt. Es ist nichts weiter zu tun.'}
          </InfoBox>
        </div>
      </PortalShell>
    );
  }

  return (
    <PortalShell title={`Ihre Daten bei uns – ${c.name}`}>
      <p className="mt-1 text-sm text-slate-600">Wir sind gesetzlich verpflichtet, Ihre Angaben regelmässig zu überprüfen. Bitte bestätigen Sie, dass die folgenden Daten noch stimmen, oder melden Sie Änderungen.</p>
      <div className="mt-6 space-y-3">
        {sections.map((s) => {
          const editing = changes[s.id] !== undefined;
          return (
            <section key={s.id} className={cx('rounded-lg border bg-white p-4', editing ? 'border-amber-300' : 'border-slate-200')}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">{s.title}</h2>
                <div className="flex gap-1">
                  <Button size="sm" variant={!editing ? 'primary' : 'secondary'} onClick={() => setChanges({ ...changes, [s.id]: undefined })}>
                    Stimmt
                  </Button>
                  <Button size="sm" variant={editing ? 'primary' : 'secondary'} onClick={() => setChanges({ ...changes, [s.id]: changes[s.id] ?? '' })}>
                    Änderung melden
                  </Button>
                </div>
              </div>
              <dl className="mt-2 space-y-1 text-sm">
                {s.rows.map(([k, v], i) => (
                  <div key={i} className="grid gap-1 sm:grid-cols-[200px_1fr]">
                    <dt className="text-slate-500">{k}</dt>
                    <dd className="text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              {editing && <Textarea className="mt-3" rows={2} value={changes[s.id]} onChange={(e) => setChanges({ ...changes, [s.id]: e.target.value })} placeholder="Was hat sich geändert?" autoFocus />}
            </section>
          );
        })}
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <Button onClick={() => submit(false)} disabled={pendingEmpty}>
          {list.length ? `${list.length} Änderung(en) melden` : 'Daten bestätigen'}
        </Button>
        <Button variant="secondary" icon={<Fingerprint className="size-4" />} onClick={() => setEid(true)} disabled={pendingEmpty}>
          Mit E-ID bestätigen
        </Button>
        <DemoTag>Platzhalter</DemoTag>
      </div>
      <Modal
        open={eid}
        onClose={() => setEid(false)}
        title="Mit E-ID bestätigen"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEid(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                submit(true);
                setEid(false);
              }}
            >
              Bestätigung simulieren
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">Hinweis auf die kommende staatliche E-ID: Künftig kann die Bestätigung mit der E-ID der zeichnungsberechtigten Person rechtsgültig erfolgen. In diesem Prototyp wird keine echte Identifikation durchgeführt.</p>
      </Modal>
    </PortalShell>
  );
}
