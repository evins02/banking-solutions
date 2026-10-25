import { useMemo, useState } from 'react';
import { Activity, Radio, Search, Zap } from 'lucide-react';
import { useStore } from '../../store';
import { services } from '../../services';
import { applyHrMutation, simulateEvent, volumeCheck } from '../../lib/actions';
import { EVENT_LABEL } from '../../lib/catalog';
import { daysFromNow, fmtDate, fmtDateTime } from '../../lib/format';
import { customerOf } from '../../lib/selectors';
import type { EventType, Review } from '../../types';
import type { HrMutation } from '../../services/handelsregister';
import { go, href } from '../../router';
import { AmpelDot, Badge, Button, Card, DemoTag, Empty, Field, Input, Modal, PageHeader, RiskBadge, Select, Table, Tabs, td, th } from '../../components/ui';
import { ReviewStatusBadge } from '../../components/status';

const dueAmpel = (iso: string) => (daysFromNow(iso) < 0 ? 'rot' : daysFromNow(iso) <= 30 ? 'gelb' : 'gruen');
const dueText = (iso: string) => {
  const d = daysFromNow(iso);
  return d < 0 ? `${fmtDate(iso)} · überfällig seit ${-d} T` : `${fmtDate(iso)} · in ${d} T`;
};

function Progress() {
  const { state } = useStore();
  const year = new Date().getFullYear();
  const inYear = (iso?: string) => Boolean(iso && new Date(iso).getFullYear() === year);
  const done = state.reviews.filter((r) => r.status === 'abgeschlossen' && inYear(r.closedAt)).length + state.history.reviewsDoneYear;
  const open = state.reviews.filter((r) => r.status !== 'abgeschlossen');
  const overdue = open.filter((r) => daysFromNow(r.dueAt) < 0).length;
  const dueRest = state.customers.filter((c) => c.status === 'aktiv' && inYear(c.nextReviewAt) && !open.some((r) => r.customerId === c.id) && daysFromNow(c.nextReviewAt!) >= 0).length;
  const total = done + open.length + dueRest;
  const pct = (n: number) => `${(n / total) * 100}%`;
  return (
    <Card title={`Fortschritt ${year}`} subtitle={`${total} Überprüfungen fällig in diesem Jahr`}>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        <div className="bg-emerald-500" style={{ width: pct(done) }} title="erledigt" />
        <div className="bg-brand-500" style={{ width: pct(open.length - overdue) }} title="in Arbeit" />
        <div className="bg-red-600" style={{ width: pct(overdue) }} title="überfällig" />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        {[
          ['Erledigt', done, 'bg-emerald-500'],
          ['In Arbeit', open.length - overdue, 'bg-brand-500'],
          ['Überfällig', overdue, 'bg-red-600'],
          ['Noch nicht gestartet', dueRest, 'bg-slate-200'],
        ].map(([k, v, c]) => (
          <div key={k as string}>
            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className={`size-2.5 rounded-full ${c}`} aria-hidden />
              {k}
            </dt>
            <dd className="text-lg font-semibold tabular text-slate-900">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function EventSimulator() {
  const { state, act, toast } = useStore();
  const active = state.customers.filter((c) => c.status === 'aktiv').sort((a, b) => a.name.localeCompare(b.name));
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(active[0]?.id ?? '');
  const [type, setType] = useState<'hr:neue_zeichnung' | 'hr:sitzverlegung' | 'hr:zweck' | Exclude<EventType, 'hr_mutation'>>('hr:neue_zeichnung');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);

  const run = async () => {
    const c = customerOf(state, customerId);
    if (!c) return;
    setLoading(true);
    let review: Review | undefined;
    if (type.startsWith('hr:')) {
      const m: HrMutation = await services.handelsregister.simulateMutation(c, type.slice(3) as HrMutation['kind']);
      review = act(applyHrMutation, c.id, m);
    } else {
      review = act(simulateEvent, c.id, type as Exclude<EventType, 'hr_mutation'>);
    }
    setLoading(false);
    setOpen(false);
    if (review) {
      toast(`Ereignis erfasst – Überprüfung ${review.number} ${review.eventIds.length > 1 ? 'ergänzt' : 'automatisch erstellt'}.`);
      go(`/kyc/${review.id}`);
    }
  };

  const runVolume = async () => {
    setChecking(true);
    await new Promise((r) => setTimeout(r, 800));
    const n = act(volumeCheck);
    setChecking(false);
    if (n !== undefined) toast(n ? `${n} Abweichung(en) gefunden – Überprüfungen erstellt.` : 'Keine neuen Abweichungen über der Schwelle.', 'info');
  };

  return (
    <>
      <Button variant="secondary" icon={<Activity className="size-4" />} onClick={runVolume} loading={checking}>
        Volumenabgleich ausführen
      </Button>
      <Button icon={<Zap className="size-4" />} onClick={() => setOpen(true)}>
        Ereignis simulieren
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={
          <span className="flex items-center gap-2">
            Ereignis simulieren <DemoTag />
          </span>
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={run} loading={loading}>
              Ereignis auslösen
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p className="text-sm text-slate-600">Simuliert eine Meldung aus einer externen Quelle. Die App erzeugt automatisch eine KYC-Überprüfung oder ergänzt eine offene.</p>
          <Field label="Kunde">
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              {active.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Ereignis">
            <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
              <optgroup label="Handelsregister (SHAB)">
                <option value="hr:neue_zeichnung">Neue zeichnungsberechtigte Person</option>
                <option value="hr:sitzverlegung">Sitzverlegung</option>
                <option value="hr:zweck">Änderung des Zwecks</option>
              </optgroup>
              <option value="tr_meldung">Neue Meldung im Transparenzregister</option>
              <option value="alarm_eskaliert">Eskalierter Alarm (Modul 2)</option>
              <option value="volumen_abweichung">Abweichung Transaktionsvolumen</option>
            </Select>
          </Field>
        </div>
      </Modal>
    </>
  );
}

function ReviewList() {
  const { state } = useStore();
  const [filter, setFilter] = useState<'offen' | 'alle' | 'periodisch' | 'ereignis'>('offen');
  const rows = state.reviews
    .filter((r) => (filter === 'offen' ? r.status !== 'abgeschlossen' : filter === 'alle' ? true : r.trigger === filter && r.status !== 'abgeschlossen'))
    .sort((a, b) => (a.status === 'abgeschlossen' ? 1 : 0) - (b.status === 'abgeschlossen' ? 1 : 0) || a.dueAt.localeCompare(b.dueAt));
  return (
    <Card
      padded={false}
      title="Überprüfungen"
      actions={
        <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="w-auto">
          <option value="offen">Alle offenen</option>
          <option value="periodisch">Periodisch (offen)</option>
          <option value="ereignis">Ereignisgesteuert (offen)</option>
          <option value="alle">Alle inkl. abgeschlossen</option>
        </Select>
      }
    >
      {rows.length === 0 ? (
        <div className="p-4">
          <Empty>Keine Überprüfungen.</Empty>
        </div>
      ) : (
        <Table>
          <thead className="bg-slate-50/60">
            <tr>
              <th className={th}>Nr.</th>
              <th className={th}>Kunde</th>
              <th className={th}>Risiko</th>
              <th className={th}>Auslöser</th>
              <th className={th}>Fälligkeit</th>
              <th className={th}>Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const c = customerOf(state, r.customerId)!;
              const evs = state.events.filter((e) => r.eventIds.includes(e.id));
              return (
                <tr key={r.id} className="cursor-pointer hover:bg-slate-50" onClick={() => go(`/kyc/${r.id}`)}>
                  <td className={td}>
                    <a href={href(`/kyc/${r.id}`)} className="font-medium text-brand-700 hover:underline">
                      {r.number}
                    </a>
                  </td>
                  <td className={td}>
                    <div className="font-medium text-slate-900">{c.name}</div>
                    <div className="text-xs text-slate-500">
                      {c.legalForm} · {c.seat}
                    </div>
                  </td>
                  <td className={td}>
                    <RiskBadge level={c.riskLevel} />
                  </td>
                  <td className={td}>
                    {r.trigger === 'periodisch' ? (
                      <Badge>Periodisch</Badge>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {evs.map((e) => (
                          <Badge key={e.id} tone="violet">
                            <Radio className="size-3" /> {EVENT_LABEL[e.type]}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {r.riskRecheck && (
                      <Badge tone="red" className="ml-1 mt-1">
                        Risiko prüfen
                      </Badge>
                    )}
                  </td>
                  <td className={td}>{r.status === 'abgeschlossen' ? <span className="text-xs text-slate-500">erledigt {fmtDate(r.closedAt)}</span> : <AmpelDot value={dueAmpel(r.dueAt)} text={dueText(r.dueAt)} />}</td>
                  <td className={td}>
                    <ReviewStatusBadge status={r.status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

function CustomerBase() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [risk, setRisk] = useState('');
  const rows = useMemo(
    () =>
      state.customers
        .filter((c) => c.status === 'aktiv')
        .filter((c) => (!risk || c.riskLevel === risk) && (!q || `${c.name} ${c.uid} ${c.seat}`.toLowerCase().includes(q.toLowerCase())))
        .sort((a, b) => (a.nextReviewAt ?? '').localeCompare(b.nextReviewAt ?? '')),
    [state.customers, q, risk],
  );
  return (
    <Card padded={false} title="Kundenbestand Firmenkunden" subtitle={`Intervall: GmeR alle ${state.settings.reviewYears.gmer} Jahr(e), normales Risiko alle ${state.settings.reviewYears.normal} Jahre (Einstellungen)`}>
      <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma, UID oder Ort" className="pl-8" />
        </div>
        <Select value={risk} onChange={(e) => setRisk(e.target.value)} className="w-auto">
          <option value="">Alle Risikostufen</option>
          <option value="gmer">GmeR</option>
          <option value="normal">Normal</option>
        </Select>
      </div>
      <Table>
        <thead className="bg-slate-50/60">
          <tr>
            <th className={th}>Firma</th>
            <th className={th}>Rechtsform</th>
            <th className={th}>Kanton</th>
            <th className={th}>Risiko</th>
            <th className={th}>Letzte Überprüfung</th>
            <th className={th}>Nächste Fälligkeit</th>
            <th className={th}>Überprüfung</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((c) => {
            const r = state.reviews.find((x) => x.customerId === c.id && x.status !== 'abgeschlossen');
            return (
              <tr key={c.id}>
                <td className={td}>
                  <div className="font-medium text-slate-900">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.uid}</div>
                </td>
                <td className={td}>{c.legalForm}</td>
                <td className={td}>{c.canton}</td>
                <td className={td}>
                  <RiskBadge level={c.riskLevel} score={c.riskScore} />
                </td>
                <td className={`${td} tabular`}>{fmtDate(c.lastReviewAt)}</td>
                <td className={td}>{c.nextReviewAt ? <AmpelDot value={dueAmpel(c.nextReviewAt)} text={dueText(c.nextReviewAt)} /> : '–'}</td>
                <td className={td}>
                  {r ? (
                    <a href={href(`/kyc/${r.id}`)} className="text-brand-700 hover:underline">
                      {r.number}
                    </a>
                  ) : (
                    <span className="text-slate-400">–</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </Card>
  );
}

function EventLog() {
  const { state } = useStore();
  const evs = [...state.events].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <Card padded={false} title="Ereignisse (laufendes KYC)" subtitle="Meldungen aus Handelsregister, Transparenzregister und Transaktionsüberwachung">
      {evs.length === 0 ? (
        <div className="p-4">
          <Empty>Keine Ereignisse.</Empty>
        </div>
      ) : (
        <Table>
          <thead className="bg-slate-50/60">
            <tr>
              <th className={th}>Datum</th>
              <th className={th}>Kunde</th>
              <th className={th}>Ereignis</th>
              <th className={th}>Quelle</th>
              <th className={th}>Überprüfung</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {evs.map((e) => {
              const r = state.reviews.find((x) => x.id === e.reviewId);
              return (
                <tr key={e.id}>
                  <td className={`${td} whitespace-nowrap tabular`}>{fmtDateTime(e.date)}</td>
                  <td className={`${td} font-medium text-slate-900`}>{customerOf(state, e.customerId)?.name}</td>
                  <td className={td}>
                    <div className="font-medium">{e.title}</div>
                    <div className="text-xs text-slate-500">{e.detail}</div>
                  </td>
                  <td className={`${td} text-xs`}>{e.source}</td>
                  <td className={td}>
                    {r && (
                      <a href={href(`/kyc/${r.id}`)} className="text-brand-700 hover:underline">
                        {r.number}
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </Card>
  );
}

export function ReviewsPage({ tab }: { tab: 'reviews' | 'bestand' | 'ereignisse' }) {
  return (
    <>
      <PageHeader title="Periodische und laufende KYC-Überprüfung" subtitle="Fällige Überprüfungen und ereignisgesteuerte Auslöser" actions={<EventSimulator />} />
      <div className="mb-5">
        <Progress />
      </div>
      <Tabs
        value={tab}
        onChange={(t) => go(t === 'reviews' ? '/kyc' : `/kyc/${t}`)}
        tabs={[
          { id: 'reviews', label: 'Überprüfungen' },
          { id: 'bestand', label: 'Kundenbestand' },
          { id: 'ereignisse', label: 'Ereignisse' },
        ]}
      />
      {tab === 'reviews' && <ReviewList />}
      {tab === 'bestand' && <CustomerBase />}
      {tab === 'ereignisse' && <EventLog />}
    </>
  );
}
