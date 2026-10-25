import { useState } from 'react';
import { ArrowLeft, Check, ExternalLink, FileDown, Send, ShieldCheck, Users } from 'lucide-react';
import { useStore } from '../../store';
import { complianceDecision, finalizeMasterData, openAccount, secondApproval, submitCase } from '../../lib/actions';
import { can, missingDocs, needsSecondApproval, openChecks, submitChecks } from '../../lib/domain';
import { daysBetween, fmtDate, fmtDateTime, nowIso } from '../../lib/format';
import { ROLE_LABEL } from '../../lib/catalog';
import { customerOf } from '../../lib/selectors';
import { userName } from '../../data/users';
import type { Customer, OnboardingCase, Role } from '../../types';
import { go, href } from '../../router';
import { Badge, Button, Card, Checks, cx, Empty, InfoBox, PageHeader, RiskBadge, Tabs, Textarea } from '../../components/ui';
import { CaseStatusBadge } from '../../components/status';
import { History } from '../../components/History';
import { MasterDataTab } from './MasterDataTab';
import { RegisterTab, StructureTab } from './OwnershipTabs';
import { DocumentsTab } from './DocumentsTab';
import { RiskTab } from './RiskTab';

type Tab = 'freigabe' | 'stammdaten' | 'register' | 'struktur' | 'unterlagen' | 'risiko' | 'verlauf';

interface Step {
  id: string;
  label: string;
  role: Role;
  state: 'done' | 'current' | 'todo' | 'skip';
  info?: string;
}

function steps(cs: OnboardingCase): Step[] {
  const s = cs.status;
  const gmer = needsSecondApproval(cs);
  const order = ['in_erfassung', 'eingereicht', 'zweite_freigabe', 'freigegeben', 'eroeffnet'];
  const idx = order.indexOf(s === 'zurueckgewiesen' ? 'in_erfassung' : s);
  const appr = (step: string) => [...cs.approvals].reverse().find((a) => a.step === step && a.decision !== 'zurueckgewiesen');
  const st = (i: number): Step['state'] => (idx > i ? 'done' : idx === i ? 'current' : 'todo');
  return [
    { id: 'erfassung', label: 'Erfassung', role: 'kb', state: st(0), info: cs.submittedAt ? `eingereicht ${fmtDate(cs.submittedAt)}` : undefined },
    { id: 'compliance', label: 'Prüfung Compliance', role: 'compliance', state: st(1), info: appr('compliance') ? `${userName(appr('compliance')!.userId)}, ${fmtDate(appr('compliance')!.at)}` : undefined },
    {
      id: 'leitung',
      label: 'Zweite Freigabe',
      role: 'leitung',
      state: cs.risk && !gmer ? 'skip' : st(2),
      info: appr('leitung') ? `${userName(appr('leitung')!.userId)}, ${fmtDate(appr('leitung')!.at)}` : 'nur bei GmeR',
    },
    { id: 'backoffice', label: cs.kind === 'aktualisierung' ? 'Abschluss Backoffice' : 'Eröffnung Backoffice', role: 'backoffice', state: idx === 4 ? 'done' : st(3), info: appr('backoffice') ? `${userName(appr('backoffice')!.userId)}, ${fmtDate(appr('backoffice')!.at)}` : undefined },
  ];
}

