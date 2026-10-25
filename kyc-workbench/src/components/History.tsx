import { useStore } from '../store';
import { fmtDateTime } from '../lib/format';
import { userName } from '../data/users';
import { ROLE_LABEL } from '../lib/catalog';
import type { AuditEntry } from '../types';
import { Empty } from './ui';

export const roleLabel = (r: AuditEntry['role']) => (r === 'kunde' ? 'Kunde' : r === 'system' ? 'System' : ROLE_LABEL[r]);

/** Verlauf aus dem Audit-Trail für die angegebenen Objekte (neueste zuerst) */
export function History({ objectIds, limit }: { objectIds: string[]; limit?: number }) {
  const { state } = useStore();
  const ids = new Set(objectIds);
  const entries = state.audit.filter((e) => ids.has(e.objectId)).reverse().slice(0, limit);
  if (!entries.length) return <Empty>Noch keine Einträge.</Empty>;
  return (
    <ol className="relative space-y-3 border-l border-slate-200 pl-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-white bg-brand-500" aria-hidden />
          <div className="text-sm">
            <span className="font-medium text-slate-900">{e.action}</span>
            {e.field && <span className="text-slate-500"> · {e.field}</span>}
          </div>
          {(e.oldValue || e.newValue) && (
            <div className="mt-0.5 text-[13px] text-slate-600">
              {e.oldValue && e.oldValue !== '–' && <span className="text-slate-400 line-through">{e.oldValue}</span>}
              {e.oldValue && e.oldValue !== '–' && ' → '}
              <span>{e.newValue}</span>
            </div>
          )}
          <div className="mt-0.5 text-xs text-slate-500">
            {fmtDateTime(e.at)} · {userName(e.userId)} ({roleLabel(e.role)})
          </div>
        </li>
      ))}
    </ol>
  );
}
