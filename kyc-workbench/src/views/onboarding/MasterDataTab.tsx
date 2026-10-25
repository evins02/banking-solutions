import { useEffect, useState, type ReactNode } from 'react';
import { UserPlus } from 'lucide-react';
import { useStore } from '../../store';
import { addSignatory, updateCustomer } from '../../lib/actions';
import { CANTONS, INDUSTRIES, LEGAL_FORMS } from '../../lib/catalog';
import { COUNTRY, countryName, fmtChfShort, fmtDate, fmtNumber } from '../../lib/format';
import { personOf } from '../../lib/selectors';
import type { Customer, SignatureKind, SourceOfFunds } from '../../types';
import { Badge, Button, Card, Field, FromRegister, Input, Modal, Select, Table, td, Textarea, th } from '../../components/ui';

const SOURCES: SourceOfFunds[] = ['Geschäftstätigkeit', 'Beteiligungsverkauf', 'Erbschaft / Schenkung', 'Kapitalerhöhung Muttergesellschaft', 'Nicht belegt'];

/** Feld, das beim Verlassen speichert (ein Audit-Eintrag pro Änderung) */
function EditField({
  c,
  k,
  label,
  editable,
  type = 'text',
  options,
  format,
  multiline,
  hint,
  className,
}: {
  c: Customer;
  k: keyof Customer;
  label: string;
  editable: boolean;
  type?: 'text' | 'number' | 'date';
  options?: { value: string; label: string }[];
  format?: (v: unknown) => ReactNode;
  multiline?: boolean;
  hint?: string;
  className?: string;
}) {
  const { act } = useStore();
  const raw = c[k];
  const initial = type === 'date' && typeof raw === 'string' ? raw.slice(0, 10) : String(raw ?? '');
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  const marker = c.prefilled.includes(k) ? <FromRegister /> : null;
  const save = (value = v) => {
    if (value === initial) return;
    const parsed = type === 'number' ? Number(value.replace(/[^\d.]/g, '')) || 0 : value;
    act(updateCustomer, c.id, { [k]: parsed } as Partial<Customer>);
  };
  if (!editable) {
    return (
      <Field label={label} marker={marker} className={className}>
        <div className="min-h-9 py-1.5 text-sm text-slate-900">{format ? format(raw) : type === 'date' ? fmtDate(String(raw)) : String(raw || '–')}</div>
      </Field>
    );
  }
  return (
    <Field label={label} marker={marker} hint={hint} className={className}>
      {options ? (
        <Select
          value={v}
          onChange={(e) => {
            setV(e.target.value);
            save(e.target.value);
          }}
        >
          {!options.some((o) => o.value === v) && <option value="">Bitte wählen</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      ) : multiline ? (
        <Textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={() => save()} rows={2} />
      ) : (
        <Input type={type === 'number' ? 'text' : type} inputMode={type === 'number' ? 'numeric' : undefined} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => save()} />
      )}
    </Field>
  );
}

