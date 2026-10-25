import { CheckCircle2, Clock, FileText } from 'lucide-react';
import { useStore } from '../../store';
import { uploadDocument } from '../../lib/actions';
import { DOC_HINT } from '../../lib/catalog';
import { fmtDate } from '../../lib/format';
import { customerOf, personName } from '../../lib/selectors';
import { Badge, InfoBox } from '../../components/ui';
import { docTitle, UploadButton } from '../onboarding/DocumentsTab';
import { PortalShell } from './PortalShell';

export function OnboardingPortal({ caseId }: { caseId: string }) {
  const { state, act } = useStore();
  const cs = state.cases.find((x) => x.id === caseId);
  if (!cs) return <PortalShell title="Link ungültig">Dieser Link ist nicht mehr gültig.</PortalShell>;
  const c = customerOf(state, cs.customerId)!;
  const open = cs.documents.filter((d) => d.status === 'fehlt' || d.status === 'abgelehnt');
  const received = cs.documents.filter((d) => d.status === 'hochgeladen' || d.status === 'geprueft');
  const pct = Math.round((received.length / cs.documents.length) * 100);
  const canUpload = cs.status === 'in_erfassung' || cs.status === 'zurueckgewiesen' || cs.status === 'freigegeben';

  return (
    <PortalShell title={`Kontoeröffnung ${c.name}`}>
      <p className="mt-1 text-sm text-slate-600">Bitte laden Sie die folgenden Unterlagen hoch. Ihre Kundenberaterin bzw. Ihr Kundenberater wird automatisch informiert.</p>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-slate-800">Fortschritt</span>
          <span className="tabular text-slate-600">
            {received.length} von {cs.documents.length} Unterlagen eingereicht
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Noch ausstehend ({open.length})</h2>
        {open.length === 0 ? (
          <div className="mt-2">
            <InfoBox tone="green" title="Vielen Dank – alle Unterlagen sind eingereicht.">
              Die Bank prüft Ihre Unterlagen und meldet sich bei Rückfragen.
            </InfoBox>
          </div>
        ) : (
          <ul className="mt-2 space-y-2">
            {open.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-slate-900">{docTitle(d, d.personId ? personName(state, d.personId) : undefined)}</div>
                  <div className="text-xs text-slate-500">{DOC_HINT[d.type] ?? 'PDF, JPG oder PNG'}</div>
                  {d.status === 'abgelehnt' && <div className="mt-1 text-xs font-medium text-red-700">Bitte erneut einreichen: {d.rejectReason}</div>}
                </div>
                {canUpload ? <UploadButton variant="primary" size="md" label="Datei hochladen" onFile={(f) => act(uploadDocument, cs.id, d.id, f, true)} /> : <Badge>in Prüfung</Badge>}
              </li>
            ))}
          </ul>
        )}
      </section>

      {received.length > 0 && (
        <section className="mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Eingereicht ({received.length})</h2>
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {received.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-slate-400" />
                  <span className="truncate">{docTitle(d, d.personId ? personName(state, d.personId) : undefined)}</span>
                </span>
                <span className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
                  {d.status === 'geprueft' ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Clock className="size-4 text-slate-400" />}
                  {d.status === 'geprueft' ? 'geprüft' : `eingereicht ${fmtDate(d.uploadedAt)}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-8 text-xs text-slate-500">Demo-Ansicht. Es werden keine Dateien übertragen; gespeichert wird nur der Dateiname.</p>
    </PortalShell>
  );
}
