import type { ReactNode } from 'react';
import { ArrowLeft, Printer } from 'lucide-react';
import { useStore } from '../../store';
import { assessRisk, effectiveOwners, ownershipTree, type OwnerNode } from '../../lib/domain';
import { CASE_STATUS_LABEL, DOC_LABEL, DOC_STATUS_LABEL } from '../../lib/catalog';
import { countryName, fmtChfShort, fmtDate, fmtDateTime, fmtNumber, nowIso } from '../../lib/format';
import { customerOf, personName, personOf } from '../../lib/selectors';
import { userName } from '../../data/users';
import { go } from '../../router';
import { Button, Empty } from '../../components/ui';
import { RiskTable } from './RiskTab';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6 break-inside-avoid">
      <h2 className="mb-2 border-b border-slate-300 pb-1 text-sm font-semibold uppercase tracking-wide text-brand-800">{title}</h2>
      {children}
    </section>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-3 py-1 text-sm">
      <dt className="text-slate-500">{k}</dt>
      <dd className="text-slate-900">{v}</dd>
    </div>
  );
}

function TreeLines({ n, depth = 0 }: { n: OwnerNode; depth?: number }) {
  return (
    <>
      <div className="py-0.5 text-sm" style={{ paddingLeft: depth * 20 }}>
        {depth > 0 && <span className="text-slate-400">└ </span>}
        <span className="font-medium">{n.entity.name}</span>
        <span className="text-slate-500">
          {' '}
          ({countryName(n.entity.country)}){depth > 0 && ` · ${fmtNumber(n.percent, 1)} %`}
          {n.entity.kind === 'person' && ` · durchgerechnet ${fmtNumber(n.effective, 1)} %`}
        </span>
      </div>
      {n.children.map((ch) => (
        <TreeLines key={ch.holdingId} n={ch} depth={depth + 1} />
      ))}
    </>
  );
}

