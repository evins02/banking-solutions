import { useState } from 'react';
import { Calculator, ShieldCheck } from 'lucide-react';
import { useStore } from '../../store';
import { calculateRisk, confirmRisk, overrideRisk } from '../../lib/actions';
import { assessRisk, can } from '../../lib/domain';
import { fmtDateTime } from '../../lib/format';
import { userName } from '../../data/users';
import type { Customer, OnboardingCase, RiskAssessment, RiskLevel } from '../../types';
import { Badge, Button, Card, cx, Field, InfoBox, Modal, RiskBadge, Select, Table, td, Textarea, th } from '../../components/ui';

export function RiskTable({ risk }: { risk: RiskAssessment }) {
  return (
    <Table>
      <thead className="bg-slate-50/60">
        <tr>
          <th className={th}>Kriterium</th>
          <th className={th}>Ausprägung</th>
          <th className={`${th} text-right`}>Punkte</th>
          <th className={th}>Begründung</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {risk.results.map((r) => (
          <tr key={r.criterionId}>
            <td className={`${td} font-medium text-slate-900`}>{r.label}</td>
            <td className={td}>{r.value}</td>
            <td className={cx(td, 'text-right font-semibold tabular', r.points > 0 ? 'text-slate-900' : 'text-slate-400')}>{r.points}</td>
            <td className={td}>
              {r.reason}
              {r.mandatory && (
                <Badge tone="red" className="ml-2">
                  zwingend GmeR
                </Badge>
              )}
            </td>
          </tr>
        ))}
        <tr className="bg-slate-50">
          <td className={`${td} font-semibold`} colSpan={2}>
            Total (Schwelle GmeR ab {risk.threshold} Punkten)
          </td>
          <td className={`${td} text-right text-base font-semibold tabular`}>{risk.total}</td>
          <td className={td}>
            Vorschlag: <RiskBadge level={risk.computed} />
          </td>
        </tr>
      </tbody>
    </Table>
  );
}

export function RiskTab({ cs, c, editable }: { cs: OnboardingCase; c: Customer; editable: boolean }) {
  const { state, act, role } = useStore();
  const [overriding, setOverriding] = useState(false);
  const [level, setLevel] = useState<RiskLevel>('gmer');
  const [reason, setReason] = useState('');
  const preview = assessRisk({ customer: c, persons: state.persons }, state.settings);
  const risk = cs.risk ?? preview;
  const stored = Boolean(cs.risk);
  const mayConfirm = can(role, 'risk.confirm') && cs.status === 'eingereicht';
  const outdated = stored && cs.risk!.total !== preview.total && !cs.risk!.confirmedAt;

  return (
    <div className="grid gap-5 xl:grid-cols-3">
      <Card
        title="Risikoeinstufung (Punktemodell)"
        subtitle={stored ? 'Berechnet beim Einreichen bzw. auf Anfrage – Kriterien in den Einstellungen konfigurierbar' : 'Vorschau auf Basis der aktuellen Angaben – wird beim Einreichen gespeichert'}
        className="xl:col-span-2"
        padded={false}
        actions={
          (editable || mayConfirm) && (
            <Button variant="secondary" size="sm" icon={<Calculator className="size-4" />} onClick={() => act(calculateRisk, cs.id)}>
              {stored ? 'Neu berechnen' : 'Berechnen'}
            </Button>
          )
        }
      >
        <RiskTable risk={risk} />
        {outdated && (
          <div className="p-4">
            <InfoBox tone="amber" title="Angaben wurden seit der Berechnung geändert">
              Aktuelle Angaben ergeben {preview.total} Punkte. Bitte neu berechnen.
            </InfoBox>
          </div>
        )}
      </Card>

      <Card title="Ergebnis">
        <div className="flex items-center gap-3">
          <span className={cx('grid size-12 place-items-center rounded-full text-sm font-bold', risk.final === 'gmer' ? 'bg-red-50 text-red-700 ring-2 ring-red-200' : 'bg-slate-100 text-slate-700 ring-2 ring-slate-200')}>{risk.total}</span>
          <div>
            <div className="text-sm text-slate-500">Einstufung</div>
            <div className="text-lg font-semibold text-slate-900">{risk.final === 'gmer' ? 'GmeR – erhöhtes Risiko' : 'Normales Risiko'}</div>
          </div>
        </div>
        {risk.override && (
          <div className="mt-3">
            <InfoBox tone="amber" title={`Übersteuert durch ${userName(risk.override.by)} am ${fmtDateTime(risk.override.at)}`}>
              Vorschlag {risk.computed === 'gmer' ? 'GmeR' : 'Normal'} → {risk.override.level === 'gmer' ? 'GmeR' : 'Normal'}. Begründung: {risk.override.reason}
            </InfoBox>
          </div>
        )}
        {risk.final === 'gmer' && (
          <p className="mt-3 text-sm text-slate-600">
            Bei GmeR ist eine <strong>zweite Freigabe</strong> durch die Leitung Compliance nötig (Vier-Augen-Prinzip). Überprüfungsintervall: {state.settings.reviewYears.gmer} Jahr(e).
          </p>
        )}
        <div className="mt-4 border-t border-slate-100 pt-3 text-sm">
          {risk.confirmedAt ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <ShieldCheck className="size-4" /> Bestätigt durch {userName(risk.confirmedBy)} am {fmtDateTime(risk.confirmedAt)}
            </span>
          ) : (
            <span className="text-slate-500">Noch nicht durch Compliance bestätigt. Die App schlägt vor – entscheiden tut eine Person.</span>
          )}
        </div>
        {mayConfirm && stored && (
          <div className="mt-3 flex flex-wrap gap-2">
            <Button onClick={() => act(confirmRisk, cs.id)} disabled={Boolean(risk.confirmedAt)}>
              Einstufung bestätigen
            </Button>
            <Button variant="secondary" onClick={() => {
              setLevel(risk.final === 'gmer' ? 'normal' : 'gmer');
              setOverriding(true);
            }}>
              Übersteuern …
            </Button>
          </div>
        )}
        {!stored && can(role, 'risk.confirm') && <p className="mt-3 text-xs text-slate-500">Bestätigen ist möglich, sobald der Fall eingereicht ist.</p>}
      </Card>

      <Modal
        open={overriding}
        onClose={() => setOverriding(false)}
        title="Risikoeinstufung übersteuern"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOverriding(false)}>
              Abbrechen
            </Button>
            <Button
              disabled={reason.trim().length < 30}
              onClick={() => {
                act(overrideRisk, cs.id, level, reason);
                setOverriding(false);
                setReason('');
              }}
            >
              Übersteuern
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Neue Einstufung">
            <Select value={level} onChange={(e) => setLevel(e.target.value as RiskLevel)}>
              <option value="normal">Normales Risiko</option>
              <option value="gmer">GmeR – erhöhtes Risiko</option>
            </Select>
          </Field>
          <Field label="Begründung (Pflichtfeld)" hint={`${reason.trim().length} / mind. 30 Zeichen`}>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Konkrete Gründe für die Abweichung vom Punktemodell" />
          </Field>
          {risk.results.some((r) => r.mandatory) && level === 'normal' && (
            <InfoBox tone="red" title="Achtung">
              Ein Kriterium verlangt zwingend GmeR (ausländische PEP). Eine Herabstufung ist regulatorisch nicht zulässig.
            </InfoBox>
          )}
        </div>
      </Modal>
    </div>
  );
}
