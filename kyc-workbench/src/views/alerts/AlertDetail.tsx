import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Flag, Paperclip, Save, Send, ShieldAlert, X } from 'lucide-react';
import { useStore } from '../../store';
import { closeAlert, decideEscalation, escalateAlert, saveAlertWork, saveMros, takeAlert, type AlertWork } from '../../lib/actions';
import { questionsFor } from '../../lib/alertQuestions';
import { SCENARIO_LABEL, SCENARIO_RULE } from '../../lib/catalog';
import { can, checkJustification } from '../../lib/domain';
import { countryName, daysBetween, deadlineAmpel, fmtChf, fmtChfShort, fmtDate, fmtDateTime, fmtRemaining, isoWeek, nowIso } from '../../lib/format';
import { customerOf } from '../../lib/selectors';
import { userName } from '../../data/users';
import type { Alert, Answer, MrosDraft } from '../../types';
import { href } from '../../router';
import { AmpelDot, Badge, Button, Card, cx, DemoTag, Empty, Field, InfoBox, Modal, PageHeader, RiskBadge, Select, Textarea } from '../../components/ui';
import { AlertStatusBadge, OutcomeBadge, PriorityBadge } from '../../components/status';
import { History } from '../../components/History';
import { UploadButton } from '../onboarding/DocumentsTab';

const SERIES = { eingang: '#2a78d6', ausgang: '#eb6834' };

