import { useMemo, useState } from 'react';
import { Download, Lock, Search, ShieldCheck, ShieldX } from 'lucide-react';
import { useStore } from '../store';
import { verifyAudit } from '../lib/actions';
import { fmtDateTime } from '../lib/format';
import { userName } from '../data/users';
import type { AuditEntry } from '../types';
import { Badge, Button, Card, Empty, Input, PageHeader, Select, Table, td, th } from '../components/ui';
import { roleLabel } from '../components/History';

const TYPES: AuditEntry['objectType'][] = ['Fall', 'Kunde', 'Dokument', 'Alarm', 'Überprüfung', 'Ereignis', 'Einstellungen', 'System'];
const PAGE = 100;

function csv(rows: AuditEntry[]): string {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Nr', 'Zeitstempel', 'Person', 'Rolle', 'Aktion', 'Objekttyp', 'Objekt', 'Feld', 'Alter Wert', 'Neuer Wert', 'Hash'];
  return [head, ...rows.map((e) => [e.seq, fmtDateTime(e.at), userName(e.userId), roleLabel(e.role), e.action, e.objectType, e.objectLabel, e.field, e.oldValue, e.newValue, e.hash])].map((r) => r.map(esc).join(';')).join('\n');
}

export function AuditTrail() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [type, setType] = useState('');
  const [role, setRole] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const integrity = useMemo(() => verifyAudit(state.audit), [state.audit]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return state.audit
      .filter((e) => (!type || e.objectType === type) && (!role || e.role === role))
      .filter((e) => !s || `${e.action} ${e.objectLabel} ${e.field ?? ''} ${e.oldValue ?? ''} ${e.newValue ?? ''} ${userName(e.userId)}`.toLowerCase().includes(s))
      .reverse();
  }, [state.audit, q, type, role]);

  const download = () => {
    const blob = new Blob(['﻿' + csv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader
        title="Audit-Trail"
        subtitle="Jede Aktion mit Zeitstempel, Person, Rolle sowie altem und neuem Wert – nur anfügen, nicht löschbar"
        actions={
          <Button variant="secondary" icon={<Download className="size-4" />} onClick={download}>
            CSV exportieren
          </Button>
        }
      />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card>
          <div className="flex items-center gap-3">
            {integrity.ok ? <ShieldCheck className="size-8 text-emerald-600" /> : <ShieldX className="size-8 text-red-600" />}
            <div>
              <div className="text-sm font-medium text-slate-900">{integrity.ok ? 'Hash-Kette intakt' : `Kette unterbrochen bei Nr. ${integrity.brokenAt}`}</div>
              <div className="text-xs text-slate-500">Jeder Eintrag enthält den Hash des Vorgängers (Demo, FNV-1a).</div>
            </div>
          </div>
        </Card>
        <Card>
          <div className="text-xs text-slate-500">Einträge total</div>
          <div className="text-2xl font-semibold tabular text-slate-900">{state.audit.length}</div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <Lock className="size-6 text-slate-500" />
            <div className="text-sm text-slate-600">Es gibt keine Funktion zum Ändern oder Löschen von Einträgen. Korrekturen erscheinen als neuer Eintrag.</div>
          </div>
        </Card>
      </div>
      <Card padded={false}>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Aktion, Objekt, Wert oder Person" className="pl-8" />
          </div>
          <Select value={type} onChange={(e) => setType(e.target.value)} className="w-auto">
            <option value="">Alle Objekte</option>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto">
            <option value="">Alle Rollen</option>
            <option value="kb">Kundenberater/in</option>
            <option value="compliance">Compliance</option>
            <option value="backoffice">Backoffice</option>
            <option value="leitung">Leitung Compliance</option>
            <option value="kunde">Kunde</option>
            <option value="system">System</option>
          </Select>
        </div>
        {rows.length === 0 ? (
          <div className="p-4">
            <Empty>Keine Einträge.</Empty>
          </div>
        ) : (
          <Table>
            <thead className="bg-slate-50/60">
              <tr>
                <th className={th}>Nr.</th>
                <th className={th}>Zeitstempel</th>
                <th className={th}>Person</th>
                <th className={th}>Aktion</th>
                <th className={th}>Objekt</th>
                <th className={th}>Alter Wert</th>
                <th className={th}>Neuer Wert</th>
                <th className={th}>Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, limit).map((e) => (
                <tr key={e.id} className="align-top">
                  <td className={`${td} tabular text-slate-500`}>{e.seq}</td>
                  <td className={`${td} whitespace-nowrap tabular`}>{fmtDateTime(e.at)}</td>
                  <td className={td}>
                    <div className="whitespace-nowrap font-medium text-slate-800">{userName(e.userId)}</div>
                    <div className="text-xs text-slate-500">{roleLabel(e.role)}</div>
                  </td>
                  <td className={td}>
                    <div className="text-slate-900">{e.action}</div>
                    {e.field && <div className="text-xs text-slate-500">{e.field}</div>}
                  </td>
                  <td className={td}>
                    <Badge>{e.objectType}</Badge>
                    <div className="mt-0.5 max-w-[220px] text-xs text-slate-600">{e.objectLabel}</div>
                  </td>
                  <td className={`${td} max-w-[220px] break-words text-xs text-slate-500`}>{e.oldValue ?? '–'}</td>
                  <td className={`${td} max-w-[320px] break-words text-xs text-slate-800`}>{e.newValue ?? '–'}</td>
                  <td className={`${td} font-mono text-[11px] text-slate-400`}>{e.hash}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {rows.length > limit && (
          <div className="border-t border-slate-100 p-3 text-center">
            <Button variant="ghost" onClick={() => setLimit(limit + PAGE)}>
              Weitere {Math.min(PAGE, rows.length - limit)} von {rows.length - limit} anzeigen
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
