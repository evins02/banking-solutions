import type { AlertOutcome, AlertStatus, CaseStatus, DocStatus, Priority, ReviewStatus } from '../types';
import { ALERT_STATUS_LABEL, CASE_STATUS_LABEL, DOC_STATUS_LABEL, OUTCOME_LABEL, PRIORITY_LABEL, REVIEW_STATUS_LABEL } from '../lib/catalog';
import { Badge, type Tone } from './ui';

const CASE_TONE: Record<CaseStatus, Tone> = {
  in_erfassung: 'neutral',
  eingereicht: 'blue',
  zweite_freigabe: 'violet',
  freigegeben: 'amber',
  eroeffnet: 'green',
  zurueckgewiesen: 'red',
};
export const CaseStatusBadge = ({ status }: { status: CaseStatus }) => <Badge tone={CASE_TONE[status]}>{CASE_STATUS_LABEL[status]}</Badge>;

const DOC_TONE: Record<DocStatus, Tone> = { fehlt: 'neutral', hochgeladen: 'blue', geprueft: 'green', abgelehnt: 'red' };
export const DocStatusBadge = ({ status }: { status: DocStatus }) => <Badge tone={DOC_TONE[status]}>{DOC_STATUS_LABEL[status]}</Badge>;

const ALERT_TONE: Record<AlertStatus, Tone> = { offen: 'neutral', in_bearbeitung: 'blue', eskaliert: 'violet', abgeschlossen: 'green' };
export const AlertStatusBadge = ({ status }: { status: AlertStatus }) => <Badge tone={ALERT_TONE[status]}>{ALERT_STATUS_LABEL[status]}</Badge>;

const OUTCOME_TONE: Record<AlertOutcome, Tone> = { falsch_positiv: 'neutral', plausibilisiert: 'green', eskaliert: 'violet', mros: 'red' };
export const OutcomeBadge = ({ outcome }: { outcome: AlertOutcome }) => <Badge tone={OUTCOME_TONE[outcome]}>{OUTCOME_LABEL[outcome]}</Badge>;

const PRIO_TONE: Record<Priority, Tone> = { hoch: 'red', mittel: 'amber', tief: 'neutral' };
export const PriorityBadge = ({ priority }: { priority: Priority }) => <Badge tone={PRIO_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>;

const REVIEW_TONE: Record<ReviewStatus, Tone> = { offen: 'neutral', warten_auf_kunde: 'amber', in_pruefung: 'blue', aktualisierung: 'violet', abgeschlossen: 'green' };
export const ReviewStatusBadge = ({ status }: { status: ReviewStatus }) => <Badge tone={REVIEW_TONE[status]}>{REVIEW_STATUS_LABEL[status]}</Badge>;
