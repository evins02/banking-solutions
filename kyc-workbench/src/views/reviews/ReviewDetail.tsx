import { useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, ExternalLink, Fingerprint, Radio, Send } from 'lucide-react';
import { useStore } from '../../store';
import { canQuickClose, closeReview, requestConfirmation, startUpdateCase } from '../../lib/actions';
import { can, effectiveOwners } from '../../lib/domain';
import { EVENT_LABEL } from '../../lib/catalog';
import { daysFromNow, fmtChfShort, fmtDate, fmtDateTime, fmtNumber } from '../../lib/format';
import { customerOf, personName } from '../../lib/selectors';
import { userName } from '../../data/users';
import type { RiskLevel } from '../../types';
import { go, href } from '../../router';
import { AmpelDot, Badge, Button, Card, Empty, Field, InfoBox, PageHeader, RiskBadge, Select, Textarea } from '../../components/ui';
import { CaseStatusBadge, ReviewStatusBadge } from '../../components/status';
import { History } from '../../components/History';

export function ReviewDetail({ reviewId }: { reviewId: string }) {
  const { state, act, role } = useStore();
  const [note, setNote] = useState('Kunde hat die Daten unverändert bestätigt. Tiefes Risiko, keine Auffälligkeiten in der Transaktionsüberwachung seit der letzten Überprüfung.');
  const [level, setLevel] = useState<RiskLevel>('gmer');
  const [reason, setReason] = useState('');
  const r = state.reviews.find((x) => x.id === reviewId);
  if (!r) return <Empty>Überprüfung nicht gefunden.</Empty>;
  const c = customerOf(state, r.customerId)!;
  const events = state.events.filter((e) => r.eventIds.includes(e.id)).sort((a, b) => b.date.localeCompare(a.date));
  const quick = canQuickClose(state, r);
  const cs = r.caseId ? state.cases.find((x) => x.id === r.caseId) : undefined;
  const mayWork = can(role, 'review.work');
  const d = daysFromNow(r.dueAt);
  const owners = effectiveOwners(c);
  const closed = r.status === 'abgeschlossen';

  return (
    <>
      <PageHeader
        back={
          <a href={href('/kyc')} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            <ArrowLeft className="size-3.5" /> KYC-Überprüfungen
          </a>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {r.number} · {c.name} <ReviewStatusBadge status={r.status} /> <RiskBadge level={c.riskLevel} score={c.riskScore} />
            {r.trigger === 'ereignis' ? <Badge tone="violet">ereignisgesteuert</Badge> : <Badge>periodisch</Badge>}
          </span>
        }
        subtitle={
          <span className="flex flex-wrap items-center gap-3">
            <span>
              {c.uid} · {c.legalForm} · {c.seat} · letzte Überprüfung {fmtDate(c.lastReviewAt)}
            </span>
            {!closed && <AmpelDot value={d < 0 ? 'rot' : d <= 14 ? 'gelb' : 'gruen'} text={`fällig ${fmtDate(r.dueAt)}${d < 0 ? ` · überfällig seit ${-d} T` : ` · in ${d} T`}`} />}
          </span>
        }
        actions={
          <a href={href(`/portal/kyc/${r.id}`)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
            <ExternalLink className="size-4" /> Kundensicht öffnen
          </a>
        }
      />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          {events.length > 0 && (
            <Card title="Auslösende Ereignisse" subtitle="Laufendes KYC: Meldungen mit Quelle und Datum">
              <ul className="space-y-3">
                {events.map((e) => (
                  <li key={e.id} className="rounded-md border border-violet-200 bg-violet-50/50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-900">
                        <Radio className="size-4 text-violet-700" /> {e.title}
                      </span>
                      <Badge tone="violet">{EVENT_LABEL[e.type]}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-700">{e.detail}</p>
                    {e.change && (
                      <p className="mt-1 text-[13px]">
                        <span className="text-slate-500">{e.change.field}: </span>
                        <span className="text-slate-400 line-through">{e.change.oldValue}</span> → <span className="font-medium text-slate-900">{e.change.newValue}</span>
                      </p>
                    )}
                    <p className="mt-1 text-xs text-slate-500">
                      Quelle: {e.source} · {fmtDateTime(e.date)}
                    </p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Bei der Bank gespeicherte Daten">
            <div className="grid gap-5 md:grid-cols-2">
              <dl className="space-y-2 text-sm">
                {[
                  ['Firma', c.name],
                  ['Sitz', `${c.street}, ${c.seat} (${c.canton})`],
                  ['Zweck', c.purpose],
                  ['Branche', c.industry],
                  ['Zweck der Geschäftsbeziehung', c.relationshipPurpose],
                  ['Erwartetes Volumen', `${fmtChfShort(c.expectedVolume)} p. a., Bar ${c.expectedCashShare} %`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs text-slate-500">{k}</dt>
                    <dd className="text-slate-900">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Zeichnungsberechtigte</div>
                  <ul className="mt-1 space-y-0.5">
                    {c.signatories.map((s) => (
                      <li key={s.personId}>
                        {personName(state, s.personId)} <span className="text-slate-500">· {s.function}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-xs text-slate-500">{c.formType === 'A' ? 'Wirtschaftlich Berechtigte' : 'Kontrollinhaber'}</div>
                  <ul className="mt-1 space-y-0.5">
                    {c.controllerIds.map((id) => {
                      const o = owners.find((x) => x.personId === id);
                      return (
                        <li key={id}>
                          {personName(state, id)}
                          {o && <span className="text-slate-500"> · {fmtNumber(o.percent, 1)} %</span>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </div>
          </Card>

          <Card title="Selbstbestätigung durch den Kunden">
            {!r.response ? (
              <div className="text-sm text-slate-600">
                {r.status === 'warten_auf_kunde' ? `Angefordert am ${fmtDate(r.requestedAt)} – Antwort ausstehend.` : 'Noch nicht angefordert.'}
              </div>
            ) : r.response.changes.length === 0 ? (
              <InfoBox tone="green" title={`Daten unverändert bestätigt am ${fmtDateTime(r.response.at)}`} icon={r.response.viaEid ? <Fingerprint className="mt-0.5 size-4" /> : <CheckCircle2 className="mt-0.5 size-4" />}>
                {r.response.viaEid ? 'Bestätigt mit E-ID (Platzhalter)' : 'Bestätigt im Kundenportal'}
              </InfoBox>
            ) : (
              <InfoBox tone="amber" title={`Kunde meldet ${r.response.changes.length} Änderung(en) – ${fmtDateTime(r.response.at)}`}>
                <ul className="mt-1 list-disc pl-5">
                  {r.response.changes.map((ch, i) => (
                    <li key={i}>
                      <strong>{ch.section}:</strong> {ch.note}
                    </li>
                  ))}
                </ul>
              </InfoBox>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Prüfung">
            {closed ? (
              <InfoBox tone="green" title={`Abgeschlossen am ${fmtDate(r.closedAt)} durch ${userName(r.closedBy)}`}>
                {r.closeNote} Nächste Fälligkeit: {fmtDate(c.nextReviewAt)}.
              </InfoBox>
            ) : (
              <div className="space-y-4">
                {(r.status === 'offen' || r.status === 'warten_auf_kunde') && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">1. Kunde bestätigt seine Daten im Kundenportal oder meldet Änderungen.</p>
                    {mayWork && (
                      <Button icon={<Send className="size-4" />} onClick={() => act(requestConfirmation, r.id)} variant={r.status === 'offen' ? 'primary' : 'secondary'}>
                        {r.status === 'offen' ? 'Selbstbestätigung anfordern' : 'Erinnerung senden'}
                      </Button>
                    )}
                  </div>
                )}

                {r.status === 'in_pruefung' && quick.ok && (
                  <div className="space-y-2">
                    <InfoBox tone="green" title="Unverändert und tiefes Risiko">
                      Die Überprüfung kann mit einem Klick abgeschlossen werden.
                    </InfoBox>
                    {mayWork && (
                      <>
                        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
                        <Button variant="success" icon={<CheckCircle2 className="size-4" />} onClick={() => act(closeReview, r.id, note)} disabled={note.trim().length < 10}>
                          Mit einem Klick abschliessen
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {!quick.ok && r.status !== 'aktualisierung' && (r.response || events.length > 0) && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">{quick.reason ?? 'Änderungen vorhanden.'}</p>
                    {mayWork && (events.length > 0 || r.response?.changes.length) ? (
                      <Button
                        icon={<ArrowRight className="size-4" />}
                        onClick={() => {
                          const id = act(startUpdateCase, r.id);
                          if (id) go(`/onboarding/${id}`);
                        }}
                      >
                        Verkürzten Ablauf starten
                      </Button>
                    ) : null}
                    <p className="text-xs text-slate-500">Startet den Ablauf aus «Onboarding» mit den bestehenden Daten. Nur betroffene Unterlagen werden neu verlangt.</p>
                  </div>
                )}

                {r.status === 'aktualisierung' && cs && (
                  <div className="space-y-2">
                    <p className="text-sm text-slate-600">Verkürzter Ablauf läuft:</p>
                    <a href={href(`/onboarding/${cs.id}`)} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50">
                      <span className="font-medium text-brand-700">{cs.number}</span>
                      <CaseStatusBadge status={cs.status} />
                    </a>
                    <p className="text-xs text-slate-500">Die Überprüfung wird beim Abschluss durch das Backoffice automatisch abgeschlossen.</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {!closed && (r.riskRecheck || c.riskLevel === 'gmer') && r.status !== 'aktualisierung' && (
            <Card title="Risikoeinstufung überprüfen" subtitle={r.riskRecheck ? 'Vorschlag aus eskaliertem Alarm (TmeR → GmeR)' : 'GmeR-Kunde: Prüfung durch Compliance'}>
              {can(role, 'risk.confirm') ? (
                <div className="space-y-3">
                  <Field label="Einstufung nach Überprüfung">
                    <Select value={level} onChange={(e) => setLevel(e.target.value as RiskLevel)}>
                      <option value="gmer">GmeR – erhöhtes Risiko</option>
                      <option value="normal">Normales Risiko</option>
                    </Select>
                  </Field>
                  <Field label="Begründung" hint={`${reason.trim().length} / mind. 30 Zeichen`}>
                    <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="z. B. MROS-Meldung erstattet, verstärkte Überwachung …" />
                  </Field>
                  <Button disabled={reason.trim().length < 30} onClick={() => act(closeReview, r.id, `Risikoeinstufung überprüft: ${level === 'gmer' ? 'GmeR' : 'Normal'}.`, { level, reason })}>
                    Einstufung festlegen und abschliessen
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-slate-500">Durch Compliance oder Leitung Compliance.</p>
              )}
            </Card>
          )}

          <Card title="Verlauf">
            <History objectIds={[r.id, ...r.eventIds, ...(cs ? [cs.id] : [])]} limit={10} />
          </Card>
        </div>
      </div>
    </>
  );
}
