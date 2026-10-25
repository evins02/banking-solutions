import { describe, expect, it } from 'vitest';
import { buildSeed } from '../../data/seed';
import { DEFAULT_SETTINGS } from '../../data/settings';
import { HR_RECORDS, PEOPLE, STRUCTURES } from '../../data/registers';
import { lookupOwners } from '../../services/transparenzregister';
import * as A from '../actions';
import { checkJustification, effectiveOwners, structureDepth, ownershipTree } from '../domain';
import type { Ctx, Data } from '../actions';
import { isOverdue } from '../selectors';

const KB: Ctx = { userId: 'u-kb', role: 'kb' };
const CO: Ctx = { userId: 'u-co', role: 'compliance' };
const BO: Ctx = { userId: 'u-bo', role: 'backoffice' };
const LC: Ctx = { userId: 'u-lc', role: 'leitung' };

function fresh(): Data {
  const settings = structuredClone(DEFAULT_SETTINGS);
  return { ...buildSeed(settings), settings, audit: [] };
}

describe('Testdaten', () => {
  const d = fresh();
  it('erfüllt die Mindestmengen', () => {
    const active = d.customers.filter((c) => c.status === 'aktiv');
    expect(active.length).toBeGreaterThanOrEqual(15);
    expect(new Set(active.map((c) => c.legalForm))).toEqual(new Set(['AG', 'GmbH', 'Einzelunternehmen', 'Verein', 'Stiftung']));
    const nestedForeign = active.filter((c) => structureDepth(ownershipTree(c)) > 2 && c.entities.some((e) => e.kind === 'company' && e.country !== 'CH'));
    expect(nestedForeign.length).toBeGreaterThanOrEqual(3);
    const pep = active.filter((c) => c.signatories.some((s) => d.persons.find((p) => p.id === s.personId)?.pep));
    expect(pep.length).toBeGreaterThanOrEqual(2);
    expect(d.cases).toHaveLength(6);
    expect(new Set(d.cases.map((c) => c.status)).size).toBe(6);
    expect(d.cases.filter((c) => c.deviations.length > 0)).toHaveLength(1);
    expect(d.alerts).toHaveLength(25);
    expect(new Set(d.alerts.map((a) => a.scenario)).size).toBe(5);
    expect(d.alerts.filter(isOverdue)).toHaveLength(3);
    expect(d.reviews.filter((r) => r.status !== 'abgeschlossen')).toHaveLength(10);
  });
  it('enthält nur fiktive Namen', () => {
    const fictive = /(Muster|Beispiel|Exempel|Demo|Fiktiv|Platzhalter|Test|Neumuster)/;
    for (const p of PEOPLE) expect(`${p.firstName} ${p.lastName}`).toMatch(fictive);
    for (const r of HR_RECORDS) expect(r.name).toMatch(fictive);
  });
});

describe('Onboarding von der Erfassung bis zur Eröffnung', () => {
  it('läuft durch inkl. Kundensicht und Vier-Augen-Freigabe', () => {
    const d = fresh();
    const record = HR_RECORDS.find((r) => r.uid === 'CHE-999.300.301')!;
    const persons = PEOPLE.filter((p) => record.signatories.some((s) => s.personId === p.id));
    const caseId = A.createCase(d, KB, record, persons);
    const cs = () => d.cases.find((c) => c.id === caseId)!;
    const cust = () => d.customers.find((c) => c.id === cs().customerId)!;
    expect(cust().prefilled).toContain('signatories');

    A.updateCustomer(d, KB, cust().id, { industry: 'Holzbau / Schreinerei', relationshipPurpose: 'Zahlungsverkehr', expectedVolume: 900_000 });
    A.loadDeclaredStructure(d, KB, cust().id, STRUCTURES[record.uid], persons);
    expect(effectiveOwners(cust()).map((o) => o.percent)).toEqual([50, 50]);
    A.setRegisterResult(d, KB, caseId, lookupOwners(cust()).owners);
    expect(cs().deviations).toHaveLength(0);
    A.setControllers(d, KB, cust().id, persons.map((p) => p.id));

    expect(() => A.submitCase(d, KB, caseId)).toThrow(/Unterlagen/);
    A.requestDocuments(d, KB, caseId);
    for (const doc of cs().documents) A.uploadDocument(d, KB, caseId, doc.id, `${doc.type}.pdf`, true);
    expect(d.audit.some((e) => e.role === 'kunde')).toBe(true);
    for (const doc of cs().documents) A.checkDocument(d, BO, caseId, doc.id);

    A.submitCase(d, KB, caseId);
    expect(cs().status).toBe('eingereicht');
    expect(() => A.complianceDecision(d, CO, caseId, true, '')).toThrow(/Risikoeinstufung/);
    A.overrideRisk(d, CO, caseId, 'gmer', 'Neu gegründete Gesellschaft mit hohem Bargeldanteil im Saisongeschäft – vorsichtige Einstufung.');
    A.complianceDecision(d, CO, caseId, true, 'ok');
    expect(cs().status).toBe('zweite_freigabe');

    // Vier-Augen: dieselbe Person kann nicht zweimal freigeben
    expect(() => A.secondApproval(d, { userId: 'u-co', role: 'leitung' }, caseId, true, '')).toThrow(/Vier-Augen/);
    // Rollen ohne Recht scheitern
    expect(() => A.secondApproval(d, CO, caseId, true, '')).toThrow(/nicht freigegeben/);
    A.secondApproval(d, LC, caseId, true, 'Freigabe');
    expect(cs().status).toBe('freigegeben');

    expect(() => A.openAccount(d, BO, caseId)).toThrow(/Stammdaten/);
    A.finalizeMasterData(d, BO, caseId);
    A.openAccount(d, BO, caseId);
    expect(cs().status).toBe('eroeffnet');
    expect(cust().status).toBe('aktiv');
    expect(cust().riskLevel).toBe('gmer');
    expect(A.verifyAudit(d.audit).ok).toBe(true);
  });

  it('verlangt eine Begründung für Abweichungen zum Transparenzregister', () => {
    const d = fresh();
    const cs = d.cases.find((c) => c.deviations.length > 0)!;
    const dev = cs.deviations[0];
    A.justifyDeviation(d, KB, cs.id, dev.id, 'Abtretung von 40 % an Lea Fiktiv per 01.09., Meldung im Register noch nicht nachgeführt.');
    expect(d.cases.find((c) => c.id === cs.id)!.deviations[0].justification).toMatch(/Abtretung/);
  });
});

