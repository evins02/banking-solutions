import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, FileText, Pencil, Send, Upload } from 'lucide-react';
import { useStore } from '../../store';
import { services } from '../../services';
import { isStaleExtract } from '../../services/dokumentenleser';
import { checkDocument, confirmField, rejectDocument, requestDocuments, setExtracted, uploadDocument } from '../../lib/actions';
import { DOC_HINT, DOC_LABEL, READABLE_DOCS } from '../../lib/catalog';
import { can, missingDocs } from '../../lib/domain';
import { fmtDate, fmtDateTime } from '../../lib/format';
import { personOf } from '../../lib/selectors';
import { userName } from '../../data/users';
import type { CaseDocument, Customer, OnboardingCase } from '../../types';
import { href } from '../../router';
import { Badge, Button, Card, cx, DemoTag, InfoBox, Input, Modal, Spinner, Table, td, th } from '../../components/ui';
import { DocStatusBadge } from '../../components/status';

export function UploadButton({ onFile, label = 'Hochladen', size = 'sm', variant = 'secondary' }: { onFile: (name: string) => void; label?: string; size?: 'sm' | 'md'; variant?: 'secondary' | 'primary' }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f.name);
          e.target.value = '';
        }}
      />
      <Button variant={variant} size={size} icon={<Upload className="size-4" />} onClick={() => ref.current?.click()}>
        {label}
      </Button>
    </>
  );
}

export function docTitle(doc: CaseDocument, name?: string) {
  return `${DOC_LABEL[doc.type]}${name ? ` – ${name}` : ''}`;
}