export function MasterDataTab({ c, editable }: { c: Customer; editable: boolean }) {
  const { state, act } = useStore();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', birthDate: '', nationality: 'CH', domicile: '', fn: 'Mitglied des Verwaltungsrates', signature: 'Kollektivunterschrift zu zweien' as SignatureKind });
  const countries = Object.keys(COUNTRY).map((code) => ({ value: code, label: countryName(code) }));

  const submitSignatory = () => {
    if (!form.firstName || !form.lastName || !form.birthDate) return;
    act(addSignatory, c.id, { firstName: form.firstName, lastName: form.lastName, birthDate: form.birthDate, nationality: form.nationality, domicile: form.domicile || '–', pep: false }, form.fn, form.signature);
    setAdding(false);
  };

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Stammdaten" subtitle="Vorbefüllt aus dem Handelsregister (Demo); Änderungen werden protokolliert">
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <EditField c={c} k="name" label="Firma" editable={editable} className="sm:col-span-2" />
          <Field label="UID-Nummer" marker={c.prefilled.includes('uid') ? <FromRegister /> : null}>
            <div className="py-1.5 text-sm text-slate-900">{c.uid}</div>
          </Field>
          <EditField c={c} k="legalForm" label="Rechtsform" editable={editable} options={LEGAL_FORMS.map((f) => ({ value: f, label: f }))} />
          <EditField c={c} k="street" label="Adresse" editable={editable} />
          <EditField c={c} k="seat" label="Sitz" editable={editable} />
          <EditField c={c} k="canton" label="Kanton" editable={editable} options={CANTONS.map((x) => ({ value: x, label: x }))} />
          <EditField c={c} k="country" label="Domizil" editable={editable} options={countries} format={(v) => countryName(String(v))} />
          <EditField c={c} k="foundedAt" label="Gründungsdatum" editable={editable} type="date" />
          {(c.legalForm === 'Verein' || c.legalForm === 'Stiftung') && (
            <EditField
              c={c}
              k="formType"
              label="Formular"
              editable={editable}
              options={[
                { value: 'K', label: 'Formular K (Kontrollinhaber)' },
                { value: 'A', label: 'Formular A (wirtschaftlich Berechtigte)' },
              ]}
              format={(v) => (v === 'A' ? 'Formular A' : 'Formular K')}
              hint="je nach Fall; bestimmt die Unterlagen-Checkliste"
            />
          )}
          <EditField c={c} k="purpose" label="Zweck" editable={editable} multiline className="sm:col-span-2" />
        </div>
      </Card>

      <Card title="Geschäftsprofil (KYC)" subtitle="Grundlage für Risikoeinstufung und Transaktionsüberwachung">
        <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2">
          <Field label="Branche">
            {editable ? (
              <Select
                value={c.industry}
                onChange={(e) => {
                  const ind = INDUSTRIES.find((i) => i.name === e.target.value);
                  act(updateCustomer, c.id, { industry: e.target.value, cashIntensive: ind?.cashIntensive ?? false });
                }}
              >
                {!c.industry && <option value="">Bitte wählen</option>}
                {INDUSTRIES.map((i) => (
                  <option key={i.name} value={i.name}>
                    {i.name}
                    {i.cashIntensive ? ' (bargeldintensiv)' : ''}
                  </option>
                ))}
              </Select>
            ) : (
              <div className="py-1.5 text-sm text-slate-900">
                {c.industry || '–'} {c.cashIntensive && <Badge tone="amber">bargeldintensiv</Badge>}
              </div>
            )}
          </Field>
          <EditField c={c} k="sourceOfFunds" label="Herkunft der Vermögenswerte" editable={editable} options={SOURCES.map((s) => ({ value: s, label: s }))} />
          <EditField c={c} k="relationshipPurpose" label="Zweck der Geschäftsbeziehung" editable={editable} className="sm:col-span-2" />
          <EditField c={c} k="expectedVolume" label="Erwartetes Volumen pro Jahr (CHF)" editable={editable} type="number" format={(v) => fmtChfShort(Number(v))} hint={editable && c.expectedVolume ? fmtChfShort(c.expectedVolume) : undefined} />
          <EditField c={c} k="expectedCashShare" label="Erwarteter Bargeldanteil (%)" editable={editable} type="number" format={(v) => `${fmtNumber(Number(v))} %`} />
        </div>
      </Card>

      <Card
        title="Zeichnungsberechtigte"
        className="xl:col-span-2"
        padded={false}
        actions={
          editable && (
            <Button variant="secondary" size="sm" icon={<UserPlus className="size-4" />} onClick={() => setAdding(true)}>
              Person erfassen
            </Button>
          )
        }
      >
        <Table>
          <thead className="bg-slate-50/60">
            <tr>
              <th className={th}>Name</th>
              <th className={th}>Funktion</th>
              <th className={th}>Art der Zeichnung</th>
              <th className={th}>Geburtsdatum</th>
              <th className={th}>Nationalität</th>
              <th className={th}>Quelle</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {c.signatories.map((s) => {
              const p = personOf(state, s.personId);
              return (
                <tr key={s.personId}>
                  <td className={td}>
                    <span className="font-medium text-slate-900">
                      {p?.firstName} {p?.lastName}
                    </span>
                    {p?.pep && (
                      <Badge tone="red" className="ml-2" title={p.pepDetail}>
                        PEP
                      </Badge>
                    )}
                  </td>
                  <td className={td}>{s.function}</td>
                  <td className={td}>{s.signature}</td>
                  <td className={`${td} tabular`}>{fmtDate(p?.birthDate)}</td>
                  <td className={td}>{p ? countryName(p.nationality) : '–'}</td>
                  <td className={td}>{s.fromRegister ? <FromRegister /> : <Badge>manuell erfasst</Badge>}</td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>

      <Modal
        open={adding}
        onClose={() => setAdding(false)}
        title="Zeichnungsberechtigte Person erfassen"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdding(false)}>
              Abbrechen
            </Button>
            <Button onClick={submitSignatory} disabled={!form.firstName || !form.lastName || !form.birthDate}>
              Erfassen
            </Button>
          </>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2">
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
              {countries.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Wohnort" className="sm:col-span-2">
            <Input value={form.domicile} onChange={(e) => setForm({ ...form, domicile: e.target.value })} placeholder="Ort, Land" />
          </Field>
          <Field label="Funktion">
            <Input value={form.fn} onChange={(e) => setForm({ ...form, fn: e.target.value })} />
          </Field>
          <Field label="Art der Zeichnung">
            <Select value={form.signature} onChange={(e) => setForm({ ...form, signature: e.target.value as SignatureKind })}>
              <option>Einzelunterschrift</option>
              <option>Kollektivunterschrift zu zweien</option>
              <option>Prokura kollektiv zu zweien</option>
            </Select>
          </Field>
        </div>
        <p className="mt-3 text-xs text-slate-500">Hinweis: Für die Person wird automatisch ein Ausweis in der Unterlagen-Checkliste verlangt (AG/GmbH).</p>
      </Modal>
    </div>
  );
}
