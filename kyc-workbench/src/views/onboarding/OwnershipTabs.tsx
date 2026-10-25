import { useEffect, useState } from 'react';
import { Building2, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { useStore } from '../../store';
import { services } from '../../services';
import { addHolding, justifyDeviation, loadDeclaredStructure, removeHolding, setControllers, setRegisterResult } from '../../lib/actions';
import { effectiveOwners, ownershipTree, structureDepth, suggestedControllers, type OwnerNode } from '../../lib/domain';
import { COUNTRY, countryName, fmtDateTime, fmtNumber } from '../../lib/format';
import { personOf } from '../../lib/selectors';
import type { Customer, OnboardingCase } from '../../types';
import { Badge, Button, Card, cx, DemoTag, Empty, Field, InfoBox, Input, Modal, Select, Spinner, Table, td, Textarea, th } from '../../components/ui';

/* ------------------------------------------------------------------ */
/* Transparenzregister                                                 */
/* ------------------------------------------------------------------ */

function DeviationRow({ cs, dev, editable }: { cs: OnboardingCase; dev: OnboardingCase['deviations'][number]; editable: boolean }) {
  const { act } = useStore();
  const [v, setV] = useState(dev.justification);
  useEffect(() => setV(dev.justification), [dev.justification]);
  const missing = v.trim().length < 20;
  return (
    <tr className="bg-red-50/50">
      <td className={`${td} font-medium text-red-800`}>{dev.subject}</td>
      <td className={`${td} text-red-800`}>{dev.customerValue}</td>
      <td className={`${td} text-red-800`}>{dev.registerValue}</td>
      <td className={`${td} w-[42%]`}>
        {editable ? (
          <>
            <Textarea
              rows={2}
              value={v}
              onChange={(e) => setV(e.target.value)}
              onBlur={() => v !== dev.justification && act(justifyDeviation, cs.id, dev.id, v)}
              placeholder="Pflichtfeld: Begründung der Abweichung (z. B. Abtretung vom …, Meldung im Register noch nicht nachgeführt)"
              className={missing ? 'border-red-300' : ''}
            />
            {missing && <span className="text-xs font-medium text-red-700">Pflichtfeld – mindestens 20 Zeichen</span>}
          </>
        ) : (
          <span className="text-sm text-slate-700">{dev.justification || <span className="text-red-700">nicht begründet</span>}</span>
        )}
      </td>
    </tr>
  );
}

export function RegisterTab({ cs, c, editable }: { cs: OnboardingCase; c: Customer; editable: boolean }) {
  const { act } = useStore();
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string>();
  const declared = effectiveOwners(c);

  const run = async () => {
    setLoading(true);
    const res = await services.transparenzregister.owners(c);
    setNote(res.note);
    act(setRegisterResult, cs.id, res.owners, res.note);
    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <Card
        title={
          <span className="flex items-center gap-2">
            Abgleich mit dem Transparenzregister <DemoTag>simuliert</DemoTag>
          </span>
        }
        subtitle={cs.registerCheckedAt ? `Letzter Abgleich: ${fmtDateTime(cs.registerCheckedAt)}` : 'Noch kein Abgleich durchgeführt'}
        actions={
          editable && (
            <Button variant={cs.registerCheckedAt ? 'secondary' : 'primary'} icon={<RefreshCw className="size-4" />} onClick={run} loading={loading}>
              {cs.registerCheckedAt ? 'Erneut abgleichen' : 'Abgleich starten'}
            </Button>
          )
        }
      >
        {loading && <Spinner text="Transparenzregister wird abgefragt …" />}
        {!loading && (
          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Angaben des Kunden (Formular {c.formType})</h3>
              {declared.length === 0 ? (
                <Empty>Noch keine Eigentümer erfasst – im Reiter «Eigentümerstruktur» erfassen.</Empty>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {declared.map((o) => (
                    <li key={o.personId} className="flex justify-between px-3 py-2 text-sm">
                      <span className="font-medium text-slate-900">{o.name}</span>
                      <span className="tabular text-slate-700">{fmtNumber(o.percent, 1)} %</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-800">Gemeldet im Transparenzregister</h3>
              {!cs.registerOwners ? (
                <Empty>Abgleich noch nicht durchgeführt.</Empty>
              ) : cs.registerOwners.length === 0 ? (
                <Empty>{note ?? 'Keine meldepflichtigen Personen.'}</Empty>
              ) : (
                <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                  {cs.registerOwners.map((o) => {
                    const dev = cs.deviations.some((d) => d.subject === o.name);
                    return (
                      <li key={o.name} className={cx('flex justify-between gap-3 px-3 py-2 text-sm', dev && 'bg-red-50')}>
                        <span>
                          <span className={cx('font-medium', dev ? 'text-red-800' : 'text-slate-900')}>{o.name}</span>
                          <span className="text-slate-500">
                            {' '}
                            · Jg. {o.birthYear} · {countryName(o.nationality)}
                          </span>
                        </span>
                        <span className={cx('tabular', dev ? 'font-medium text-red-800' : 'text-slate-700')}>{fmtNumber(o.share, 1)} %</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </Card>

      {cs.registerCheckedAt && (
        <Card title="Abweichungen" subtitle="Jede Abweichung braucht eine Begründung, bevor der Fall eingereicht werden kann" padded={cs.deviations.length === 0}>
          {cs.deviations.length === 0 ? (
            <InfoBox tone="green" title="Keine Abweichungen">
              Die Angaben des Kunden stimmen mit dem Transparenzregister überein.
            </InfoBox>
          ) : (
            <Table>
              <thead className="bg-slate-50/60">
                <tr>
                  <th className={th}>Person</th>
                  <th className={th}>Angabe Kunde</th>
                  <th className={th}>Register</th>
                  <th className={th}>Begründung</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {cs.deviations.map((d) => (
                  <DeviationRow key={d.id} cs={cs} dev={d} editable={editable} />
                ))}
              </tbody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Eigentümerstruktur                                                  */
/* ------------------------------------------------------------------ */

function NodeCard({ n, root, editable, onAdd, onRemove, suggested }: { n: OwnerNode; root: boolean; editable: boolean; onAdd: (id: string) => void; onRemove: (holdingId: string) => void; suggested: boolean }) {
  const person = n.entity.kind === 'person';
  return (
    <div
      className={cx(
        'relative w-[188px] rounded-lg border bg-white px-3 py-2.5 text-left shadow-sm',
        root ? 'border-brand-700 ring-2 ring-brand-100' : person ? (suggested ? 'border-emerald-400 ring-2 ring-emerald-100' : 'border-slate-300') : 'border-brand-200',
      )}
    >
      {!root && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-800 px-2 py-px text-[11px] font-semibold text-white tabular">{fmtNumber(n.percent, n.percent % 1 ? 1 : 0)} %</span>
      )}
      <div className="flex items-start gap-2">
        {person ? <UserRound className="mt-0.5 size-4 shrink-0 text-slate-500" /> : <Building2 className="mt-0.5 size-4 shrink-0 text-brand-600" />}
        <div className="min-w-0">
          <div className="text-[13px] font-semibold leading-snug text-slate-900">{n.entity.name}</div>
          <div className="text-[11px] text-slate-500">
            {countryName(n.entity.country)}
            {person && ` · durchgerechnet ${fmtNumber(n.effective, 1)} %`}
          </div>
        </div>
      </div>
      {person && suggested && (
        <Badge tone="green" className="mt-1.5">
          ab 25 % · Kontrollinhaber
        </Badge>
      )}
      {editable && (
        <div className="mt-1.5 flex gap-1">
          {!person && (
            <button type="button" onClick={() => onAdd(n.entity.id)} className="inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-medium text-brand-700 hover:bg-brand-50">
              <Plus className="size-3" /> Beteiligung
            </button>
          )}
          {!root && n.holdingId && (
            <button type="button" onClick={() => onRemove(n.holdingId!)} className="ml-auto inline-flex items-center rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-700" aria-label="Entfernen">
              <Trash2 className="size-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Tree({ n, root, ...rest }: { n: OwnerNode; root?: boolean; editable: boolean; onAdd: (id: string) => void; onRemove: (h: string) => void; suggestedIds: string[] }) {
  return (
    <li>
      <NodeCard n={n} root={Boolean(root)} editable={rest.editable} onAdd={rest.onAdd} onRemove={rest.onRemove} suggested={Boolean(n.entity.personId && rest.suggestedIds.includes(n.entity.personId))} />
      {n.children.length > 0 && (
        <ul>
          {n.children.map((ch) => (
            <Tree key={ch.holdingId ?? ch.entity.id} n={ch} {...rest} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function StructureTab({ c, editable }: { c: Customer; editable: boolean }) {
  const { state, act } = useStore();
  const tree = ownershipTree(c);
  const depth = structureDepth(tree);
  const owners = effectiveOwners(c);
  const suggestion = suggestedControllers(c);
  const [addTo, setAddTo] = useState<string | null>(null);
  const [form, setForm] = useState({ kind: 'person' as 'person' | 'company', personId: '', firstName: '', lastName: '', birthDate: '', nationality: 'CH', name: '', country: 'CH', percent: '' });
  const [selected, setSelected] = useState<string[]>(c.controllerIds.length ? c.controllerIds : suggestion.personIds);
  const [loadingDemo, setLoadingDemo] = useState(false);
  useEffect(() => setSelected(c.controllerIds.length ? c.controllerIds : suggestedControllers(c).personIds), [c]);

  const candidates = [
    ...owners.map((o) => ({ personId: o.personId, label: o.name, info: `${fmtNumber(o.percent, 1)} % durchgerechnet` })),
    ...c.signatories.filter((s) => !owners.some((o) => o.personId === s.personId)).map((s) => {
      const p = personOf(state, s.personId);
      return { personId: s.personId, label: `${p?.firstName} ${p?.lastName}`, info: s.function };
    }),
  ];

  const relatedPersons = [...new Set([...c.signatories.map((s) => s.personId), ...c.entities.filter((e) => e.personId).map((e) => e.personId!)])].map((id) => personOf(state, id)).filter(Boolean);

  const submit = () => {
    const percent = Number(form.percent.replace(',', '.'));
    if (!addTo || !percent) return;
    if (form.kind === 'company') {
      if (!form.name) return;
      act(addHolding, c.id, addTo, { kind: 'company', name: form.name, country: form.country }, percent);
    } else if (form.personId) {
      act(addHolding, c.id, addTo, { kind: 'person', personId: form.personId }, percent);
    } else {
      if (!form.firstName || !form.lastName || !form.birthDate) return;
      act(addHolding, c.id, addTo, { kind: 'person', person: { firstName: form.firstName, lastName: form.lastName, birthDate: form.birthDate, nationality: form.nationality, domicile: '–', pep: false } }, percent);
    }
    setAddTo(null);
    setForm({ ...form, personId: '', firstName: '', lastName: '', birthDate: '', name: '', percent: '' });
  };

  const loadDemo = async () => {
    setLoadingDemo(true);
    const res = await services.handelsregister.declaredStructure(c.uid);
    if (res) act(loadDeclaredStructure, c.id, res.structure, res.persons);
    setLoadingDemo(false);
  };

  const confirmed = c.controllerIds.length > 0;
  const changed = JSON.stringify([...selected].sort()) !== JSON.stringify([...c.controllerIds].sort());

  return (
    <div className="grid gap-5 2xl:grid-cols-3">
      <Card
        title="Eigentümerstruktur"
        subtitle={`${depth} ${depth === 1 ? 'Ebene' : 'Ebenen'} bis zu den natürlichen Personen${depth > 2 ? ' · komplexe Struktur' : ''}`}
        className="2xl:col-span-2"
        actions={
          editable &&
          c.holdings.length === 0 && (
            <Button variant="secondary" size="sm" onClick={loadDemo} loading={loadingDemo}>
              Angaben Formular K laden <DemoTag />
            </Button>
          )
        }
      >
        <div className="overflow-x-auto pb-2">
          <div className="org min-w-fit py-2">
            <ul>
              <Tree n={tree} root editable={editable} onAdd={setAddTo} onRemove={(h) => act(removeHolding, c.id, h)} suggestedIds={suggestion.fallback ? [] : suggestion.personIds} />
            </ul>
          </div>
        </div>
        {c.holdings.length === 0 && <p className="mt-2 text-center text-sm text-slate-500">Noch keine Beteiligungen erfasst. Über «+ Beteiligung» an der Gesellschaft erfassen.</p>}
      </Card>

      <Card title={c.formType === 'A' ? 'Wirtschaftlich Berechtigte (Formular A)' : 'Kontrollinhaber (Formular K)'} subtitle="Vorschlag der App – Bestätigung durch Kundenberater/in">
        {suggestion.fallback ? (
          <InfoBox tone="amber" title="Keine Person mit 25 % oder mehr">
            Gemäss Art. 2a Abs. 3 GwG gilt ersatzweise die Person, die die Gesellschaft auf andere Weise kontrolliert, sonst die geschäftsführende Person. Vorschlag: {suggestion.personIds.map((id) => `${personOf(state, id)?.firstName} ${personOf(state, id)?.lastName}`).join(', ') || '–'}.
          </InfoBox>
        ) : (
          <InfoBox>Personen mit einer durchgerechneten Beteiligung ab 25 % werden automatisch als Kontrollinhaber vorgeschlagen.</InfoBox>
        )}
        <ul className="mt-3 divide-y divide-slate-100 rounded-md border border-slate-200">
          {candidates.length === 0 && <li className="px-3 py-3 text-sm text-slate-500">Keine Personen erfasst.</li>}
          {candidates.map((cand) => (
            <li key={cand.personId}>
              <label className="flex cursor-pointer items-center gap-3 px-3 py-2">
                <input
                  type="checkbox"
                  disabled={!editable}
                  checked={selected.includes(cand.personId)}
                  onChange={(e) => setSelected(e.target.checked ? [...selected, cand.personId] : selected.filter((x) => x !== cand.personId))}
                  className="size-4 accent-brand-700"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-900">{cand.label}</span>
                  <span className="block text-xs text-slate-500">{cand.info}</span>
                </span>
                {suggestion.personIds.includes(cand.personId) && <Badge tone="green">Vorschlag</Badge>}
                {personOf(state, cand.personId)?.pep && <Badge tone="red">PEP</Badge>}
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">{confirmed ? `Bestätigt: ${c.controllerIds.length} Person(en)` : 'Noch nicht bestätigt'}</span>
          {editable && (
            <Button size="sm" onClick={() => act(setControllers, c.id, selected)} disabled={selected.length === 0 || (confirmed && !changed)}>
              {confirmed ? 'Änderung bestätigen' : 'Bestätigen'}
            </Button>
          )}
        </div>
      </Card>

      <Modal
        open={addTo !== null}
        onClose={() => setAddTo(null)}
        title={`Beteiligung an «${c.entities.find((e) => e.id === addTo)?.name ?? ''}» erfassen`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddTo(null)}>
              Abbrechen
            </Button>
            <Button onClick={submit}>Erfassen</Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex gap-2">
            {(['person', 'company'] as const).map((k) => (
              <Button key={k} variant={form.kind === k ? 'primary' : 'secondary'} size="sm" onClick={() => setForm({ ...form, kind: k })}>
                {k === 'person' ? 'Natürliche Person' : 'Gesellschaft'}
              </Button>
            ))}
          </div>
          {form.kind === 'company' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Firma">
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z. B. Muster Holding AG" />
              </Field>
              <Field label="Sitzland">
                <Select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}>
                  {Object.keys(COUNTRY).map((code) => (
                    <option key={code} value={code}>
                      {countryName(code)}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Bestehende Person" className="sm:col-span-2">
                <Select value={form.personId} onChange={(e) => setForm({ ...form, personId: e.target.value })}>
                  <option value="">Neue Person erfassen …</option>
                  {relatedPersons.map((p) => (
                    <option key={p!.id} value={p!.id}>
                      {p!.firstName} {p!.lastName}
                    </option>
                  ))}
                </Select>
              </Field>
              {!form.personId && (
                <>
                  <Field label="Vorname">
                    <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </Field>
                  <Field label="Name">
                    <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </Field>
                  <Field label="Geburtsdatum">
                    <Input type="date" value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </Field>
                  <Field label="Nationalität">
                    <Select value={form.nationality} onChange={(e) => setForm({ ...form, nationality: e.target.value })}>
                      {Object.keys(COUNTRY).map((code) => (
                        <option key={code} value={code}>
                          {countryName(code)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </>
              )}
            </div>
          )}
          <Field label="Beteiligung in %">
            <Input inputMode="decimal" value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} placeholder="z. B. 40" className="w-32" />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