export function DocumentsTab({ cs, c, editable }: { cs: OnboardingCase; c: Customer; editable: boolean }) {
  const { state, act, role } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const total = cs.documents.length;
  const done = cs.documents.filter((d) => d.status === 'geprueft').length;
  const uploaded = cs.documents.filter((d) => d.status === 'hochgeladen').length;
  const missing = missingDocs(cs.documents);
  const doc = cs.documents.find((d) => d.id === open);

  return (
    <>
      <Card
        title={`Unterlagen-Checkliste · ${c.legalForm}`}
        subtitle={`${done} geprüft · ${uploaded} hochgeladen · ${missing.length} fehlen oder abgelehnt`}
        padded={false}
        actions={
          <>
            <a href={href(`/portal/onboarding/${cs.id}`)} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium text-brand-700 hover:bg-brand-50">
              <ExternalLink className="size-4" /> Kundensicht öffnen
            </a>
            {editable && can(role, 'doc.request') && (
              <Button size="sm" icon={<Send className="size-4" />} onClick={() => act(requestDocuments, cs.id)} disabled={missing.length === 0}>
                Unterlagen anfordern
              </Button>
            )}
          </>
        }
      >
        <div className="px-4 pt-3">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="flex h-full">
              <div className="bg-emerald-500" style={{ width: `${(done / total) * 100}%` }} />
              <div className="bg-brand-500" style={{ width: `${(uploaded / total) * 100}%` }} />
            </div>
          </div>
        </div>
        <Table>
          <thead>
            <tr>
              <th className={th}>Dokument</th>
              <th className={th}>Status</th>
              <th className={th}>Datei</th>
              <th className={th}>Eingang</th>
              <th className={`${th} text-right`}>Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {cs.documents.map((d) => {
              const p = d.personId ? personOf(state, d.personId) : undefined;
              const name = p ? `${p.firstName} ${p.lastName}` : undefined;
              return (
                <tr key={d.id} className={d.status === 'abgelehnt' ? 'bg-red-50/40' : ''}>
                  <td className={td}>
                    <div className="font-medium text-slate-900">{docTitle(d, name)}</div>
                    <div className="text-xs text-slate-500">
                      {DOC_HINT[d.type] ?? ''}
                      {d.requestedAt && d.status === 'fehlt' ? ` · angefordert am ${fmtDate(d.requestedAt)}` : ''}
                    </div>
                  </td>
                  <td className={td}>
                    <DocStatusBadge status={d.status} />
                    {d.status === 'abgelehnt' && d.rejectReason && <div className="mt-1 text-xs text-red-700">Grund: {d.rejectReason}</div>}
                  </td>
                  <td className={td}>
                    {d.fileName ? (
                      <span className="inline-flex items-center gap-1.5 text-slate-700">
                        <FileText className="size-4 text-slate-400" />
                        <span className="max-w-[220px] truncate">{d.fileName}</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">–</span>
                    )}
                  </td>
                  <td className={`${td} text-xs text-slate-500`}>{d.uploadedAt ? `${fmtDateTime(d.uploadedAt)} · ${userName(d.uploadedBy)}` : '–'}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-1.5">
                      {editable && can(role, 'doc.request') && (d.status === 'fehlt' || d.status === 'abgelehnt') && <UploadButton onFile={(f) => act(uploadDocument, cs.id, d.id, f, false)} />}
                      {d.status !== 'fehlt' && (
                        <Button size="sm" variant={can(role, 'doc.check') && d.status === 'hochgeladen' ? 'primary' : 'ghost'} onClick={() => setOpen(d.id)}>
                          {can(role, 'doc.check') && d.status === 'hochgeladen' ? 'Prüfen' : 'Ansehen'}
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </Card>
      {doc && <DocReviewModal cs={cs} c={c} doc={doc} onClose={() => setOpen(null)} />}
    </>
  );
}

/** Platzhalter-Vorschau eines Dokuments (keine echte Datei) */
function DocPreview({ doc, c, personName }: { doc: CaseDocument; c: Customer; personName?: string }) {
  if (doc.type === 'ausweis') {
    return (
      <div className="mx-auto aspect-[1.58] w-full max-w-sm rounded-xl border border-slate-300 bg-gradient-to-br from-rose-50 to-slate-100 p-4 shadow-inner">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-rose-800">
          <span>Identitätskarte · Muster</span>
          <DemoTag>fiktiv</DemoTag>
        </div>
        <div className="mt-3 flex gap-3">
          <div className="grid h-20 w-16 place-items-center rounded bg-slate-300 text-[10px] text-slate-500">Foto</div>
          <div className="space-y-1.5 text-[11px] text-slate-700">
            <div className="h-2 w-28 rounded bg-slate-300" />
            <div className="font-semibold uppercase">{personName}</div>
            <div className="h-2 w-20 rounded bg-slate-300" />
            <div className="h-2 w-24 rounded bg-slate-300" />
          </div>
        </div>
        <div className="mt-3 font-mono text-[9px] tracking-wider text-slate-500">IDCHE&lt;&lt;DEMO&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
      </div>
    );
  }
  return (
    <div className="mx-auto aspect-[0.71] w-full max-w-xs rounded border border-slate-300 bg-white p-4 shadow-inner">
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{DOC_LABEL[doc.type]}</div>
        <DemoTag>fiktiv</DemoTag>
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-900">{c.name}</div>
      <div className="text-[10px] text-slate-500">{c.uid}</div>
      <div className="mt-3 space-y-1.5">
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i} className="h-1.5 rounded bg-slate-200" style={{ width: `${55 + ((i * 37) % 45)}%` }} />
        ))}
      </div>
      <div className="mt-4 text-[10px] text-slate-400">{doc.fileName}</div>
    </div>
  );
}

function DocReviewModal({ cs, c, doc, onClose }: { cs: OnboardingCase; c: Customer; doc: CaseDocument; onClose: () => void }) {
  const { state, act, actOk, role } = useStore();
  const person = doc.personId ? personOf(state, doc.personId) : undefined;
  const readable = READABLE_DOCS.includes(doc.type);
  const [reading, setReading] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [value, setValue] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const mayCheck = can(role, 'doc.check') && doc.status === 'hochgeladen';
  const started = useRef(false);

  useEffect(() => {
    if (!readable || doc.extracted || started.current || doc.status === 'fehlt') return;
    started.current = true;
    setReading(true);
    services.dokumentenleser.read(doc, c, person).then((fields) => {
      act(setExtracted, cs.id, doc.id, fields);
      setReading(false);
    });
  }, [readable, doc, c, person, act, cs.id]);

  const fields = doc.extracted ?? [];
  const open = fields.filter((f) => f.state === 'offen').length;
  const stale = doc.type === 'hr_auszug' && isStaleExtract(fields);

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={docTitle(doc, person ? `${person.firstName} ${person.lastName}` : undefined)}
      footer={
        mayCheck ? (
          rejecting ? (
            <>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Grund der Ablehnung, z. B. nicht unterzeichnet" className="max-w-sm" autoFocus />
              <Button variant="secondary" onClick={() => setRejecting(false)}>
                Abbrechen
              </Button>
              <Button
                variant="danger"
                disabled={reason.trim().length < 5}
                onClick={() => {
                  act(rejectDocument, cs.id, doc.id, reason);
                  onClose();
                }}
              >
                Ablehnen
              </Button>
            </>
          ) : (
            <>
              <Button variant="danger" onClick={() => setRejecting(true)}>
                Ablehnen …
              </Button>
              <Button
                variant="success"
                icon={<Check className="size-4" />}
                disabled={reading || open > 0}
                onClick={() => {
                  if (actOk(checkDocument, cs.id, doc.id)) onClose();
                }}
              >
                Als geprüft markieren
              </Button>
            </>
          )
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Schliessen
          </Button>
        )
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="rounded-lg bg-slate-100 p-4">
          <DocPreview doc={doc} c={c} personName={person ? `${person.firstName} ${person.lastName}` : undefined} />
          <p className="mt-3 text-center text-xs text-slate-500">
            {doc.fileName} · {doc.uploadedAt ? `hochgeladen am ${fmtDateTime(doc.uploadedAt)} von ${userName(doc.uploadedBy)}` : ''}
          </p>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800">Erkannte Daten</h4>
            <DemoTag>Auslesen simuliert</DemoTag>
          </div>
          {!readable && <InfoBox>Für diesen Dokumenttyp werden keine Daten ausgelesen. Bitte Inhalt visuell prüfen (Vollständigkeit, Unterschriften, Datum).</InfoBox>}
          {reading && <Spinner text="Dokument wird ausgelesen …" />}
          {!reading && fields.length > 0 && (
            <>
              {stale && (
                <div className="mb-3">
                  <InfoBox tone="red" title="Handelsregisterauszug älter als 12 Monate">
                    Bitte aktuellen Auszug verlangen oder Datum korrigieren.
                  </InfoBox>
                </div>
              )}
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {fields.map((f) => {
                  const shown = f.corrected ?? f.value;
                  const mismatch = f.expected !== undefined && shown !== f.expected;
                  return (
                    <li key={f.key} className={cx('px-3 py-2', mismatch && f.state === 'offen' && 'bg-red-50')}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs text-slate-500">{f.label}</div>
                          {editing === f.key ? (
                            <div className="mt-1 flex gap-1.5">
                              <Input value={value} onChange={(e) => setValue(e.target.value)} className="h-8" autoFocus />
                              <Button
                                size="sm"
                                onClick={() => {
                                  act(confirmField, cs.id, doc.id, f.key, value);
                                  setEditing(null);
                                }}
                              >
                                OK
                              </Button>
                            </div>
                          ) : (
                            <div className={cx('text-sm font-medium', mismatch ? 'text-red-800' : 'text-slate-900')}>
                              {shown}
                              {f.state === 'korrigiert' && <span className="ml-2 text-xs font-normal text-slate-500 line-through">{f.value}</span>}
                            </div>
                          )}
                          {mismatch && <div className="text-xs text-red-700">Abweichung zu Fall-Daten: {f.expected}</div>}
                        </div>
                        {editing !== f.key && (
                          <div className="flex shrink-0 items-center gap-1">
                            {f.state === 'bestaetigt' && <Badge tone="green">bestätigt</Badge>}
                            {f.state === 'korrigiert' && <Badge tone="amber">korrigiert</Badge>}
                            {mayCheck && (
                              <>
                                <button type="button" title="Bestätigen" onClick={() => act(confirmField, cs.id, doc.id, f.key)} className="rounded p-1.5 text-emerald-700 hover:bg-emerald-50">
                                  <Check className="size-4" />
                                </button>
                                <button
                                  type="button"
                                  title="Korrigieren"
                                  onClick={() => {
                                    setEditing(f.key);
                                    setValue(f.expected ?? shown);
                                  }}
                                  className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                                >
                                  <Pencil className="size-4" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
              {mayCheck && open > 0 && <p className="mt-2 text-xs text-slate-500">Noch {open} Feld(er) bestätigen oder korrigieren.</p>}
            </>
          )}
          {!mayCheck && doc.status === 'hochgeladen' && <p className="mt-3 text-xs text-slate-500">Die Prüfung erfolgt durch das Backoffice.</p>}
          {doc.status === 'abgelehnt' && (
            <div className="mt-3">
              <InfoBox tone="red" title="Abgelehnt">
                {doc.rejectReason}
              </InfoBox>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
