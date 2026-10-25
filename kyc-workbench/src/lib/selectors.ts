/** Abgeleitete Kennzahlen und Aufgabenlisten */
import type { State } from '../store';
import type { Alert, OnboardingCase, Review, Role } from '../types';
import { missingDocs } from './domain';
import { daysBetween, daysFromNow } from './format';

export const customerOf = (s: State, id: string) => s.customers.find((c) => c.id === id);
export const personOf = (s: State, id: string) => s.persons.find((p) => p.id === id);
export const personName = (s: State, id: string) => {
  const p = personOf(s, id);
  return p ? `${p.firstName} ${p.lastName}` : '–';
};

export const isOverdue = (a: Alert) => (a.status === 'offen' || a.status === 'in_bearbeitung') && new Date(a.dueAt).getTime() < Date.now();

/** Durchlaufzeit in Tagen von Anlage bis Eröffnung */
export function avgThroughput(s: State): number {
  const done = s.cases.filter((c) => c.status === 'eroeffnet' && c.closedAt);
  const own = done.map((c) => daysBetween(c.createdAt, c.closedAt!));
  const hist = s.history.weeks.slice(-4).map((w) => w.avgDays);
  const all = [...own, ...hist];
  return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
}

export function dashboardStats(s: State) {
  const openCases = s.cases.filter((c) => c.status !== 'eroeffnet');
  const openAlerts = s.alerts.filter((a) => a.status !== 'abgeschlossen');
  const dueSoon = s.customers.filter((c) => c.status === 'aktiv' && c.nextReviewAt && daysFromNow(c.nextReviewAt) <= 30);
  return {
    openCases: openCases.length,
    avgDays: avgThroughput(s),
    missingDocs: openCases.filter((c) => missingDocs(c.documents).length > 0).length,
    openAlerts: openAlerts.length,
    overdueAlerts: s.alerts.filter(isOverdue).length,
    reviewsDue30: dueSoon.length,
    reviewsOverdue: dueSoon.filter((c) => daysFromNow(c.nextReviewAt!) < 0).length,
  };
}

export interface Task {
  id: string;
  kind: 'Fall' | 'Alarm' | 'Überprüfung' | 'Dokument';
  title: string;
  detail: string;
  to: string;
  urgent?: boolean;
  date: string;
}

export function myTasks(s: State, role: Role, userId: string): Task[] {
  const t: Task[] = [];
  const name = (id: string) => customerOf(s, id)?.name ?? '';
  const caseTask = (c: OnboardingCase, detail: string, urgent = false): Task => ({ id: `c-${c.id}`, kind: 'Fall', title: `${c.number} · ${name(c.customerId)}`, detail, to: `/onboarding/${c.id}`, urgent, date: c.createdAt });
  const alertTask = (a: Alert, detail: string): Task => ({ id: `a-${a.id}`, kind: 'Alarm', title: `${a.id} · ${name(a.customerId)}`, detail, to: `/alarme/${a.id}`, urgent: isOverdue(a) || a.priority === 'hoch', date: a.dueAt });
  const reviewTask = (r: Review, detail: string): Task => ({ id: `r-${r.id}`, kind: 'Überprüfung', title: `${r.number} · ${name(r.customerId)}`, detail, to: `/kyc/${r.id}`, urgent: daysFromNow(r.dueAt) < 0, date: r.dueAt });

  if (role === 'kb') {
    for (const c of s.cases.filter((x) => x.advisorId === userId || userId === 'u-kb')) {
      if (c.status === 'zurueckgewiesen') t.push(caseTask(c, `Zurückgewiesen: ${c.returnNote ?? ''}`, true));
      else if (c.status === 'in_erfassung') {
        const m = missingDocs(c.documents).length;
        t.push(caseTask(c, m ? `${m} Unterlage(n) ausstehend` : 'Bereit zum Einreichen'));
      }
    }
    for (const r of s.reviews.filter((x) => x.status === 'offen' || x.status === 'warten_auf_kunde')) t.push(reviewTask(r, r.status === 'offen' ? 'Selbstbestätigung beim Kunden anfordern' : 'Warten auf Kunde'));
  }
  if (role === 'compliance') {
    for (const c of s.cases.filter((x) => x.status === 'eingereicht')) t.push(caseTask(c, 'Prüfung und Risikoeinstufung', true));
    for (const a of s.alerts.filter((x) => x.status === 'offen' || x.status === 'in_bearbeitung').sort((x, y) => x.dueAt.localeCompare(y.dueAt))) t.push(alertTask(a, isOverdue(a) ? 'Bearbeitungsfrist überschritten' : 'Alarm prüfen'));
    for (const r of s.reviews.filter((x) => x.status === 'in_pruefung')) t.push(reviewTask(r, 'Antwort des Kunden prüfen'));
  }
  if (role === 'backoffice') {
    for (const c of s.cases) {
      const up = c.documents.filter((d) => d.status === 'hochgeladen').length;
      if (up && c.status !== 'eroeffnet') t.push({ ...caseTask(c, `${up} Dokument(e) prüfen`), id: `d-${c.id}`, kind: 'Dokument' });
      if (c.status === 'freigegeben') t.push(caseTask(c, c.kind === 'aktualisierung' ? 'Aktualisierung abschliessen' : 'Stammdaten finalisieren und eröffnen', true));
    }
  }
  if (role === 'leitung') {
    for (const c of s.cases.filter((x) => x.status === 'zweite_freigabe')) t.push(caseTask(c, 'Zweite Freigabe (Vier-Augen, GmeR)', true));
    for (const a of s.alerts.filter((x) => x.status === 'eskaliert')) t.push(alertTask(a, a.escalation?.decision === 'mros' ? 'MROS-Entwurf fertigstellen' : 'Entscheid über Eskalation'));
    for (const r of s.reviews.filter((x) => x.status === 'in_pruefung' && customerOf(s, x.customerId)?.riskLevel === 'gmer')) t.push(reviewTask(r, 'Überprüfung GmeR-Kunde'));
  }
  return t;
}

