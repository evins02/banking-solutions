import { useEffect, useState } from 'react';
import { Plus, RotateCcw, Save, X } from 'lucide-react';
import { useStore } from '../store';
import { updateSettings } from '../lib/actions';
import { can } from '../lib/domain';
import { POINT_LABEL } from '../data/settings';
import { PRIORITY_LABEL } from '../lib/catalog';
import type { Priority, Settings } from '../types';
import { Badge, Button, Card, Field, InfoBox, Input, Modal, PageHeader, Select, Table, td, th } from '../components/ui';

/** Ermittelt die geänderten Einstellungen für den Audit-Trail */
function diff(a: Settings, b: Settings) {
  const out: { label: string; oldValue: string; newValue: string }[] = [];
  b.criteria.forEach((c, i) => {
    const o = a.criteria[i];
    if (o.enabled !== c.enabled) out.push({ label: `Kriterium «${c.label}»`, oldValue: o.enabled ? 'aktiv' : 'inaktiv', newValue: c.enabled ? 'aktiv' : 'inaktiv' });
    for (const k of Object.keys(c.points)) if (o.points[k] !== c.points[k]) out.push({ label: `«${c.label}» – ${POINT_LABEL[k] ?? k}`, oldValue: `${o.points[k]} Pkt.`, newValue: `${c.points[k]} Pkt.` });
  });
  if (a.gmerThreshold !== b.gmerThreshold) out.push({ label: 'Schwelle GmeR', oldValue: `${a.gmerThreshold} Pkt.`, newValue: `${b.gmerThreshold} Pkt.` });
  if (a.reviewYears.gmer !== b.reviewYears.gmer) out.push({ label: 'Intervall GmeR', oldValue: `${a.reviewYears.gmer} J.`, newValue: `${b.reviewYears.gmer} J.` });
  if (a.reviewYears.normal !== b.reviewYears.normal) out.push({ label: 'Intervall normales Risiko', oldValue: `${a.reviewYears.normal} J.`, newValue: `${b.reviewYears.normal} J.` });
  (Object.keys(b.slaDays) as Priority[]).forEach((p) => a.slaDays[p] !== b.slaDays[p] && out.push({ label: `Bearbeitungsfrist ${PRIORITY_LABEL[p]}`, oldValue: `${a.slaDays[p]} T`, newValue: `${b.slaDays[p]} T` }));
  if (a.minJustification !== b.minJustification) out.push({ label: 'Mindestlänge Begründung', oldValue: `${a.minJustification}`, newValue: `${b.minJustification}` });
  if (a.volumeDeviationPct !== b.volumeDeviationPct) out.push({ label: 'Schwelle Volumenabweichung', oldValue: `${a.volumeDeviationPct} %`, newValue: `${b.volumeDeviationPct} %` });
  if (a.phrases.join('|') !== b.phrases.join('|')) out.push({ label: 'Floskel-Liste', oldValue: a.phrases.join(', '), newValue: b.phrases.join(', ') });
  return out;
}

const num = (v: string) => Math.max(0, Number(v) || 0);