function Stepper({ cs }: { cs: OnboardingCase }) {
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {steps(cs).map((s, i) => (
        <li
          key={s.id}
          className={cx(
            'rounded-md border px-3 py-2',
            s.state === 'current' && 'border-brand-500 bg-brand-50',
            s.state === 'done' && 'border-emerald-200 bg-emerald-50/60',
            s.state === 'todo' && 'border-slate-200 bg-white',
            s.state === 'skip' && 'border-dashed border-slate-200 bg-slate-50 opacity-70',
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <span className={cx('grid size-5 place-items-center rounded-full text-[11px] font-semibold', s.state === 'done' ? 'bg-emerald-600 text-white' : s.state === 'current' ? 'bg-brand-700 text-white' : 'bg-slate-200 text-slate-600')}>
              {s.state === 'done' ? <Check className="size-3" /> : i + 1}
            </span>
            {s.label}
          </div>
          <div className="mt-0.5 text-xs text-slate-500">
            {ROLE_LABEL[s.role]}
            {s.info ? ` · ${s.info}` : ''}
            {s.state === 'skip' ? ' · entfällt' : ''}
          </div>
        </li>
      ))}
    </ol>
  );
}

function Decision({ label, onApprove, onReject, approveLabel, rejectLabel = 'Zurückweisen', disabled, hint }: { label: string; onApprove: (c: string) => void; onReject?: (c: string) => void; approveLabel: string; rejectLabel?: string; disabled?: boolean; hint?: string }) {
  const [comment, setComment] = useState('');
  return (
    <div className="space-y-2">
      <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder={label} />
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="success" icon={<Check className="size-4" />} disabled={disabled} onClick={() => onApprove(comment)}>
          {approveLabel}
        </Button>
        {onReject && (
          <Button variant="danger" onClick={() => onReject(comment)} disabled={comment.trim().length < 10} title="Grund im Kommentarfeld angeben">
            {rejectLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

function ApprovalPanel({ cs, c, onTab }: { cs: OnboardingCase; c: Customer; onTab: (t: Tab) => void }) {
  const { act, role, user } = useStore();
  const s = cs.status;
  const editable = s === 'in_erfassung' || s === 'zurueckgewiesen';

  if (editable) {
    const checks = submitChecks(cs, c);
    return (
      <Card title="Einreichen zur Prüfung" subtitle="Voraussetzungen werden laufend geprüft">
        <Checks items={checks} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {can(role, 'case.submit') ? (
            <Button icon={<Send className="size-4" />} onClick={() => act(submitCase, cs.id)} disabled={checks.some((x) => !x.ok)}>
              An Compliance einreichen
            </Button>
          ) : (
            <span className="text-sm text-slate-500">Einreichen durch Kundenberater/in.</span>
          )}
          {missingDocs(cs.documents).length > 0 && (
            <Button variant="ghost" onClick={() => onTab('unterlagen')}>
              Zu den Unterlagen
            </Button>
          )}
        </div>
      </Card>
    );
  }
  if (s === 'eingereicht') {
    return (
      <Card title="Prüfung Compliance" subtitle="Risikoeinstufung prüfen, dann freigeben oder zurückweisen">
        <Checks items={[{ label: 'Risikoeinstufung bestätigt oder übersteuert', ok: Boolean(cs.risk?.confirmedAt), hint: 'Im Reiter «Risikoeinstufung»' }]} />
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-600">
          Ergebnis: <RiskBadge level={cs.risk?.final} score={cs.risk?.total} />
          {cs.risk?.final === 'gmer' && <span className="text-xs">→ zweite Freigabe durch Leitung Compliance nötig</span>}
        </div>
        <div className="mt-4">
          {can(role, 'case.review') ? (
            <Decision
              label="Kommentar zur Freigabe bzw. Grund der Zurückweisung"
              approveLabel={cs.risk?.final === 'gmer' ? 'Freigeben (1. Freigabe)' : 'Freigeben'}
              disabled={!cs.risk?.confirmedAt}
              onApprove={(cm) => act(complianceDecision, cs.id, true, cm)}
              onReject={(cm) => act(complianceDecision, cs.id, false, cm)}
            />
          ) : (
            <p className="text-sm text-slate-500">Wartet auf Compliance.</p>
          )}
        </div>
      </Card>
    );
  }
  if (s === 'zweite_freigabe') {
    const first = [...cs.approvals].reverse().find((a) => a.step === 'compliance' && a.decision === 'freigegeben');
    const same = first?.userId === user.id;
    return (
      <Card title={<span className="flex items-center gap-2"><Users className="size-4" /> Zweite Freigabe (Vier-Augen-Prinzip)</span>} subtitle="GmeR-Eröffnungen brauchen die Freigabe der Leitung Compliance">
        <InfoBox>
          1. Freigabe durch {userName(first?.userId)} ({fmtDateTime(first?.at)}): «{first?.comment || 'ohne Kommentar'}»
        </InfoBox>
        <div className="mt-4">
          {can(role, 'case.secondApproval') ? (
            same ? (
              <InfoBox tone="red">Sie haben die erste Freigabe erteilt – die zweite Freigabe muss eine andere Person vornehmen.</InfoBox>
            ) : (
              <Decision label="Kommentar zur zweiten Freigabe" approveLabel="Zweite Freigabe erteilen" rejectLabel="Verweigern" onApprove={(cm) => act(secondApproval, cs.id, true, cm)} onReject={(cm) => act(secondApproval, cs.id, false, cm)} />
            )
          ) : (
            <p className="text-sm text-slate-500">Wartet auf Leitung Compliance.</p>
          )}
        </div>
      </Card>
    );
  }
  if (s === 'freigegeben') {
    const checks = openChecks(cs);
    return (
      <Card title={cs.kind === 'aktualisierung' ? 'Abschluss durch Backoffice' : 'Eröffnung durch Backoffice'} subtitle="Unterlagen prüfen, Stammdaten finalisieren, Konto eröffnen (Demo)">
        <Checks items={checks} />
        {can(role, 'case.open') ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" icon={<ShieldCheck className="size-4" />} onClick={() => act(finalizeMasterData, cs.id)} disabled={cs.masterDataFinal}>
              Stammdaten finalisieren
            </Button>
            <Button variant="success" onClick={() => act(openAccount, cs.id)} disabled={checks.some((x) => !x.ok)}>
              {cs.kind === 'aktualisierung' ? 'Aktualisierung abschliessen' : 'Konto eröffnen'}
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Wartet auf Backoffice.</p>
        )}
      </Card>
    );
  }
  return (
    <Card title={cs.kind === 'aktualisierung' ? 'Aktualisierung abgeschlossen' : 'Geschäftsbeziehung eröffnet'}>
      <InfoBox tone="green" title={`${cs.kind === 'aktualisierung' ? 'Abgeschlossen' : 'Eröffnet'} am ${fmtDate(cs.closedAt)}`}>
        Nächste periodische Überprüfung: {fmtDate(c.nextReviewAt)}.
      </InfoBox>
      <div className="mt-3">
        <Button variant="secondary" icon={<FileDown className="size-4" />} onClick={() => go(`/onboarding/${cs.id}/profil`)}>
          KYC-Profil anzeigen / als PDF
        </Button>
      </div>
    </Card>
  );
}

export function CaseDetail({ caseId }: { caseId: string }) {
  const { state, role } = useStore();
  const [tab, setTab] = useState<Tab>('freigabe');
  const cs = state.cases.find((x) => x.id === caseId);
  if (!cs) return <Empty>Fall nicht gefunden.</Empty>;
  const c = customerOf(state, cs.customerId)!;
  const editable = (cs.status === 'in_erfassung' || cs.status === 'zurueckgewiesen') && can(role, 'case.edit');
  const missing = missingDocs(cs.documents).length;
  const openDevs = cs.deviations.filter((d) => d.justification.trim().length < 20).length;

  return (
    <>
      <PageHeader
        back={
          <a href={href('/onboarding')} className="inline-flex items-center gap-1 text-brand-700 hover:underline">
            <ArrowLeft className="size-3.5" /> Onboarding
          </a>
        }
        title={
          <span className="flex flex-wrap items-center gap-2">
            {c.name} <CaseStatusBadge status={cs.status} /> {cs.risk && <RiskBadge level={cs.risk.final} score={cs.risk.total} />}
            {cs.kind === 'aktualisierung' && <Badge tone="violet">Aktualisierung (verkürzt)</Badge>}
          </span>
        }
        subtitle={`${cs.number} · ${c.uid} · ${c.legalForm} · ${c.seat} ${c.canton} · Kundenberater/in ${userName(cs.advisorId)} · seit ${daysBetween(cs.createdAt, cs.closedAt ?? nowIso())} Tagen`}
        actions={
          <>
            <a href={href(`/portal/onboarding/${cs.id}`)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-800 hover:bg-slate-50">
              <ExternalLink className="size-4" /> Kundensicht öffnen
            </a>
            <Button variant="secondary" icon={<FileDown className="size-4" />} onClick={() => go(`/onboarding/${cs.id}/profil`)}>
              KYC-Profil
            </Button>
          </>
        }
      />

      {cs.status === 'zurueckgewiesen' && cs.returnNote && (
        <div className="mb-4">
          <InfoBox tone="red" title="Zurückgewiesen – bitte überarbeiten und erneut einreichen">
            {cs.returnNote}
          </InfoBox>
        </div>
      )}

      <div className="mb-4">
        <Stepper cs={cs} />
      </div>

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'freigabe', label: 'Übersicht & Freigabe' },
          { id: 'stammdaten', label: 'Stammdaten & Profil' },
          { id: 'register', label: <span>Transparenzregister {openDevs > 0 && <Badge tone="red">{openDevs}</Badge>}</span> },
          { id: 'struktur', label: 'Eigentümerstruktur' },
          { id: 'unterlagen', label: <span>Unterlagen {missing > 0 && <Badge tone="amber">{missing}</Badge>}</span> },
          { id: 'risiko', label: 'Risikoeinstufung' },
          { id: 'verlauf', label: 'Verlauf' },
        ]}
      />

      {tab === 'freigabe' && (
        <div className="grid gap-5 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            <ApprovalPanel cs={cs} c={c} onTab={setTab} />
            <Card title="Freigaben" padded>
              {cs.approvals.length === 0 ? (
                <Empty>Noch keine Entscheide.</Empty>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {cs.approvals.map((a, i) => (
                    <li key={i} className="flex flex-wrap items-start justify-between gap-2 py-2.5 text-sm">
                      <div>
                        <div className="font-medium text-slate-900">
                          {a.step === 'compliance' ? 'Compliance' : a.step === 'leitung' ? 'Leitung Compliance (2. Freigabe)' : 'Backoffice'} · {userName(a.userId)}
                        </div>
                        {a.comment && <div className="text-slate-600">«{a.comment}»</div>}
                      </div>
                      <div className="text-right">
                        <Badge tone={a.decision === 'zurueckgewiesen' ? 'red' : 'green'}>{a.decision === 'zurueckgewiesen' ? 'Zurückgewiesen' : a.decision === 'eroeffnet' ? 'Eröffnet' : 'Freigegeben'}</Badge>
                        <div className="mt-0.5 text-xs text-slate-500">{fmtDateTime(a.at)}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
          <Card title="Letzte Aktivitäten">
            <History objectIds={[cs.id, c.id, ...cs.documents.map((d) => d.id)]} limit={8} />
          </Card>
        </div>
      )}
      {tab === 'stammdaten' && <MasterDataTab c={c} editable={editable} />}
      {tab === 'register' && <RegisterTab cs={cs} c={c} editable={editable} />}
      {tab === 'struktur' && <StructureTab c={c} editable={editable} />}
      {tab === 'unterlagen' && <DocumentsTab cs={cs} c={c} editable={editable} />}
      {tab === 'risiko' && <RiskTab cs={cs} c={c} editable={editable} />}
      {tab === 'verlauf' && (
        <Card title="Verlauf (aus dem Audit-Trail)">
          <History objectIds={[cs.id, c.id, ...cs.documents.map((d) => d.id)]} />
        </Card>
      )}
    </>
  );
}