function TransactionsPanel({ alert }: { alert: Alert }) {
  const { state } = useStore();
  const txs = useMemo(
    () => state.transactions.filter((t) => t.customerId === alert.customerId && daysBetween(t.date, alert.triggeredAt) <= 90 && daysBetween(t.date, alert.triggeredAt) >= -2).sort((a, b) => b.date.localeCompare(a.date)),
    [state.transactions, alert],
  );
  const trigger = state.transactions.find((t) => t.id === alert.triggerTxId);
  const related = new Set(txs.filter((t) => t.id.startsWith(alert.triggerTxId)).map((t) => t.id));
  const weeks = useMemo(() => {
    const map = new Map<string, { name: string; key: number; Eingang: number; Ausgang: number }>();
    for (let i = 12; i >= 0; i--) {
      const d = new Date(new Date(alert.triggeredAt).getTime() - i * 7 * 86_400_000);
      const k = `${d.getFullYear()}-${isoWeek(d)}`;
      map.set(k, { name: `KW ${isoWeek(d)}`, key: 12 - i, Eingang: 0, Ausgang: 0 });
    }
    for (const t of txs) {
      const d = new Date(t.date);
      const row = map.get(`${d.getFullYear()}-${isoWeek(d)}`);
      if (row) row[t.direction === 'eingang' ? 'Eingang' : 'Ausgang'] += t.amount;
    }
    return [...map.values()];
  }, [txs, alert.triggeredAt]);

  return (
    <Card title="Transaktionen" subtitle="Auslösende Transaktion und letzte 90 Tage" padded={false}>
      {trigger && (
        <div className="m-3 rounded-md border border-red-200 bg-red-50 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-red-800">Auslösende Transaktion</div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold tabular text-slate-900">{fmtChf(trigger.amount)}</span>
            <span className="text-xs text-slate-600">{fmtDateTime(trigger.date)}</span>
          </div>
          <div className="text-sm text-slate-700">
            {trigger.direction === 'eingang' ? 'Eingang' : 'Ausgang'} · {trigger.type} · {trigger.counterparty} ({countryName(trigger.counterpartyCountry)})
          </div>
          <div className="mt-1 text-xs text-slate-500">Regel: {SCENARIO_RULE[alert.scenario]}</div>
        </div>
      )}
      <div className="h-40 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={weeks} margin={{ top: 4, right: 8, bottom: 0, left: -4 }} barGap={2}>
            <CartesianGrid stroke="#eef1f5" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} interval={2} />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)} Mio.` : `${Math.round(v / 1000)}k`)} width={52} />
            <Tooltip formatter={(v, n) => [fmtChfShort(Number(v)), n]} cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Eingang" fill={SERIES.eingang} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Ausgang" fill={SERIES.ausgang} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 max-h-[420px] overflow-y-auto border-t border-slate-100">
        <table className="min-w-full text-[13px]">
          <tbody className="divide-y divide-slate-100">
            {txs.map((t) => (
              <tr key={t.id} className={cx(related.has(t.id) && 'bg-red-50/70')}>
                <td className="whitespace-nowrap px-3 py-1.5 tabular text-slate-500">{fmtDate(t.date)}</td>
                <td className="px-2 py-1.5">
                  <div className="text-slate-800">{t.counterparty}</div>
                  <div className="text-[11px] text-slate-500">
                    {t.type}
                    {t.counterpartyCountry !== 'CH' && ` · ${countryName(t.counterpartyCountry)}`}
                  </div>
                </td>
                <td className={cx('whitespace-nowrap px-3 py-1.5 text-right tabular', t.direction === 'eingang' ? 'text-slate-900' : 'text-slate-600')}>
                  {t.direction === 'eingang' ? '+' : '−'} {fmtChf(t.amount).replace('CHF ', '')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ProfilePanel({ alert }: { alert: Alert }) {
  const { state } = useStore();
  const c = customerOf(state, alert.customerId)!;
  const vol90 = state.transactions.filter((t) => t.customerId === c.id && daysBetween(t.date, nowIso()) <= 90).reduce((s, t) => s + t.amount, 0);
  const pct = c.expectedVolume ? (vol90 / (c.expectedVolume / 4)) * 100 : 0;
  const others = state.alerts.filter((a) => a.customerId === c.id && a.id !== alert.id);
  return (
    <Card title="KYC-Profil des Kunden">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-base font-semibold text-slate-900">{c.name}</div>
          <div className="text-xs text-slate-500">
            {c.uid} · {c.legalForm} · {c.seat}
          </div>
        </div>
        <RiskBadge level={c.riskLevel} score={c.riskScore} />
      </div>
      <dl className="mt-4 space-y-2.5 text-sm">
        {[
          ['Zweck der Geschäftsbeziehung', c.relationshipPurpose],
          ['Branche', `${c.industry}${c.cashIntensive ? ' (bargeldintensiv)' : ''}`],
          ['Erwartetes Volumen', `${fmtChfShort(c.expectedVolume)} p. a.`],
          ['Erwarteter Bargeldanteil', `${c.expectedCashShare} %`],
          ['Herkunft der Vermögenswerte', c.sourceOfFunds],
          ['Kunde seit', fmtDate(c.openedAt)],
          ['Letzte KYC-Überprüfung', fmtDate(c.lastReviewAt)],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 rounded-md bg-slate-50 p-3">
        <div className="text-xs text-slate-500">Ist-Volumen letzte 90 Tage vs. Profil (anteilig)</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="font-semibold tabular text-slate-900">{fmtChfShort(vol90)}</span>
          <span className={cx('text-sm font-medium tabular', pct > 150 ? 'text-red-700' : 'text-slate-600')}>{Math.round(pct)} %</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
          <div className={cx('h-full rounded-full', pct > 150 ? 'bg-red-600' : 'bg-brand-600')} style={{ width: `${Math.min(100, pct / 3)}%` }} />
        </div>
      </div>
      <div className="mt-4">
        <div className="mb-1 text-xs text-slate-500">Weitere Alarme dieses Kunden</div>
        {others.length === 0 ? (
          <div className="text-sm text-slate-500">keine</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {others.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2">
                <a href={href(`/alarme/${a.id}`)} className="whitespace-nowrap text-brand-700 hover:underline">
                  {a.id}
                </a>
                <span className="truncate text-xs text-slate-500">{SCENARIO_LABEL[a.scenario]}</span>
                {a.outcome ? <OutcomeBadge outcome={a.outcome} /> : <AlertStatusBadge status={a.status} />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Segmented({ value, onChange, disabled, risky }: { value?: Answer; onChange: (a: Answer) => void; disabled?: boolean; risky: Answer }) {
  const opts: { v: Answer; l: string }[] = [
    { v: 'ja', l: 'Ja' },
    { v: 'nein', l: 'Nein' },
    { v: 'unklar', l: 'Unklar' },
  ];
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-slate-300">
      {opts.map((o) => (
        <button
          key={o.v}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={cx(
            'px-2.5 py-1 text-xs font-medium transition-colors [&:not(:first-child)]:border-l [&:not(:first-child)]:border-slate-300',
            value === o.v ? (o.v === risky || o.v === 'unklar' ? 'bg-amber-100 text-amber-900' : 'bg-brand-800 text-white') : 'bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

function GuidedReview({ alert }: { alert: Alert }) {
  const { state, act, role, user } = useStore();
  const questions = questionsFor(alert.scenario);
  const [w, setW] = useState<AlertWork>({ answers: alert.answers, justification: alert.justification, evidence: alert.evidence, noEvidenceReason: alert.noEvidenceReason });
  useEffect(() => setW({ answers: alert.answers, justification: alert.justification, evidence: alert.evidence, noEvidenceReason: alert.noEvidenceReason }), [alert.id, alert.status]);
  const [touched, setTouched] = useState(false);
  const [escalate, setEscalate] = useState<null | 'eskalation' | 'mros'>(null);
  const [createReview, setCreateReview] = useState(true);

  const mayWork = can(role, 'alert.work') && (alert.status === 'offen' || alert.status === 'in_bearbeitung');
  const quality = checkJustification(w.justification, state.settings);
  const answered = questions.filter((q) => w.answers[q.id]).length;
  const riskyCount = questions.filter((q) => w.answers[q.id] === q.risky || w.answers[q.id] === 'unklar').length;
  const evidenceOk = Boolean(w.evidence) || w.noEvidenceReason.trim().length >= 20;
  const ready = answered === questions.length && quality.ok && evidenceOk;
  const showQuality = touched || w.justification.length > 0;

  const blockers = [
    answered < questions.length && `${questions.length - answered} Frage(n) unbeantwortet`,
    !quality.ok && 'Begründung ungenügend',
    !evidenceOk && 'Beleg fehlt oder Fehlen nicht begründet',
  ].filter(Boolean) as string[];

  return (
    <Card
      title="Geführte Prüfung"
      subtitle={SCENARIO_LABEL[alert.scenario]}
      actions={
        can(role, 'alert.work') &&
        alert.status === 'offen' &&
        alert.assigneeId !== user.id && (
          <Button size="sm" variant="secondary" onClick={() => act(takeAlert, alert.id)}>
            Übernehmen
          </Button>
        )
      }
    >
      {!can(role, 'alert.work') && alert.status !== 'abgeschlossen' && alert.status !== 'eskaliert' && (
        <div className="mb-3">
          <InfoBox tone="amber">Alarme werden durch Compliance bearbeitet. Bitte Rolle wechseln.</InfoBox>
        </div>
      )}
      <ol className="space-y-3">
        {questions.map((q, i) => (
          <li key={q.id} className="flex flex-col gap-1.5">
            <span className="text-sm text-slate-800">
              <span className="mr-1 text-slate-400">{i + 1}.</span>
              {q.text}
            </span>
            <Segmented value={w.answers[q.id]} disabled={!mayWork} risky={q.risky} onChange={(a) => setW({ ...w, answers: { ...w.answers, [q.id]: a } })} />
          </li>
        ))}
      </ol>
      {riskyCount > 0 && (
        <div className="mt-3">
          <InfoBox tone="amber" title={`${riskyCount} Antwort(en) deuten auf ein erhöhtes Risiko`}>
            Eskalation an die Leitung Compliance prüfen.
          </InfoBox>
        </div>
      )}

      <div className="mt-4">
        <Field label="Begründung" hint={`${quality.length} Zeichen · mindestens ${state.settings.minJustification}`}>
          <Textarea
            value={w.justification}
            disabled={!mayWork}
            onChange={(e) => setW({ ...w, justification: e.target.value })}
            onBlur={() => setTouched(true)}
            rows={5}
            placeholder="Konkrete Angaben: Wer zahlt an wen, wofür, mit welchem Beleg (Rechnungs-/Vertragsnummer, Datum, Betrag)?"
            className={showQuality && !quality.ok ? 'border-red-300' : ''}
          />
        </Field>
        {showQuality && !quality.ok && mayWork && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="size-4" /> Qualitätsprüfung der Begründung
            </div>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[13px]">
              {quality.tooShort && <li>Zu kurz: {quality.length} von mindestens {state.settings.minJustification} Zeichen.</li>}
              {quality.phrasesOnly && (
                <li>
                  Enthält nur Floskeln ({quality.foundPhrases.map((p) => `«${p}»`).join(', ')}) ohne konkrete Angaben. Bitte Gegenpartei, Betrag, Datum oder Belegnummer nennen.
                </li>
              )}
            </ul>
          </div>
        )}
        {showQuality && quality.ok && mayWork && (
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-emerald-700">
            <CheckCircle2 className="size-4" /> Begründung enthält konkrete Angaben.
          </div>
        )}
      </div>

      <div className="mt-4">
        <div className="mb-1 text-[13px] font-medium text-slate-700">Beleg</div>
        {w.evidence ? (
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <Paperclip className="size-4 text-slate-400" />
              {w.evidence}
            </span>
            {mayWork && (
              <button type="button" onClick={() => setW({ ...w, evidence: undefined })} className="rounded p-1 text-slate-400 hover:bg-slate-100" aria-label="Beleg entfernen">
                <X className="size-4" />
              </button>
            )}
          </div>
        ) : mayWork ? (
          <div className="space-y-2">
            <UploadButton label="Beleg anhängen" onFile={(f) => setW({ ...w, evidence: f })} />
            <Textarea rows={2} value={w.noEvidenceReason} onChange={(e) => setW({ ...w, noEvidenceReason: e.target.value })} placeholder="oder: Begründung, weshalb kein Beleg vorliegt (mind. 20 Zeichen)" />
          </div>
        ) : (
          <div className="text-sm text-slate-500">{alert.noEvidenceReason || 'kein Beleg'}</div>
        )}
      </div>

      {mayWork && (
        <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
          {blockers.length > 0 && <p className="text-xs text-slate-500">Noch offen: {blockers.join(' · ')}</p>}
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="secondary" disabled={!ready} onClick={() => act(closeAlert, alert.id, 'falsch_positiv', w)}>
              Abschliessen (falsch positiv)
            </Button>
            <Button variant="secondary" disabled={!ready} onClick={() => act(closeAlert, alert.id, 'plausibilisiert', w)}>
              Abschliessen (plausibilisiert)
            </Button>
            <Button variant="primary" icon={<Flag className="size-4" />} disabled={!ready} onClick={() => setEscalate('eskalation')}>
              Eskalieren an Leitung
            </Button>
            <Button variant="danger" icon={<ShieldAlert className="size-4" />} disabled={!ready} onClick={() => setEscalate('mros')}>
              MROS-Meldung vorbereiten
            </Button>
          </div>
          <Button variant="ghost" size="sm" icon={<Save className="size-4" />} onClick={() => act(saveAlertWork, alert.id, w)}>
            Zwischenspeichern
          </Button>
        </div>
      )}

      <Modal
        open={escalate !== null}
        onClose={() => setEscalate(null)}
        title={escalate === 'mros' ? 'MROS-Meldung vorbereiten' : 'An Leitung Compliance eskalieren'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEscalate(null)}>
              Abbrechen
            </Button>
            <Button
              variant={escalate === 'mros' ? 'danger' : 'primary'}
              onClick={() => {
                act(escalateAlert, alert.id, w, createReview, escalate === 'mros');
                setEscalate(null);
              }}
            >
              {escalate === 'mros' ? 'Entwurf erstellen und eskalieren' : 'Eskalieren'}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            {escalate === 'mros'
              ? 'Es wird ein vorausgefüllter Entwurf der MROS-Meldung erstellt. Über die Meldung entscheidet die Leitung Compliance (Vier-Augen-Prinzip). Es erfolgt kein Versand.'
              : 'Der Alarm geht zum Entscheid an die Leitung Compliance (Vier-Augen-Prinzip).'}
          </p>
          <div className="rounded-md border border-brand-200 bg-brand-50 p-3">
            <div className="font-medium text-brand-900">Vorschlag der App: Risikoeinstufung des Kunden überprüfen</div>
            <p className="mt-0.5 text-[13px] text-brand-900/80">Eine Transaktion mit erhöhten Risiken (TmeR) kann eine Neubeurteilung der Geschäftsbeziehung (GmeR) erfordern.</p>
            <label className="mt-2 flex items-center gap-2">
              <input type="checkbox" checked={createReview} onChange={(e) => setCreateReview(e.target.checked)} className="size-4 accent-brand-700" />
              Aufgabe in «KYC-Überprüfungen» erstellen
            </label>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

function MrosForm({ alert, editable }: { alert: Alert; editable: boolean }) {
  const { act } = useStore();
  const [d, setD] = useState<MrosDraft>(alert.mros!);
  useEffect(() => setD(alert.mros!), [alert.mros]);
  return (
    <Card
      title={
        <span className="flex items-center gap-2">
          Entwurf MROS-Meldung <DemoTag>wird nicht versendet</DemoTag>
        </span>
      }
      subtitle={`Erstellt am ${fmtDateTime(d.createdAt)} durch ${userName(d.createdBy)}`}
    >
      <div className="space-y-3">
        <Field label="Rechtsgrundlage">
          <Select value={d.basis} disabled={!editable} onChange={(e) => setD({ ...d, basis: e.target.value as MrosDraft['basis'] })}>
            <option>Art. 9 GwG (Meldepflicht)</option>
            <option>Art. 305ter Abs. 2 StGB (Melderecht)</option>
          </Select>
        </Field>
        <Field label="Sachverhalt">
          <Textarea rows={6} value={d.facts} disabled={!editable} onChange={(e) => setD({ ...d, facts: e.target.value })} />
        </Field>
        <Field label="Verdachtsmomente">
          <Textarea rows={3} value={d.suspicion} disabled={!editable} onChange={(e) => setD({ ...d, suspicion: e.target.value })} />
        </Field>
        <Field label="Getroffene Massnahmen">
          <Textarea rows={3} value={d.measures} disabled={!editable} onChange={(e) => setD({ ...d, measures: e.target.value })} />
        </Field>
        {editable && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" icon={<Save className="size-4" />} onClick={() => act(saveMros, alert.id, d, false)}>
              Entwurf speichern
            </Button>
            <Button variant="danger" icon={<Send className="size-4" />} onClick={() => act(saveMros, alert.id, d, true)}>
              Meldung abschliessen (Demo, kein Versand)
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

function EscalationPanel({ alert }: { alert: Alert }) {
  const { act, role, user } = useStore();
  const [note, setNote] = useState('');
  const e = alert.escalation!;
  const mayDecide = can(role, 'alert.decideEscalation') && alert.status === 'eskaliert' && !e.decision;
  return (
    <Card title="Eskalation" subtitle={`Eskaliert am ${fmtDateTime(e.at)} durch ${userName(e.by)}`}>
      <p className="whitespace-pre-line text-sm text-slate-700">{e.note}</p>
      {e.decision && (
        <div className="mt-3">
          <InfoBox tone={e.decision === 'mros' ? 'red' : 'green'} title={`Entscheid Leitung: ${e.decision === 'mros' ? 'MROS-Meldung' : 'ohne Meldung abschliessen'}`}>
            {e.decisionNote} – {userName(e.decidedBy)}, {fmtDateTime(e.decidedAt)}
          </InfoBox>
        </div>
      )}
      {mayDecide &&
        (e.by === user.id ? (
          <div className="mt-3">
            <InfoBox tone="red">Vier-Augen-Prinzip: Über Ihre eigene Eskalation entscheidet eine andere Person.</InfoBox>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <Textarea rows={3} value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="Begründung des Entscheids (mind. 20 Zeichen)" />
            <div className="flex flex-wrap gap-2">
              <Button variant="danger" icon={<ShieldAlert className="size-4" />} disabled={note.trim().length < 20} onClick={() => act(decideEscalation, alert.id, 'mros', note)}>
                MROS-Meldung vorbereiten
              </Button>
              <Button variant="secondary" disabled={note.trim().length < 20} onClick={() => act(decideEscalation, alert.id, 'abgeschlossen', note)}>
                Ohne Meldung abschliessen
              </Button>
            </div>
          </div>
        ))}
      {!can(role, 'alert.decideEscalation') && alert.status === 'eskaliert' && <p className="mt-3 text-sm text-slate-500">Wartet auf Entscheid der Leitung Compliance.</p>}
    </Card>
  );
}

export function AlertDetail({ alertId }: { alertId: string }) {
  const { state, role } = useStore();
  const alert = state.alerts.find((a) => a.id === alertId);
  if (!alert) return <Empty>Alarm nicht gefunden.</Empty>;
  const c = customerOf(state, alert.customerId)!;
  const active = alert.status === 'offen' || alert.status === 'in_bearbeitung';
  const linkedReview = state.reviews.find((r) => state.events.some((e) => r.eventIds.includes(e.id) && e.source.includes(alert.id)));

  return (
    <>
      <PageHeader
        back={
          <a href={href('/alarme')} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            <ArrowLeft className="size-3.5" /> Alarm-Warteschlange
          </a>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {alert.id} · {c.name} <PriorityBadge priority={alert.priority} /> {alert.outcome ? <OutcomeBadge outcome={alert.outcome} /> : <AlertStatusBadge status={alert.status} />}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {SCENARIO_LABEL[alert.scenario]} · {fmtChf(alert.amount)} · ausgelöst {fmtDateTime(alert.triggeredAt)}
            </span>
            {active && <AmpelDot value={deadlineAmpel(alert.triggeredAt, alert.dueAt)} text={`Frist ${fmtDate(alert.dueAt)} · ${fmtRemaining(alert.dueAt)}`} />}
            <span>Bearbeitung: {userName(alert.assigneeId)}</span>
          </span>
        }
      />
      {linkedReview && (
        <div className="mb-4">
          <InfoBox title="Rückkopplung an KYC-Überprüfung">
            Für diesen Kunden wurde die Überprüfung{' '}
            <a className="font-medium underline" href={href(`/kyc/${linkedReview.id}`)}>
              {linkedReview.number}
            </a>{' '}
            erstellt (Risikoeinstufung überprüfen, TmeR → GmeR).
          </InfoBox>
        </div>
      )}
      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr_1.1fr]">
        <TransactionsPanel alert={alert} />
        <ProfilePanel alert={alert} />
        <div className="space-y-5">
          {alert.status === 'abgeschlossen' && (
            <Card title="Ergebnis">
              <div className="flex items-center gap-2">
                <OutcomeBadge outcome={alert.outcome!} />
                <span className="text-sm text-slate-500">
                  {fmtDateTime(alert.closedAt)} · {userName(alert.closedBy)}
                </span>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm text-slate-700">{alert.justification}</p>
              {alert.evidence && (
                <div className="mt-2 inline-flex items-center gap-1.5 text-sm text-slate-600">
                  <FileText className="size-4" /> {alert.evidence}
                </div>
              )}
            </Card>
          )}
          {alert.escalation && <EscalationPanel alert={alert} />}
          {alert.mros && <MrosForm alert={alert} editable={can(role, 'alert.decideEscalation') && alert.status === 'eskaliert'} />}
          {active && <GuidedReview alert={alert} />}
          {alert.status !== 'offen' && !active && Object.keys(alert.answers).length > 0 && (
            <Card title="Antworten der Prüfung">
              <ul className="space-y-1.5 text-sm">
                {questionsFor(alert.scenario).map((q) => (
                  <li key={q.id} className="flex justify-between gap-3">
                    <span className="text-slate-700">{q.text}</span>
                    <Badge tone={alert.answers[q.id] === q.risky || alert.answers[q.id] === 'unklar' ? 'amber' : 'neutral'}>{alert.answers[q.id] ?? '–'}</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <Card title="Verlauf">
            <History objectIds={[alert.id]} limit={10} />
          </Card>
        </div>
      </div>
    </>
  );
}

