import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useStore } from '../../store';
import { CASE_STATUS_LABEL, LEGAL_FORMS } from '../../lib/catalog';
import { can, missingDocs } from '../../lib/domain';
import { daysBetween, nowIso } from '../../lib/format';
import { customerOf } from '../../lib/selectors';
import { userName } from '../../data/users';
import type { CaseStatus } from '../../types';
import { go, href } from '../../router';
import { Badge, Button, Card, Empty, Input, PageHeader, RiskBadge, Select, Table, td, th } from '../../components/ui';
import { CaseStatusBadge } from '../../components/status';

export function CaseList() {
  const { state, role } = useStore();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<CaseStatus | 'offen' | ''>('offen');
  const [form, setForm] = useState('');

  const rows = useMemo(
    () =>
      state.cases
        .map((cs) => ({ cs, c: customerOf(state, cs.customerId)! }))
        .filter(({ cs, c }) => {
          if (status === 'offen' && cs.status === 'eroeffnet') return false;
          if (status && status !== 'offen' && cs.status !== status) return false;
          if (form && c.legalForm !== form) return false;
          const s = q.trim().toLowerCase();
          return !s || `${c.name} ${c.uid} ${cs.number} ${userName(cs.advisorId)}`.toLowerCase().includes(s);
        })
        .sort((a, b) => b.cs.createdAt.localeCompare(a.cs.createdAt)),
    [state, q, status, form],
  );

  return (
    <>
      <PageHeader
        title="Onboarding Firmenkunden"
        subtitle="Alle Fälle von der Erfassung bis zur Eröffnung"
        actions={can(role, 'case.create') ? <Button icon={<Plus className="size-4" />} onClick={() => go('/onboarding/neu')}>Neuer Fall</Button> : null}
      />
      <Card padded={false}>
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Firma, UID, Fallnummer oder Kundenberater/in" className="pl-8" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as CaseStatus)} className="w-auto">
            <option value="offen">Alle offenen</option>
            <option value="">Alle</option>
            {(Object.keys(CASE_STATUS_LABEL) as CaseStatus[]).map((s) => (
              <option key={s} value={s}>
                {CASE_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
          <Select value={form} onChange={(e) => setForm(e.target.value)} className="w-auto">
            <option value="">Alle Rechtsformen</option>
            {LEGAL_FORMS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </Select>
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            <Empty>Keine Fälle gefunden.</Empty>
          </div>
        ) : (
          <Table>
            <thead className="bg-slate-50/60">
              <tr>
                <th className={th}>Fall</th>
                <th className={th}>Firma</th>
                <th className={th}>Rechtsform</th>
                <th className={th}>Kundenberater/in</th>
                <th className={th}>Status</th>
                <th className={th}>Risiko</th>
                <th className={`${th} text-right`}>Tage seit Eröffnung</th>
                <th className={th}>Fehlende Unterlagen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map(({ cs, c }) => {
                const missing = missingDocs(cs.documents).length;
                const days = daysBetween(cs.createdAt, cs.closedAt ?? nowIso());
                return (
                  <tr key={cs.id} className="cursor-pointer hover:bg-slate-50" onClick={() => go(`/onboarding/${cs.id}`)}>
                    <td className={td}>
                      <a href={href(`/onboarding/${cs.id}`)} className="font-medium text-brand-700 hover:underline">
                        {cs.number}
                      </a>
                      {cs.kind === 'aktualisierung' && (
                        <Badge tone="violet" className="ml-2">
                          verkürzt
                        </Badge>
                      )}
                    </td>
                    <td className={td}>
                      <div className="font-medium text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">
                        {c.uid} · {c.seat} {c.canton}
                      </div>
                    </td>
                    <td className={td}>{c.legalForm}</td>
                    <td className={td}>{userName(cs.advisorId)}</td>
                    <td className={td}>
                      <CaseStatusBadge status={cs.status} />
                    </td>
                    <td className={td}>
                      <RiskBadge level={cs.risk?.final} />
                    </td>
                    <td className={`${td} text-right tabular`}>{days}</td>
                    <td className={td}>{missing ? <Badge tone="amber">{missing} fehlen</Badge> : <span className="text-slate-400">–</span>}</td>
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