describe('Alarmprüfung', () => {
  it('erkennt Floskeln und zu kurze Begründungen', () => {
    const r = checkJustification('Lieferantenzahlung, branchenüblich.', DEFAULT_SETTINGS);
    expect(r.ok).toBe(false);
    expect(r.tooShort).toBe(true);
    expect(r.phrasesOnly).toBe(true);
    const long = checkJustification('Es handelt sich um eine Lieferantenzahlung, das ist branchenüblich und für diesen Kunden plausibel, es gibt keine Auffälligkeiten im normalen Geschäftsverkehr.', DEFAULT_SETTINGS);
    expect(long.tooShort).toBe(false);
    expect(long.phrasesOnly).toBe(true);
    const good = checkJustification('Zahlung an «Muster Lieferanten AG» gemäss Rechnung Nr. 2026-114 vom 12.09. über CHF 48\'500.00 für Holzlieferung; Lieferschein und Rechnung liegen vor.', DEFAULT_SETTINGS);
    expect(good.ok).toBe(true);
  });

  it('eskaliert mit Rückkopplung in die KYC-Überprüfung', () => {
    const d = fresh();
    const a = d.alerts.find((x) => x.customerId === 'k-101' && x.status === 'offen')!;
    const before = d.reviews.length;
    const w = { answers: {}, justification: 'x'.repeat(120), evidence: 'beleg.pdf', noEvidenceReason: '' };
    A.escalateAlert(d, CO, a.id, w, true, true);
    expect(d.alerts.find((x) => x.id === a.id)!.mros).toBeDefined();
    // k-101 hat bereits eine offene periodische Überprüfung → Ereignis wird angehängt
    expect(d.reviews.length).toBe(before);
    const r = d.reviews.find((x) => x.customerId === 'k-101' && x.status !== 'abgeschlossen')!;
    expect(r.riskRecheck).toBe(true);
    expect(() => A.decideEscalation(d, { userId: 'u-co', role: 'leitung' }, a.id, 'mros', 'Begründung ausreichend lang.')).toThrow(/Vier-Augen/);
  });
});

describe('Laufendes KYC', () => {
  it('erzeugt bei einer Handelsregister-Mutation automatisch eine Überprüfung', () => {
    const d = fresh();
    const c = d.customers.find((x) => x.id === 'k-114')!;
    expect(d.reviews.some((r) => r.customerId === c.id && r.status !== 'abgeschlossen')).toBe(false);
    const r = A.applyHrMutation(d, KB, c.id, { uid: c.uid, kind: 'sitzverlegung', title: 'Sitzverlegung', detail: 'Sitz verlegt', field: 'Sitz', oldValue: c.seat, newValue: 'Olten', publishedAt: new Date().toISOString() });
    expect(r.trigger).toBe('ereignis');
    expect(d.events.find((e) => e.reviewId === r.id)?.type).toBe('hr_mutation');
    expect(d.audit.some((e) => e.action === 'KYC-Überprüfung automatisch erstellt')).toBe(true);

    const caseId = A.startUpdateCase(d, KB, r.id);
    const cs = d.cases.find((x) => x.id === caseId)!;
    expect(cs.kind).toBe('aktualisierung');
    expect(cs.documents.find((x) => x.type === 'hr_auszug')!.status).toBe('fehlt');
    expect(cs.documents.filter((x) => x.status === 'geprueft').length).toBeGreaterThan(0);
    expect(d.customers.find((x) => x.id === c.id)!.seat).toBe('Olten');
  });

  it('schliesst unveränderte Überprüfungen mit tiefem Risiko mit einem Klick ab', () => {
    const d = fresh();
    const r = d.reviews.find((x) => x.customerId === 'k-101')!;
    expect(A.canQuickClose(d, r).ok).toBe(true);
    A.closeReview(d, KB, r.id, 'Unverändert bestätigt.');
    const c = d.customers.find((x) => x.id === 'k-101')!;
    expect(new Date(c.nextReviewAt!).getFullYear()).toBe(new Date().getFullYear() + 3);
  });
});

describe('Audit-Trail', () => {
  it('erkennt nachträgliche Änderungen', () => {
    const d = fresh();
    A.takeAlert(d, CO, d.alerts[0].id);
    A.takeAlert(d, CO, d.alerts[1].id);
    expect(A.verifyAudit(d.audit).ok).toBe(true);
    d.audit[0].newValue = 'manipuliert';
    expect(A.verifyAudit(d.audit)).toEqual({ ok: false, brokenAt: 1 });
  });
});