export function KycProfile({ caseId }: { caseId: string }) {
  const { state } = useStore();
  const cs = state.cases.find((x) => x.id === caseId);
  if (!cs) return <Empty>Fall nicht gefunden.</Empty>;
  const c = customerOf(state, cs.customerId)!;
  const risk = cs.risk ?? assessRisk({ customer: c, persons: state.persons }, state.settings);
  const owners = effectiveOwners(c);

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" icon={<ArrowLeft className="size-4" />} onClick={() => go(`/onboarding/${cs.id}`)}>
          Zurück zum Fall
        </Button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Im Druckdialog «Als PDF speichern» wählen.</span>
          <Button icon={<Printer className="size-4" />} onClick={() => window.print()}>
            Drucken / als PDF exportieren
          </Button>
        </div>
      </div>
      <article className="print-page mx-auto max-w-[210mm] rounded-lg border border-slate-200 bg-white p-10 shadow-sm">
        <header className="flex items-start justify-between border-b-2 border-brand-800 pb-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-brand-700">Banking Solutions · Banking Operations</div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">KYC-Profil</h1>
            <div className="text-sm text-slate-600">
              {c.name} · {c.uid}
            </div>
          </div>
          <div className="text-right text-xs text-slate-500">
            <div>
              Fall {cs.number} ({cs.kind === 'aktualisierung' ? 'Aktualisierung' : 'Onboarding'})
            </div>
            <div>Status: {CASE_STATUS_LABEL[cs.status]}</div>
            <div>Erstellt am {fmtDateTime(nowIso())}</div>
            <div className="mt-1 inline-block rounded border border-dashed border-amber-500 px-1.5 font-semibold uppercase text-amber-700">Demo · fiktive Daten</div>
          </div>
        </header>

        <Section title="Stammdaten">
          <dl>
            <Row k="Firma" v={c.name} />
            <Row k="Rechtsform" v={c.legalForm} />
            <Row k="UID-Nummer" v={c.uid} />
            <Row k="Sitz / Adresse" v={`${c.street}, ${c.seat} (${c.canton}), ${countryName(c.country)}`} />
            <Row k="Gründungsdatum" v={fmtDate(c.foundedAt)} />
            <Row k="Zweck" v={c.purpose} />
          </dl>
        </Section>

        <Section title="Geschäftsprofil">
          <dl>
            <Row k="Branche" v={`${c.industry || '–'}${c.cashIntensive ? ' (bargeldintensiv)' : ''}`} />
            <Row k="Zweck der Geschäftsbeziehung" v={c.relationshipPurpose || '–'} />
            <Row k="Erwartetes Volumen p. a." v={fmtChfShort(c.expectedVolume)} />
            <Row k="Erwarteter Bargeldanteil" v={`${c.expectedCashShare} %`} />
            <Row k="Herkunft der Vermögenswerte" v={c.sourceOfFunds} />
          </dl>
        </Section>

        <Section title="Zeichnungsberechtigte">
          <table className="w-full text-sm">
            <tbody>
              {c.signatories.map((s) => {
                const p = personOf(state, s.personId);
                return (
                  <tr key={s.personId} className="border-b border-slate-100">
                    <td className="py-1 font-medium">
                      {p?.firstName} {p?.lastName}
                      {p?.pep ? ' (PEP)' : ''}
                    </td>
                    <td className="py-1">{s.function}</td>
                    <td className="py-1">{s.signature}</td>
                    <td className="py-1 text-slate-500">{fmtDate(p?.birthDate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Section>

        <Section title={c.formType === 'A' ? 'Wirtschaftlich Berechtigte (Formular A)' : 'Kontrollinhaber (Formular K)'}>
          <p className="text-sm">{c.controllerIds.map((id) => personName(state, id)).join(', ') || 'nicht festgelegt'}</p>
          <div className="mt-3">
            <div className="mb-1 text-xs font-medium text-slate-500">Eigentümerstruktur</div>
            <TreeLines n={ownershipTree(c)} />
          </div>
          {owners.length > 0 && <p className="mt-2 text-xs text-slate-500">Durchgerechnete Beteiligungen: {owners.map((o) => `${o.name} ${fmtNumber(o.percent, 1)} %`).join(', ')}</p>}
        </Section>

        <Section title="Abgleich Transparenzregister">
          {cs.registerCheckedAt ? (
            <>
              <p className="text-sm">Abgleich vom {fmtDateTime(cs.registerCheckedAt)} (simuliert): {cs.deviations.length ? `${cs.deviations.length} Abweichung(en)` : 'keine Abweichungen'}.</p>
              {cs.deviations.map((d) => (
                <p key={d.id} className="mt-1 text-sm">
                  <span className="font-medium text-red-800">{d.subject}</span>: Kunde {d.customerValue}, Register {d.registerValue}. Begründung: {d.justification || '–'}
                </p>
              ))}
            </>
          ) : (
            <p className="text-sm">Nicht durchgeführt.</p>
          )}
        </Section>

        <Section title="Risikoeinstufung">
          <div className="rounded border border-slate-200">
            <RiskTable risk={risk} />
          </div>
          <p className="mt-2 text-sm">
            Ergebnis: <strong>{risk.final === 'gmer' ? 'GmeR (erhöhtes Risiko)' : 'Normales Risiko'}</strong>
            {risk.override && ` – übersteuert durch ${userName(risk.override.by)}: ${risk.override.reason}`}
            {risk.confirmedAt && ` · bestätigt durch ${userName(risk.confirmedBy)} am ${fmtDate(risk.confirmedAt)}`}
          </p>
        </Section>

        <Section title="Unterlagen">
          <table className="w-full text-sm">
            <tbody>
              {cs.documents.map((d) => (
                <tr key={d.id} className="border-b border-slate-100">
                  <td className="py-1">
                    {DOC_LABEL[d.type]}
                    {d.personId ? ` – ${personName(state, d.personId)}` : ''}
                  </td>
                  <td className="py-1">{DOC_STATUS_LABEL[d.status]}</td>
                  <td className="py-1 text-slate-500">{d.fileName ?? '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>

        <Section title="Freigaben">
          {cs.approvals.length === 0 ? (
            <p className="text-sm">Noch keine.</p>
          ) : (
            cs.approvals.map((a, i) => (
              <p key={i} className="text-sm">
                {fmtDateTime(a.at)} · {a.step === 'compliance' ? 'Compliance' : a.step === 'leitung' ? 'Leitung Compliance' : 'Backoffice'} · {userName(a.userId)}: {a.decision}
                {a.comment ? ` – «${a.comment}»` : ''}
              </p>
            ))
          )}
          {c.nextReviewAt && <p className="mt-2 text-sm">Nächste periodische Überprüfung: {fmtDate(c.nextReviewAt)}</p>}
        </Section>

        <footer className="mt-10 border-t border-slate-200 pt-3 text-[11px] text-slate-500">Prototyp «KYC & Compliance Workbench» – ausschliesslich fiktive Testdaten. Die App unterstützt Entscheide; alle Entscheide wurden durch die genannten Personen getroffen.</footer>
      </article>
    </>
  );
}
