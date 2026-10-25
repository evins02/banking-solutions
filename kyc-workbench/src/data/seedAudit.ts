/**
 * Vorgeschichte der Testdaten im Audit-Trail, damit Verläufe in der Demo nicht leer sind.
 * Wird einmalig beim Laden der Testdaten in zeitlicher Reihenfolge verkettet.
 */
import { log, type Data } from '../lib/actions';
import { CASE_STATUS_LABEL, DOC_LABEL, EVENT_LABEL, OUTCOME_LABEL } from '../lib/catalog';
import { addDays, fmtChf } from '../lib/format';
import type { AuditEntry, Role } from '../types';
import { USERS } from './users';

type Item = Omit<Parameters<typeof log>[2], 'at'> & { at: string };

const roleOf = (userId: string): AuditEntry['role'] => (userId === 'kunde' ? 'kunde' : userId === 'system' ? 'system' : ((USERS.find((u) => u.id === userId)?.role ?? 'kb') as Role));

export function seedAudit(d: Data) {
  const items: Item[] = [];
  const push = (userId: string, i: Omit<Item, 'userId' | 'role'>) => items.push({ ...i, userId, role: roleOf(userId) });
  const name = (id: string) => d.customers.find((c) => c.id === id)?.name ?? '';

  for (const cs of d.cases) {
    const label = `${cs.number} · ${name(cs.customerId)}`;
    push(cs.advisorId, { at: cs.createdAt, action: 'Fall angelegt', objectType: 'Fall', objectId: cs.id, objectLabel: label, newValue: 'In Erfassung' });
    push(cs.advisorId, { at: addDays(cs.createdAt, 0.01), action: 'Stammdaten aus Handelsregister übernommen (Demo)', objectType: 'Kunde', objectId: cs.customerId, objectLabel: name(cs.customerId) });
    if (cs.registerCheckedAt) push(cs.advisorId, { at: cs.registerCheckedAt, action: 'Abgleich Transparenzregister (Demo)', objectType: 'Fall', objectId: cs.id, objectLabel: label, newValue: cs.deviations.length ? `${cs.deviations.length} Abweichung(en) festgestellt` : 'Keine Abweichungen' });
    for (const doc of cs.documents) {
      if (doc.requestedAt && doc === cs.documents[0]) push(cs.advisorId, { at: doc.requestedAt, action: 'Unterlagen beim Kunden angefordert (Kundenportal)', objectType: 'Fall', objectId: cs.id, objectLabel: label, newValue: `${cs.documents.length} Unterlagen` });
      if (doc.uploadedAt && doc.uploadedBy) {
        push(doc.uploadedBy, { at: doc.uploadedAt, action: doc.uploadedBy === 'kunde' ? 'Dokument im Kundenportal hochgeladen' : 'Dokument hochgeladen', objectType: 'Dokument', objectId: doc.id, objectLabel: `${DOC_LABEL[doc.type]} (${cs.number})`, field: 'Status', oldValue: 'fehlt', newValue: `hochgeladen: ${doc.fileName}` });
        if (doc.status === 'geprueft') push('u-bo', { at: addDays(doc.uploadedAt, 0.3), action: 'Dokument geprüft', objectType: 'Dokument', objectId: doc.id, objectLabel: `${DOC_LABEL[doc.type]} (${cs.number})`, field: 'Status', oldValue: 'hochgeladen', newValue: 'geprüft' });
        if (doc.status === 'abgelehnt') push('u-bo', { at: addDays(doc.uploadedAt, 0.3), action: 'Dokument abgelehnt', objectType: 'Dokument', objectId: doc.id, objectLabel: `${DOC_LABEL[doc.type]} (${cs.number})`, field: 'Status', oldValue: 'hochgeladen', newValue: `abgelehnt: ${doc.rejectReason}` });
      }
    }
    if (cs.submittedAt) push(cs.advisorId, { at: cs.submittedAt, action: 'Fall zur Prüfung eingereicht', objectType: 'Fall', objectId: cs.id, objectLabel: label, field: 'Status', oldValue: 'In Erfassung', newValue: CASE_STATUS_LABEL.eingereicht });
    if (cs.risk?.confirmedAt) push(cs.risk.confirmedBy ?? 'u-co', { at: addDays(cs.risk.confirmedAt, -0.01), action: 'Risikoeinstufung bestätigt', objectType: 'Fall', objectId: cs.id, objectLabel: label, field: 'Risikoeinstufung', newValue: `${cs.risk.final === 'gmer' ? 'GmeR' : 'Normal'} (${cs.risk.total} Pkt.)` });
    for (const a of cs.approvals) {
      const action = a.decision === 'zurueckgewiesen' ? 'Fall zurückgewiesen' : a.step === 'leitung' ? 'Zweite Freigabe erteilt (Vier-Augen)' : a.step === 'backoffice' ? 'Geschäftsbeziehung eröffnet (Demo)' : 'Freigabe Compliance';
      push(a.userId, { at: a.at, action, objectType: 'Fall', objectId: cs.id, objectLabel: label, field: 'Status', newValue: a.comment });
    }
  }
  for (const a of d.alerts) {
    const label = `${a.id} · ${name(a.customerId)}`;
    push('system', { at: a.triggeredAt, action: 'Alarm aus Transaktionsüberwachung empfangen', objectType: 'Alarm', objectId: a.id, objectLabel: label, newValue: fmtChf(a.amount) });
    if (a.assigneeId) push(a.assigneeId, { at: addDays(a.triggeredAt, 0.1), action: 'Alarm übernommen', objectType: 'Alarm', objectId: a.id, objectLabel: label, field: 'Bearbeiter/in', newValue: a.assigneeId });
    if (a.escalation) push(a.escalation.by, { at: a.escalation.at, action: 'Alarm an Leitung Compliance eskaliert', objectType: 'Alarm', objectId: a.id, objectLabel: label, field: 'Status', newValue: `eskaliert – ${a.escalation.note}` });
    if (a.escalation?.decidedAt) push(a.escalation.decidedBy ?? 'u-lc', { at: a.escalation.decidedAt, action: 'Eskalation entschieden: MROS-Meldung vorbereiten', objectType: 'Alarm', objectId: a.id, objectLabel: label, field: 'Entscheid Leitung', newValue: a.escalation.decisionNote });
    if (a.closedAt && a.outcome) push(a.closedBy ?? 'u-co', { at: addDays(a.closedAt, 0.01), action: a.outcome === 'mros' ? 'MROS-Meldung als Entwurf abgeschlossen (nicht versendet, Demo)' : 'Alarm abgeschlossen', objectType: 'Alarm', objectId: a.id, objectLabel: label, field: 'Ergebnis', newValue: `${OUTCOME_LABEL[a.outcome]} – ${a.justification}` });
  }
  for (const e of d.events) {
    push('system', { at: e.date, action: `Ereignis erfasst: ${EVENT_LABEL[e.type]}`, objectType: 'Ereignis', objectId: e.id, objectLabel: name(e.customerId), field: e.change?.field, oldValue: e.change?.oldValue, newValue: `${e.source}: ${e.detail}` });
  }
  for (const r of d.reviews) {
    const label = `${r.number} · ${name(r.customerId)}`;
    push('system', { at: r.createdAt, action: r.trigger === 'ereignis' ? 'KYC-Überprüfung automatisch erstellt' : 'Periodische KYC-Überprüfung fällig', objectType: 'Überprüfung', objectId: r.id, objectLabel: label });
    if (r.requestedAt) push('u-kb', { at: r.requestedAt, action: 'Selbstbestätigung beim Kunden angefordert', objectType: 'Überprüfung', objectId: r.id, objectLabel: label, field: 'Status', newValue: 'Warten auf Kunde' });
    if (r.response) push('kunde', { at: r.response.at, action: r.response.changes.length ? 'Kunde meldet Änderungen (Portal)' : 'Kunde bestätigt Daten unverändert (Portal)', objectType: 'Überprüfung', objectId: r.id, objectLabel: label, newValue: r.response.changes.map((c) => `${c.section}: ${c.note}`).join(' | ') || 'Keine Änderungen' });
  }
  items.sort((a, b) => a.at.localeCompare(b.at));
  const ctx = { userId: 'system', role: 'kb' as const };
  for (const i of items) log(d, ctx, i);
}
