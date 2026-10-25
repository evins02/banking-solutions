import { useState, type FormEvent } from 'react';
import { ArrowLeft, Building2, Search } from 'lucide-react';
import { useStore } from '../../store';
import { services } from '../../services';
import type { HrRecord } from '../../data/registers';
import { createCase } from '../../lib/actions';
import { can } from '../../lib/domain';
import { countryName, fmtDate } from '../../lib/format';
import type { Person } from '../../types';
import { go, href } from '../../router';
import { Button, Card, DemoTag, Empty, Field, FromRegister, InfoBox, Input, PageHeader, Spinner } from '../../components/ui';

const UID_RE = /^CHE-?\d{3}\.?\d{3}\.?\d{3}$/i;

export function NewCase() {
  const { act, role } = useStore();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<HrRecord[] | null>(null);
  const [selected, setSelected] = useState<{ record: HrRecord; persons: Person[] } | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const looksLikeUid = /^che/i.test(q.trim());
  const uidInvalid = looksLikeUid && q.trim().length >= 6 && !UID_RE.test(q.trim());

  const search = async (e: FormEvent) => {
    e.preventDefault();
    if (q.trim().length < 3 || uidInvalid) return;
    setLoading(true);
    setSelected(null);
    setResults(await services.handelsregister.search(q));
    setLoading(false);
  };

  const pick = async (r: HrRecord) => {
    setLoadingDetail(true);
    setSelected(await services.handelsregister.get(r.uid));
    setLoadingDetail(false);
  };

  const create = () => {
    if (!selected) return;
    const id = act(createCase, selected.record, selected.persons);
    if (id) go(`/onboarding/${id}`);
  };

  if (!can(role, 'case.create')) {
    return (
      <>
        <PageHeader title="Neuer Fall" />
        <InfoBox tone="amber" title="Nur Kundenberater/innen legen Fälle an.">Bitte oben rechts die Rolle «Kundenberater/in» wählen.</InfoBox>
      </>
    );
  }

  return (
    <>
      <PageHeader
        back={
          <a href={href('/onboarding')} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            <ArrowLeft className="size-3.5" /> Onboarding
          </a>
        }
        title="Neuer Onboarding-Fall"
        subtitle="Firma im Handelsregister suchen – die Stammdaten werden vorbefüllt."
      />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card title={<span className="flex items-center gap-2">1. Firma suchen <DemoTag>Zefix simuliert</DemoTag></span>} className="lg:col-span-2">
          <form onSubmit={search} className="space-y-3">
            <Field label="Firmenname oder UID-Nummer" hint="z. B. «Beispiel Garten» oder CHE-999.300.301" error={uidInvalid ? 'UID im Format CHE-xxx.xxx.xxx eingeben' : undefined}>
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma oder CHE-xxx.xxx.xxx" autoFocus />
            </Field>
            <Button type="submit" icon={<Search className="size-4" />} loading={loading} disabled={q.trim().length < 3 || uidInvalid}>
              Im Handelsregister suchen
            </Button>
          </form>
          <div className="mt-4">
            {loading && <Spinner text="Handelsregister wird abgefragt …" />}
            {results && !loading && results.length === 0 && <Empty>Kein Eintrag gefunden.</Empty>}
            {results && !loading && results.length > 0 && (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {results.map((r) => (
                  <li key={r.uid}>
                    <button type="button" onClick={() => pick(r)} className={`flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-slate-50 ${selected?.record.uid === r.uid ? 'bg-brand-50' : ''}`}>
                      <Building2 className="mt-0.5 size-4 text-slate-400" />
                      <span>
                        <span className="block text-sm font-medium text-slate-900">{r.name}</span>
                        <span className="block text-xs text-slate-500">
                          {r.uid} · {r.legalForm} · {r.seat} {r.canton}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="2. Vorbefüllte Stammdaten prüfen" className="lg:col-span-3">
          {loadingDetail && <Spinner text="Handelsregisterauszug wird geladen …" />}
          {!loadingDetail && !selected && <Empty>Firma links auswählen.</Empty>}
          {!loadingDetail && selected && (
            <div className="space-y-4">
              <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {[
                  ['Firma', selected.record.name],
                  ['UID-Nummer', selected.record.uid],
                  ['Rechtsform', selected.record.legalForm],
                  ['Sitz', `${selected.record.seat} (${selected.record.canton})`],
                  ['Adresse', selected.record.street],
                  ['Gründungsdatum', fmtDate(selected.record.foundedAt)],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="flex items-center gap-2 text-xs text-slate-500">
                      {k} <FromRegister />
                    </dt>
                    <dd className="text-sm font-medium text-slate-900">{v}</dd>
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <dt className="flex items-center gap-2 text-xs text-slate-500">
                    Zweck <FromRegister />
                  </dt>
                  <dd className="text-sm text-slate-900">{selected.record.purpose}</dd>
                </div>
              </dl>
              <div>
                <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500">
                  Zeichnungsberechtigte <FromRegister />
                </div>
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {selected.record.signatories.map((s) => {
                    const p = selected.persons.find((x) => x.id === s.personId);
                    return (
                      <li key={s.personId} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
                        <span>
                          <span className="font-medium text-slate-900">
                            {p?.firstName} {p?.lastName}
                          </span>
                          <span className="text-slate-500">
                            {' '}
                            · {s.function} · {p ? countryName(p.nationality) : ''}
                          </span>
                        </span>
                        <span className="text-slate-600">{s.signature}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <InfoBox>Felder mit dem Symbol «aus Handelsregister» wurden automatisch übernommen. Änderungen werden im Audit-Trail protokolliert.</InfoBox>
              <div className="flex justify-end">
                <Button onClick={create}>Fall anlegen</Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
