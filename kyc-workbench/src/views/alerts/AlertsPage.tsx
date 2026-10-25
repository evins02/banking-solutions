import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Search, Wrench } from 'lucide-react';
import { useStore } from '../../store';
import { SCENARIO_LABEL, SCENARIO_RULE } from '../../lib/catalog';
import { deadlineAmpel, fmtChf, fmtDate, fmtNumber, fmtRemaining } from '../../lib/format';
import { customerOf, isOverdue } from '../../lib/selectors';
import { userName } from '../../data/users';
import type { AlertStatus, Priority, ScenarioId } from '../../types';
import { go, href } from '../../router';
import { AmpelDot, Badge, Card, Empty, Input, PageHeader, Select, Stat, Table, Tabs, td, th } from '../../components/ui';
import { AlertStatusBadge, OutcomeBadge, PriorityBadge } from '../../components/status';

const PRIO_ORDER: Record<Priority, number> = { hoch: 0, mittel: 1, tief: 2 };

function Queue() {
  const { state } = useStore();
  const [status, setStatus] = useState<'aktiv' | AlertStatus | ''>('aktiv');
  const [scenario, setScenario] = useState<ScenarioId | ''>('');
  const [prio, setPrio] = useState<Priority | ''>('');
  const [q, setQ] = useState('');

  const rows = useMemo(
    () =>
      state.alerts
        .filter((a) => {
          if (status === 'aktiv' && a.status === 'abgeschlossen') return false;
          if (status && status !== 'aktiv' && a.status !== status) return false;
          if (scenario && a.scenario !== scenario) return false;
          if (prio && a.priority !== prio) return false;
          const s = q.trim().toLowerCase();
          return !s || `${a.id} ${customerOf(state, a.customerId)?.name}`.toLowerCase().includes(s);
        })
        .sort((a, b) => {
          if (a.status === 'abgeschlossen' || b.status === 'abgeschlossen') return (b.closedAt ?? '').localeCompare(a.closedAt ?? '');
          return a.dueAt.localeCompare(b.dueAt) || PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
        }),
    [state, status, scenario, prio, q],
  );

  const open = state.alerts.filter((a) => a.status === 'offen' || a.status === 'in_bearbeitung');

  return (
    <>
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Offen / in Bearbeitung" value={open.length} />
        <Stat label="Über der Bearbeitungsfrist" value={state.alerts.filter(isOverdue).length} tone="red" />
        <Stat label="Eskaliert (bei Leitung)" value={state.alerts.filter((a) => a.status === 'eskaliert').length} />
        <Stat label="Priorität hoch, offen" value={open.filter((a) => a.priority === 'hoch').length} tone="amber" />
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Alarm-ID oder Kunde" className="pl-8" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as AlertStatus)} className="w-auto">
            <option value="aktiv">Alle nicht abgeschlossenen</option>
            <option value="">Alle</option>
            <option value="offen">Offen</option>
            <option value="in_bearbeitung">In Bearbeitung</option>
            <option value="eskaliert">Eskaliert</option>
            <option value="abgeschlossen">Abgeschlossen</option>
          </Select>
          <Select value={scenario} onChange={(e) => setScenario(e.target.value as ScenarioId)} className="w-auto">
            <option value="">Alle Szenarien</option>
            {(Object.keys(SCENARIO_LABEL) as ScenarioId[]).map((s) => (
              <option key={s} value={s}>
                {SCENARIO_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select value={prio} onChange={(e) => setPrio(e.target.value as Priority)} className="w-auto">
            <option value="">Alle Prioritäten</option>
            <option value="hoch">Hoch</option>
            <option value="mittel">Mittel</option>
            <option value="tief">Tief</option>
          </Select>
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            <Empty>Keine Alarme.</Empty>
          </div>
        ) : (
          <Table>
            <thead className="bg-slate-50/60">
              <tr>
                <th className={th}>Alarm-ID</th>
                <th className={th}>Kunde</th>
                <th className={th}>Szenario</th>
                <th className={`${th} text-right`}>Betrag</th>
                <th className={th}>Datum</th>
                <th className={th}>Priorität</th>
                <th className={th}>Frist</th>
                <th className={th}>Status</th>
                <th className={th}>Bearbeitung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((a) => {
                const c = customerOf(state, a.customerId);
                const active = a.status === 'offen' || a.status === 'in_bearbeitung';
                return (
                  <tr key={a.id} className="cursor-pointer hover:bg-slate-50" onClick={() => go(`/alarme/${a.id}`)}>
                    <td className={td}>
                      <a href={href(`/alarme/${a.id}`)} className="font-medium text-brand-700 hover:underline">
                        {a.id}
                      </a>
                    </td>
                    <td className={td}>
                      <div className="font-medium text-slate-900">{c?.name}</div>
                      {c?.riskLevel === 'gmer' && <Badge tone="red">GmeR</Badge>}
                    </td>
                    <td className={td}>{SCENARIO_LABEL[a.scenario]}</td>
                    <td className={`${td} text-right tabular`}>{fmtChf(a.amount)}</td>
                    <td className={`${td} tabular`}>{fmtDate(a.triggeredAt)}</td>
                    <td className={td}>
                      <PriorityBadge priority={a.priority} />
                    </td>
                    <td className={td}>
                      {active ? <AmpelDot value={deadlineAmpel(a.triggeredAt, a.dueAt)} text={fmtRemaining(a.dueAt)} /> : a.status === 'eskaliert' ? <span className="text-xs text-slate-500">bei Leitung bis {fmtDate(a.dueAt)}</span> : <span className="text-slate-400">–</span>}
                    </td>
                    <td className={td}>{a.outcome ? <OutcomeBadge outcome={a.outcome} /> : <AlertStatusBadge status={a.status} />}</td>
                    <td className={`${td} text-xs text-slate-500`}>{userName(a.assigneeId)}</td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}

function Analytics() {
  const { state } = useStore();
  const rows = (Object.keys(SCENARIO_LABEL) as ScenarioId[]).map((s) => {
    const hist = state.history.scenarios.find((h) => h.scenario === s) ?? { total: 0, falsePositive: 0, avgMinutes: 0 };
    const closed = state.alerts.filter((a) => a.scenario === s && a.status === 'abgeschlossen');
    const fp = closed.filter((a) => a.outcome === 'falsch_positiv').length;
    const total = hist.total + closed.length;
    const minutes = hist.avgMinutes * hist.total + closed.reduce((sum, a) => sum + (a.handlingMinutes ?? 0), 0);
    const rate = total ? ((hist.falsePositive + fp) / total) * 100 : 0;
    return { s, total, rate, avgMinutes: total ? minutes / total : 0, open: state.alerts.filter((a) => a.scenario === s && a.status !== 'abgeschlossen').length };
  });
  const chart = rows.map((r) => ({ name: SCENARIO_LABEL[r.s], rate: Math.round(r.rate * 10) / 10, candidate: r.rate > 90 }));

  return (
    <div className="grid gap-5">
      <Card title="Anteil falsch positiver Alarme je Szenario" subtitle="Letzte 12 Monate inkl. laufend abgeschlossener Alarme · gestrichelte Linie = 90 %">
        <div className="h-64 max-w-4xl">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
              <CartesianGrid stroke="#eef1f5" horizontal={false} />
              <XAxis type="number" domain={[0, 100]} unit=" %" tick={{ fontSize: 12, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" width={210} tick={{ fontSize: 12, fill: '#334155' }} tickLine={false} axisLine={false} />
              <Tooltip formatter={(v) => [`${fmtNumber(Number(v), 1)} %`, 'falsch positiv']} cursor={{ fill: '#f1f5f9' }} contentStyle={{ fontSize: 13, borderRadius: 6 }} />
              <ReferenceLine x={90} stroke="#b91c1c" strokeDasharray="4 3" />
              <Bar dataKey="rate" radius={[0, 4, 4, 0]} barSize={18}>
                {chart.map((c) => (
                  <Cell key={c.name} fill={c.candidate ? '#1f3466' : '#93a6cf'} />
                ))}
                <LabelList dataKey="rate" position="right" formatter={(v: unknown) => `${fmtNumber(Number(v), 0)} %`} style={{ fontSize: 12, fill: '#334155' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Auswertung je Szenario" padded={false}>
        <Table>
          <thead className="bg-slate-50/60">
            <tr>
              <th className={th}>Szenario</th>
              <th className={`${th} text-right`}>Alarme</th>
              <th className={`${th} text-right`}>Falsch positiv</th>
              <th className={`${th} text-right`}>Ø Bearbeitung</th>
              <th className={`${th} text-right`}>Offen</th>
              <th className={th}>Hinweis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.s}>
                <td className={td}>
                  <div className="font-medium text-slate-900">{SCENARIO_LABEL[r.s]}</div>
                  <div className="text-xs text-slate-500">{SCENARIO_RULE[r.s]}</div>
                </td>
                <td className={`${td} text-right tabular`}>{r.total}</td>
                <td className={`${td} text-right tabular font-medium`}>{fmtNumber(r.rate, 1)} %</td>
                <td className={`${td} text-right tabular`}>{fmtNumber(r.avgMinutes, 0)} Min.</td>
                <td className={`${td} text-right tabular`}>{r.open}</td>
                <td className={td}>
                  {r.rate > 90 && (
                    <Badge tone="amber" title="Mehr als 90 % falsch positive Alarme">
                      <Wrench className="size-3" /> Kandidat für Feintuning
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
        <p className="px-4 py-3 text-xs text-slate-500">Szenarien mit über 90 % falsch positiven Alarmen sind Kandidaten für ein Feintuning der Schwellenwerte – Anpassungen erfolgen im Überwachungssystem, nicht in dieser App.</p>
      </Card>
    </div>
  );
}

export function AlertsPage({ tab }: { tab: 'queue' | 'auswertung' }) {
  return (
    <>
      <PageHeader title="Prüfung von AML-Alarmen" subtitle="Alarme aus der Transaktionsüberwachung (simuliert) plausibilisieren, abschliessen oder eskalieren" />
      <Tabs
        value={tab}
        onChange={(t) => go(t === 'queue' ? '/alarme' : '/alarme/auswertung')}
        tabs={[
          { id: 'queue', label: 'Warteschlange' },
          { id: 'auswertung', label: 'Auswertung' },
        ]}
      />
      {tab === 'queue' ? <Queue /> : <Analytics />}
    </>
  );
}