export function SettingsPage() {
  const { state, actOk, role, reset, toast } = useStore();
  const [s, setS] = useState<Settings>(state.settings);
  const [phrase, setPhrase] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => setS(state.settings), [state.settings]);
  const editable = can(role, 'settings.edit');
  const changes = diff(state.settings, s);

  const save = () => {
    if (actOk(updateSettings, s, changes)) toast(`${changes.length} Einstellung(en) gespeichert und protokolliert.`);
  };

  return (
    <>
      <PageHeader
        title="Einstellungen"
        subtitle="Risikokriterien, Überprüfungsintervalle und Prüfregeln"
        actions={
          editable && (
            <>
              {changes.length > 0 && <Badge tone="amber">{changes.length} ungespeichert</Badge>}
              <Button variant="secondary" onClick={() => setS(state.settings)} disabled={!changes.length}>
                Verwerfen
              </Button>
              <Button icon={<Save className="size-4" />} onClick={save} disabled={!changes.length}>
                Speichern
              </Button>
            </>
          )
        }
      />
      {!editable && (
        <div className="mb-4">
          <InfoBox tone="amber" title="Nur lesen">
            Die Konfiguration ändert die Leitung Compliance. Bitte Rolle wechseln, um Werte anzupassen.
          </InfoBox>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <Card title="Risikokriterien (Punktemodell)" subtitle="Punkte je Ausprägung; Ergebnis ab Schwelle = GmeR" className="xl:col-span-2" padded={false}>
          <Table>
            <thead className="bg-slate-50/60">
              <tr>
                <th className={th}>Aktiv</th>
                <th className={th}>Kriterium</th>
                <th className={th}>Punkte je Ausprägung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {s.criteria.map((c, i) => (
                <tr key={c.id} className={c.enabled ? '' : 'opacity-60'}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-700"
                      disabled={!editable}
                      checked={c.enabled}
                      onChange={(e) => setS({ ...s, criteria: s.criteria.map((x, j) => (j === i ? { ...x, enabled: e.target.checked } : x)) })}
                    />
                  </td>
                  <td className={td}>
                    <div className="font-medium text-slate-900">{c.label}</div>
                    <div className="text-xs text-slate-500">{c.description}</div>
                  </td>
                  <td className={td}>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(c.points).map(([k, v]) => (
                        <label key={k} className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-xs text-slate-600">
                          {POINT_LABEL[k] ?? k}
                          <input
                            type="number"
                            min={0}
                            disabled={!editable}
                            value={v}
                            onChange={(e) => setS({ ...s, criteria: s.criteria.map((x, j) => (j === i ? { ...x, points: { ...x.points, [k]: num(e.target.value) } } : x)) })}
                            className="w-12 rounded border border-slate-300 bg-white px-1 py-0.5 text-right text-sm tabular text-slate-900"
                          />
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
          <div className="flex flex-wrap items-end gap-4 border-t border-slate-100 p-4">
            <Field label="Schwelle GmeR (Punkte)" hint="Ausländische PEP gelten unabhängig von der Punktzahl als GmeR.">
              <Input type="number" min={1} disabled={!editable} value={s.gmerThreshold} onChange={(e) => setS({ ...s, gmerThreshold: num(e.target.value) })} className="w-28" />
            </Field>
          </div>
        </Card>

        <div className="space-y-5">
          <Card title="Intervalle periodische Überprüfung">
            <div className="grid grid-cols-2 gap-3">
              <Field label="GmeR">
                <Select disabled={!editable} value={s.reviewYears.gmer} onChange={(e) => setS({ ...s, reviewYears: { ...s.reviewYears, gmer: Number(e.target.value) } })}>
                  <option value={1}>jährlich</option>
                  <option value={2}>alle 2 Jahre</option>
                </Select>
              </Field>
              <Field label="Normales Risiko">
                <Select disabled={!editable} value={s.reviewYears.normal} onChange={(e) => setS({ ...s, reviewYears: { ...s.reviewYears, normal: Number(e.target.value) } })}>
                  <option value={3}>alle 3 Jahre</option>
                  <option value={4}>alle 4 Jahre</option>
                  <option value={5}>alle 5 Jahre</option>
                </Select>
              </Field>
            </div>
            <p className="mt-2 text-xs text-slate-500">Gilt für neu abgeschlossene Überprüfungen und Eröffnungen.</p>
          </Card>
          <Card title="Bearbeitungsfristen Alarme">
            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(s.slaDays) as Priority[]).map((p) => (
                <Field key={p} label={`${PRIORITY_LABEL[p]} (Tage)`}>
                  <Input type="number" min={1} disabled={!editable} value={s.slaDays[p]} onChange={(e) => setS({ ...s, slaDays: { ...s.slaDays, [p]: num(e.target.value) } })} />
                </Field>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">Gilt für neu eingehende Alarme.</p>
          </Card>
          <Card title="Laufendes KYC">
            <Field label="Schwelle Volumenabweichung (% des Profils)" hint="Ist-Volumen der letzten 90 Tage gegenüber dem anteiligen erwarteten Volumen">
              <Input type="number" min={100} disabled={!editable} value={s.volumeDeviationPct} onChange={(e) => setS({ ...s, volumeDeviationPct: num(e.target.value) })} className="w-28" />
            </Field>
          </Card>
        </div>

        <Card title="Qualitätsprüfung der Begründung (Alarme)" className="xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Mindestlänge (Zeichen)">
              <Input type="number" min={20} disabled={!editable} value={s.minJustification} onChange={(e) => setS({ ...s, minJustification: num(e.target.value) })} className="w-28" />
            </Field>
            <div className="md:col-span-2">
              <div className="mb-1 text-[13px] font-medium text-slate-700">Floskeln ohne konkrete Angaben</div>
              <div className="flex flex-wrap gap-1.5">
                {s.phrases.map((p) => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                    «{p}»
                    {editable && (
                      <button type="button" onClick={() => setS({ ...s, phrases: s.phrases.filter((x) => x !== p) })} className="text-slate-400 hover:text-red-700" aria-label={`${p} entfernen`}>
                        <X className="size-3" />
                      </button>
                    )}
                  </span>
                ))}
              </div>
              {editable && (
                <form
                  className="mt-2 flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    const v = phrase.trim().toLowerCase();
                    if (v && !s.phrases.includes(v)) setS({ ...s, phrases: [...s.phrases, v] });
                    setPhrase('');
                  }}
                >
                  <Input value={phrase} onChange={(e) => setPhrase(e.target.value)} placeholder="Neue Floskel" className="max-w-xs" />
                  <Button type="submit" variant="secondary" icon={<Plus className="size-4" />}>
                    Hinzufügen
                  </Button>
                </form>
              )}
            </div>
          </div>
        </Card>

        <Card title="Demo">
          <p className="text-sm text-slate-600">Setzt alle fiktiven Testdaten auf den Ausgangszustand zurück. Nur im Prototyp vorhanden – auch der Audit-Trail beginnt neu.</p>
          <Button className="mt-3" variant="danger" icon={<RotateCcw className="size-4" />} onClick={() => setConfirmReset(true)}>
            Demo-Daten zurücksetzen
          </Button>
        </Card>
      </div>

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title="Demo-Daten zurücksetzen?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                reset();
                setConfirmReset(false);
                toast('Testdaten neu geladen.', 'info');
              }}
            >
              Zurücksetzen
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">Alle Änderungen dieser Demo gehen verloren. In einem produktiven System gäbe es diese Funktion nicht.</p>
      </Modal>
    </>
  );
}
