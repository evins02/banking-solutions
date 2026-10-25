/**
 * Fachliche Aktionen. Jede Aktion arbeitet auf einer Kopie des Zustands (Draft),
 * prüft Rechte und Voraussetzungen und schreibt einen Audit-Eintrag.
 * Bei einer späteren Datenbank-Anbindung entspricht jede Funktion einem API-Aufruf.
 */
import type {
  Alert,
  AlertOutcome,
  Answer,
  AuditEntry,
  CaseDocument,
  Customer,
  Deviation,
  Entity,
  EventType,
  ExtractedField,
  KycEvent,
  MrosDraft,
  OnboardingCase,
  Person,
  RegisterOwner,
  Review,
  RiskLevel,
  Role,
  Settings,
  Signatory,
  SignatureKind,
  Transaction,
} from '../types';
import type { HrRecord, StructureDef } from '../data/registers';
import type { HrMutation } from '../services/handelsregister';
import { compareOwners, lookupOwners } from '../services/transparenzregister';
import { CASE_STATUS_LABEL, DOC_LABEL, EVENT_LABEL, OUTCOME_LABEL, ROLE_LABEL } from './catalog';
import { assessRisk, can, needsSecondApproval, openChecks, submitChecks, syncDocuments, type Permission } from './domain';
import { addDays, addYears, daysBetween, fmtChf, fmtDate, fnv1a, nowIso, uid } from './format';

export interface Data {
  customers: Customer[];
  persons: Person[];
  cases: OnboardingCase[];
  alerts: Alert[];
  transactions: Transaction[];
  reviews: Review[];
  events: KycEvent[];
  audit: AuditEntry[];
  settings: Settings;
}

export interface Ctx {
  userId: string;
  role: Role;
}

export class ActionError extends Error {}

/* ------------------------------------------------------------------ */
/* Hilfsfunktionen                                                     */
/* ------------------------------------------------------------------ */

type AuditInput = Omit<AuditEntry, 'id' | 'seq' | 'at' | 'hash' | 'userId' | 'role'> & { userId?: string; role?: AuditEntry['role']; at?: string };

export function hashEntry(e: Omit<AuditEntry, 'hash'>, prevHash: string): string {
  return fnv1a(prevHash + JSON.stringify([e.seq, e.at, e.userId, e.role, e.action, e.objectType, e.objectId, e.field, e.oldValue, e.newValue]));
}

export function log(d: Data, ctx: Ctx, input: AuditInput) {
  // `at` nur für die Vorgeschichte der Testdaten; im Betrieb immer die aktuelle Zeit
  const last = d.audit[d.audit.length - 1];
  const entry: Omit<AuditEntry, 'hash'> = {
    id: uid('au'),
    seq: (last?.seq ?? 0) + 1,
    at: input.at ?? nowIso(),
    userId: input.userId ?? ctx.userId,
    role: input.role ?? ctx.role,
    action: input.action,
    objectType: input.objectType,
    objectId: input.objectId,
    objectLabel: input.objectLabel,
    field: input.field,
    oldValue: input.oldValue,
    newValue: input.newValue,
  };
  d.audit.push({ ...entry, hash: hashEntry(entry, last?.hash ?? '') });
}

/** Prüft die Hash-Kette; gibt die erste ungültige Sequenznummer zurück */
export function verifyAudit(audit: AuditEntry[]): { ok: boolean; brokenAt?: number } {
  let prev = '';
  for (const e of audit) {
    const { hash, ...rest } = e;
    if (hashEntry(rest, prev) !== hash) return { ok: false, brokenAt: e.seq };
    prev = hash;
  }
  return { ok: true };
}

function need(ctx: Ctx, p: Permission) {
  if (!can(ctx.role, p)) throw new ActionError(`Diese Aktion ist für die Rolle «${ROLE_LABEL[ctx.role]}» nicht freigegeben.`);
}

const getCase = (d: Data, id: string) => {
  const cs = d.cases.find((c) => c.id === id);
  if (!cs) throw new ActionError('Fall nicht gefunden.');
  return cs;
};
const getCustomer = (d: Data, id: string) => {
  const c = d.customers.find((x) => x.id === id);
  if (!c) throw new ActionError('Kunde nicht gefunden.');
  return c;
};
const getAlert = (d: Data, id: string) => {
  const a = d.alerts.find((x) => x.id === id);
  if (!a) throw new ActionError('Alarm nicht gefunden.');
  return a;
};
const getReview = (d: Data, id: string) => {
  const r = d.reviews.find((x) => x.id === id);
  if (!r) throw new ActionError('Überprüfung nicht gefunden.');
  return r;
};

const caseLabel = (d: Data, cs: OnboardingCase) => `${cs.number} · ${d.customers.find((c) => c.id === cs.customerId)?.name ?? ''}`;
const docLabel = (d: Data, doc: CaseDocument) => {
  const p = doc.personId ? d.persons.find((x) => x.id === doc.personId) : undefined;
  return `${DOC_LABEL[doc.type]}${p ? ` ${p.firstName} ${p.lastName}` : ''}`;
};
const editable = (cs: OnboardingCase) => cs.status === 'in_erfassung' || cs.status === 'zurueckgewiesen';

function nextCaseNumber(d: Data) {
  const max = Math.max(41, ...d.cases.map((c) => Number(c.number.split('-').pop()) || 0));
  return `ONB-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`;
}

function nextReviewNumber(d: Data) {
  const max = Math.max(0, ...d.reviews.map((r) => Number(r.number.split('-').pop()) || 0));
  return `KYC-${new Date().getFullYear()}-${String(max + 1).padStart(3, '0')}`;
}

function refreshDeviations(d: Data, customerId: string) {
  const c = getCustomer(d, customerId);
  for (const cs of d.cases.filter((x) => x.customerId === customerId && x.registerOwners && editable(x))) {
    cs.deviations = compareOwners(c, cs.registerOwners ?? [], cs.deviations);
  }
}

function syncCaseDocs(d: Data, customerId: string) {
  const c = getCustomer(d, customerId);
  for (const cs of d.cases.filter((x) => x.customerId === customerId && editable(x))) cs.documents = syncDocuments(c, cs.documents);
}

/* ------------------------------------------------------------------ */
/* Modul 1: Onboarding                                                 */
/* ------------------------------------------------------------------ */

export function createCase(d: Data, ctx: Ctx, record: HrRecord, persons: Person[]): string {
  need(ctx, 'case.create');
  if (d.customers.some((c) => c.uid === record.uid && c.status === 'aktiv')) throw new ActionError(`${record.name} ist bereits Kunde der Bank.`);
  const open = d.cases.find((cs) => d.customers.find((c) => c.id === cs.customerId)?.uid === record.uid && cs.status !== 'eroeffnet');
  if (open) throw new ActionError(`Für ${record.name} besteht bereits der offene Fall ${open.number}.`);
  for (const p of persons) if (!d.persons.some((x) => x.id === p.id)) d.persons.push(structuredClone(p));
  const id = uid('k');
  const customer: Customer = {
    id,
    name: record.name,
    uid: record.uid,
    legalForm: record.legalForm,
    street: record.street,
    seat: record.seat,
    canton: record.canton,
    country: 'CH',
    purpose: record.purpose,
    foundedAt: record.foundedAt,
    industry: '',
    cashIntensive: false,
    signatories: record.signatories.map((s) => ({ ...s, fromRegister: true })),
    entities: [{ id, kind: 'company', name: record.name, country: 'CH' }],
    holdings: [],
    controllerIds: [],
    formType: record.legalForm === 'Stiftung' ? 'A' : 'K',
    relationshipPurpose: '',
    expectedVolume: 0,
    expectedCashShare: 0,
    sourceOfFunds: 'Geschäftstätigkeit',
    riskLevel: 'normal',
    riskScore: 0,
    status: 'onboarding',
    advisorId: ctx.userId,
    prefilled: ['name', 'uid', 'legalForm', 'street', 'seat', 'canton', 'purpose', 'foundedAt', 'signatories'],
  };
  d.customers.push(customer);
  const cs: OnboardingCase = {
    id: uid('f'),
    number: nextCaseNumber(d),
    customerId: id,
    kind: 'onboarding',
    status: 'in_erfassung',
    advisorId: ctx.userId,
    createdAt: nowIso(),
    documents: syncDocuments(customer, []),
    deviations: [],
    approvals: [],
    masterDataFinal: false,
  };
  d.cases.push(cs);
  log(d, ctx, { action: 'Fall angelegt', objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), newValue: 'In Erfassung' });
  log(d, ctx, {
    action: 'Stammdaten aus Handelsregister übernommen (Demo)',
    objectType: 'Kunde',
    objectId: id,
    objectLabel: record.name,
    newValue: `${record.uid}, ${record.legalForm}, ${record.seat}, ${record.signatories.length} Zeichnungsberechtigte`,
  });
  return cs.id;
}

const FIELD_LABEL: Record<string, string> = {
  name: 'Firma',
  street: 'Adresse',
  seat: 'Sitz',
  canton: 'Kanton',
  country: 'Domizil',
  purpose: 'Zweck',
  foundedAt: 'Gründungsdatum',
  industry: 'Branche',
  relationshipPurpose: 'Zweck der Geschäftsbeziehung',
  expectedVolume: 'Erwartetes Volumen p. a.',
  expectedCashShare: 'Bargeldanteil',
  sourceOfFunds: 'Herkunft der Vermögenswerte',
  legalForm: 'Rechtsform',
  formType: 'Formular',
  cashIntensive: 'Bargeldintensiv',
};

export function updateCustomer(d: Data, ctx: Ctx, customerId: string, patch: Partial<Customer>) {
  const c = getCustomer(d, customerId);
  const cs = d.cases.find((x) => x.customerId === customerId && x.status !== 'eroeffnet');
  if (cs && !editable(cs) && !(ctx.role === 'backoffice' && cs.status === 'freigegeben')) throw new ActionError('Der Fall ist eingereicht und kann nicht mehr bearbeitet werden.');
  if (ctx.role !== 'backoffice') need(ctx, 'case.edit');
  for (const [k, v] of Object.entries(patch) as [keyof Customer, unknown][]) {
    const old = c[k];
    if (JSON.stringify(old) === JSON.stringify(v)) continue;
    (c as unknown as Record<string, unknown>)[k] = v;
    c.prefilled = c.prefilled.filter((p) => p !== k);
    log(d, ctx, {
      action: 'Feld geändert',
      objectType: 'Kunde',
      objectId: c.id,
      objectLabel: c.name,
      field: FIELD_LABEL[k] ?? k,
      oldValue: old === undefined || old === '' ? '–' : String(old),
      newValue: String(v),
    });
  }
  if ('legalForm' in patch || 'formType' in patch) syncCaseDocs(d, customerId);
  if ('name' in patch) {
    const root = c.entities.find((e) => e.id === c.id);
    if (root) root.name = c.name;
  }
}

export function addSignatory(d: Data, ctx: Ctx, customerId: string, person: Omit<Person, 'id'>, fn: string, signature: SignatureKind) {
  need(ctx, 'case.edit');
  const c = getCustomer(d, customerId);
  const p: Person = { ...person, id: uid('p') };
  d.persons.push(p);
  const s: Signatory = { personId: p.id, function: fn, signature, fromRegister: false };
  c.signatories.push(s);
  syncCaseDocs(d, customerId);
  log(d, ctx, { action: 'Zeichnungsberechtigte Person erfasst', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: 'Zeichnungsberechtigte', newValue: `${p.firstName} ${p.lastName}, ${fn}, ${signature}` });
}

export function setRegisterResult(d: Data, ctx: Ctx, caseId: string, owners: RegisterOwner[], note?: string) {
  need(ctx, 'case.edit');
  const cs = getCase(d, caseId);
  const c = getCustomer(d, cs.customerId);
  cs.registerOwners = owners;
  cs.registerCheckedAt = nowIso();
  cs.deviations = compareOwners(c, owners, cs.deviations);
  log(d, ctx, {
    action: 'Abgleich Transparenzregister (Demo)',
    objectType: 'Fall',
    objectId: cs.id,
    objectLabel: caseLabel(d, cs),
    newValue: note ?? (cs.deviations.length ? `${cs.deviations.length} Abweichung(en) festgestellt` : 'Keine Abweichungen'),
  });
}

export function justifyDeviation(d: Data, ctx: Ctx, caseId: string, devId: string, text: string) {
  need(ctx, 'case.edit');
  const cs = getCase(d, caseId);
  const dev = cs.deviations.find((x) => x.id === devId) as Deviation;
  const old = dev.justification;
  dev.justification = text;
  log(d, ctx, { action: 'Abweichung begründet', objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), field: `Abweichung ${dev.subject}`, oldValue: old || '–', newValue: text });
}

export function addHolding(
  d: Data,
  ctx: Ctx,
  customerId: string,
  ownedId: string,
  owner: { kind: 'company'; name: string; country: string } | { kind: 'person'; personId?: string; person?: Omit<Person, 'id'> },
  percent: number,
) {
  need(ctx, 'case.edit');
  const c = getCustomer(d, customerId);
  const already = c.holdings.filter((h) => h.ownedId === ownedId).reduce((s, h) => s + h.percent, 0);
  if (percent <= 0 || already + percent > 100.0001) throw new ActionError(`Beteiligungen an dieser Einheit würden ${already + percent} % ergeben (max. 100 %).`);
  let entity: Entity;
  if (owner.kind === 'company') {
    entity = { id: uid('e'), kind: 'company', name: owner.name, country: owner.country };
    c.entities.push(entity);
  } else {
    let personId = owner.personId;
    if (!personId && owner.person) {
      const p: Person = { ...owner.person, id: uid('p') };
      d.persons.push(p);
      personId = p.id;
    }
    const p = d.persons.find((x) => x.id === personId);
    if (!p) throw new ActionError('Person fehlt.');
    const existing = c.entities.find((e) => e.personId === p.id);
    entity = existing ?? { id: `e-${p.id}`, kind: 'person', name: `${p.firstName} ${p.lastName}`, country: p.nationality, personId: p.id };
    if (!existing) c.entities.push(entity);
  }
  c.holdings.push({ id: uid('h'), ownerId: entity.id, ownedId, percent });
  const owned = c.entities.find((e) => e.id === ownedId);
  refreshDeviations(d, customerId);
  log(d, ctx, { action: 'Beteiligung erfasst', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: 'Eigentümerstruktur', newValue: `${entity.name} hält ${percent} % an ${owned?.name}` });
}

export function removeHolding(d: Data, ctx: Ctx, customerId: string, holdingId: string) {
  need(ctx, 'case.edit');
  const c = getCustomer(d, customerId);
  const h = c.holdings.find((x) => x.id === holdingId);
  if (!h) return;
  const remove = new Set<string>([h.id]);
  // Unterbeteiligungen einer entfernten Gesellschaft mitentfernen, wenn sie sonst nirgends hängt
  const owner = c.entities.find((e) => e.id === h.ownerId);
  c.holdings = c.holdings.filter((x) => !remove.has(x.id));
  if (owner && !c.holdings.some((x) => x.ownerId === owner.id)) {
    const drop = (entityId: string) => {
      for (const sub of c.holdings.filter((x) => x.ownedId === entityId)) {
        c.holdings = c.holdings.filter((x) => x.id !== sub.id);
        if (!c.holdings.some((x) => x.ownerId === sub.ownerId)) drop(sub.ownerId);
      }
      c.entities = c.entities.filter((e) => e.id !== entityId || e.id === c.id);
    };
    drop(owner.id);
  }
  c.controllerIds = c.controllerIds.filter((pid) => c.entities.some((e) => e.personId === pid) || c.signatories.some((s) => s.personId === pid));
  refreshDeviations(d, customerId);
  log(d, ctx, { action: 'Beteiligung entfernt', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: 'Eigentümerstruktur', oldValue: `${owner?.name} ${h.percent} %`, newValue: '–' });
}

export function loadDeclaredStructure(d: Data, ctx: Ctx, customerId: string, def: StructureDef, persons: Person[]) {
  need(ctx, 'case.edit');
  const c = getCustomer(d, customerId);
  for (const p of persons) if (!d.persons.some((x) => x.id === p.id)) d.persons.push(structuredClone(p));
  const map = (k: string) => (k === 'root' ? c.id : k.startsWith('p-') ? `e-${k}` : `${c.id}-${k}`);
  c.entities = [{ id: c.id, kind: 'company', name: c.name, country: c.country }, ...def.companies.map((x) => ({ id: map(x.key), kind: 'company' as const, name: x.name, country: x.country }))];
  for (const pid of new Set(def.holdings.map(([o]) => o).filter((o) => o.startsWith('p-')))) {
    const p = d.persons.find((x) => x.id === pid);
    if (p) c.entities.push({ id: map(pid), kind: 'person', name: `${p.firstName} ${p.lastName}`, country: p.nationality, personId: pid });
  }
  c.holdings = def.holdings.map(([o, t, pct]) => ({ id: uid('h'), ownerId: map(o), ownedId: map(t), percent: pct }));
  refreshDeviations(d, customerId);
  log(d, ctx, { action: 'Angaben Formular K übernommen (Demo)', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: 'Eigentümerstruktur', newValue: `${c.holdings.length} Beteiligungen` });
}

export function setControllers(d: Data, ctx: Ctx, customerId: string, personIds: string[]) {
  need(ctx, 'case.edit');
  const c = getCustomer(d, customerId);
  const names = (ids: string[]) =>
    ids
      .map((id) => d.persons.find((p) => p.id === id))
      .map((p) => (p ? `${p.firstName} ${p.lastName}` : '?'))
      .join(', ') || '–';
  const old = names(c.controllerIds);
  c.controllerIds = personIds;
  log(d, ctx, { action: c.formType === 'A' ? 'Wirtschaftlich Berechtigte bestätigt' : 'Kontrollinhaber bestätigt', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: c.formType === 'A' ? 'Formular A' : 'Formular K', oldValue: old, newValue: names(personIds) });
}

export function requestDocuments(d: Data, ctx: Ctx, caseId: string) {
  need(ctx, 'doc.request');
  const cs = getCase(d, caseId);
  const missing = cs.documents.filter((x) => x.status === 'fehlt' || x.status === 'abgelehnt');
  if (!missing.length) throw new ActionError('Es fehlen keine Unterlagen.');
  missing.forEach((x) => (x.requestedAt = nowIso()));
  cs.portalOpenedAt = cs.portalOpenedAt ?? nowIso();
  log(d, ctx, { action: 'Unterlagen beim Kunden angefordert (Kundenportal)', objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), newValue: missing.map((x) => docLabel(d, x)).join(', ') });
}

export function uploadDocument(d: Data, ctx: Ctx, caseId: string, docId: string, fileName: string, byCustomer: boolean) {
  const cs = getCase(d, caseId);
  if (!byCustomer) need(ctx, 'doc.request');
  if (!editable(cs) && cs.status !== 'freigegeben') throw new ActionError('Der Fall ist abgeschlossen oder in Prüfung.');
  const doc = cs.documents.find((x) => x.id === docId);
  if (!doc) throw new ActionError('Dokument nicht gefunden.');
  const old = doc.status;
  Object.assign(doc, { status: 'hochgeladen', fileName, uploadedAt: nowIso(), uploadedBy: byCustomer ? 'kunde' : ctx.userId, rejectReason: undefined, extracted: undefined });
  log(d, ctx, {
    action: byCustomer ? 'Dokument im Kundenportal hochgeladen' : 'Dokument hochgeladen',
    objectType: 'Dokument',
    objectId: doc.id,
    objectLabel: `${docLabel(d, doc)} (${cs.number})`,
    field: 'Status',
    oldValue: old,
    newValue: `hochgeladen: ${fileName}`,
    ...(byCustomer ? { userId: 'kunde', role: 'kunde' as const } : {}),
  });
}

export function setExtracted(d: Data, ctx: Ctx, caseId: string, docId: string, fields: ExtractedField[]) {
  const cs = getCase(d, caseId);
  const doc = cs.documents.find((x) => x.id === docId) as CaseDocument;
  doc.extracted = fields;
  log(d, ctx, { action: 'Dokument ausgelesen (Demo)', objectType: 'Dokument', objectId: doc.id, objectLabel: `${docLabel(d, doc)} (${cs.number})`, newValue: `${fields.length} Felder erkannt` });
}

export function confirmField(d: Data, ctx: Ctx, caseId: string, docId: string, key: string, corrected?: string) {
  need(ctx, 'doc.check');
  const cs = getCase(d, caseId);
  const doc = cs.documents.find((x) => x.id === docId) as CaseDocument;
  const f = doc.extracted?.find((x) => x.key === key);
  if (!f) return;
  if (corrected !== undefined && corrected !== f.value) {
    f.state = 'korrigiert';
    f.corrected = corrected;
    log(d, ctx, { action: 'Erkannten Wert korrigiert', objectType: 'Dokument', objectId: doc.id, objectLabel: `${docLabel(d, doc)} (${cs.number})`, field: f.label, oldValue: f.value, newValue: corrected });
  } else {
    f.state = 'bestaetigt';
    f.corrected = undefined;
    log(d, ctx, { action: 'Erkannten Wert bestätigt', objectType: 'Dokument', objectId: doc.id, objectLabel: `${docLabel(d, doc)} (${cs.number})`, field: f.label, newValue: f.value });
  }
}

export function checkDocument(d: Data, ctx: Ctx, caseId: string, docId: string) {
  need(ctx, 'doc.check');
  const cs = getCase(d, caseId);
  const doc = cs.documents.find((x) => x.id === docId) as CaseDocument;
  if (doc.status !== 'hochgeladen') throw new ActionError('Nur hochgeladene Dokumente können geprüft werden.');
  if (doc.extracted?.some((f) => f.state === 'offen')) throw new ActionError('Bitte zuerst alle erkannten Felder bestätigen oder korrigieren.');
  doc.status = 'geprueft';
  log(d, ctx, { action: 'Dokument geprüft', objectType: 'Dokument', objectId: doc.id, objectLabel: `${docLabel(d, doc)} (${cs.number})`, field: 'Status', oldValue: 'hochgeladen', newValue: 'geprüft' });
}

export function rejectDocument(d: Data, ctx: Ctx, caseId: string, docId: string, reason: string) {
  need(ctx, 'doc.check');
  if (reason.trim().length < 5) throw new ActionError('Bitte einen Grund für die Ablehnung angeben.');
  const cs = getCase(d, caseId);
  const doc = cs.documents.find((x) => x.id === docId) as CaseDocument;
  const old = doc.status;
  doc.status = 'abgelehnt';
  doc.rejectReason = reason;
  log(d, ctx, { action: 'Dokument abgelehnt', objectType: 'Dokument', objectId: doc.id, objectLabel: `${docLabel(d, doc)} (${cs.number})`, field: 'Status', oldValue: old, newValue: `abgelehnt: ${reason}` });
}

export function calculateRisk(d: Data, ctx: Ctx, caseId: string) {
  const cs = getCase(d, caseId);
  const c = getCustomer(d, cs.customerId);
  const prev = cs.risk;
  const risk = assessRisk({ customer: c, persons: d.persons }, d.settings);
  cs.risk = risk;
  log(d, ctx, {
    action: 'Risikoeinstufung berechnet (Vorschlag)',
    objectType: 'Fall',
    objectId: cs.id,
    objectLabel: caseLabel(d, cs),
    field: 'Risikoeinstufung',
    oldValue: prev ? `${prev.final === 'gmer' ? 'GmeR' : 'Normal'} (${prev.total} Pkt.)` : '–',
    newValue: `${risk.computed === 'gmer' ? 'GmeR' : 'Normal'} (${risk.total} Pkt.)`,
  });
}

export function overrideRisk(d: Data, ctx: Ctx, caseId: string, level: RiskLevel, reason: string) {
  need(ctx, 'risk.confirm');
  if (reason.trim().length < 30) throw new ActionError('Eine Übersteuerung braucht eine Begründung von mindestens 30 Zeichen.');
  const cs = getCase(d, caseId);
  if (!cs.risk) throw new ActionError('Zuerst die Risikoeinstufung berechnen.');
  if (level === 'normal' && cs.risk.results.some((r) => r.mandatory)) throw new ActionError('Ausländische PEP: Die Geschäftsbeziehung gilt zwingend als GmeR und kann nicht herabgestuft werden.');
  const old = cs.risk.final;
  cs.risk.override = { level, reason, by: ctx.userId, at: nowIso() };
  cs.risk.final = level;
  cs.risk.confirmedAt = nowIso();
  cs.risk.confirmedBy = ctx.userId;
  log(d, ctx, { action: 'Risikoeinstufung übersteuert', objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), field: 'Risikoeinstufung', oldValue: old === 'gmer' ? 'GmeR' : 'Normal', newValue: `${level === 'gmer' ? 'GmeR' : 'Normal'} – ${reason}` });
}

export function confirmRisk(d: Data, ctx: Ctx, caseId: string) {
  need(ctx, 'risk.confirm');
  const cs = getCase(d, caseId);
  if (!cs.risk) throw new ActionError('Zuerst die Risikoeinstufung berechnen.');
  cs.risk.confirmedAt = nowIso();
  cs.risk.confirmedBy = ctx.userId;
  log(d, ctx, { action: 'Risikoeinstufung bestätigt', objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), field: 'Risikoeinstufung', newValue: `${cs.risk.final === 'gmer' ? 'GmeR' : 'Normal'} (${cs.risk.total} Pkt.)` });
}

function setStatus(d: Data, ctx: Ctx, cs: OnboardingCase, status: OnboardingCase['status'], action: string, comment?: string) {
  const old = cs.status;
  cs.status = status;
  log(d, ctx, { action, objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), field: 'Status', oldValue: CASE_STATUS_LABEL[old], newValue: `${CASE_STATUS_LABEL[status]}${comment ? ` – ${comment}` : ''}` });
}

export function submitCase(d: Data, ctx: Ctx, caseId: string) {
  need(ctx, 'case.submit');
  const cs = getCase(d, caseId);
  const c = getCustomer(d, cs.customerId);
  if (!editable(cs)) throw new ActionError('Der Fall ist bereits eingereicht.');
  const failed = submitChecks(cs, c).filter((x) => !x.ok);
  if (failed.length) throw new ActionError(`Einreichen nicht möglich: ${failed.map((f) => f.label).join(', ')}.`);
  cs.risk = assessRisk({ customer: c, persons: d.persons }, d.settings);
  cs.submittedAt = nowIso();
  cs.returnNote = undefined;
  setStatus(d, ctx, cs, 'eingereicht', 'Fall zur Prüfung eingereicht');
}

export function complianceDecision(d: Data, ctx: Ctx, caseId: string, approve: boolean, comment: string) {
  need(ctx, 'case.review');
  const cs = getCase(d, caseId);
  if (cs.status !== 'eingereicht') throw new ActionError('Der Fall liegt nicht bei Compliance.');
  if (!approve) {
    if (comment.trim().length < 10) throw new ActionError('Bitte den Grund für die Zurückweisung angeben.');
    cs.approvals.push({ step: 'compliance', userId: ctx.userId, at: nowIso(), decision: 'zurueckgewiesen', comment });
    cs.returnNote = comment;
    setStatus(d, ctx, cs, 'zurueckgewiesen', 'Fall zurückgewiesen', comment);
    return;
  }
  if (!cs.risk?.confirmedAt) throw new ActionError('Bitte zuerst die Risikoeinstufung bestätigen oder übersteuern.');
  cs.approvals.push({ step: 'compliance', userId: ctx.userId, at: nowIso(), decision: 'freigegeben', comment });
  if (needsSecondApproval(cs)) setStatus(d, ctx, cs, 'zweite_freigabe', 'Freigabe Compliance (1. Freigabe, GmeR)', comment);
  else setStatus(d, ctx, cs, 'freigegeben', 'Freigabe Compliance', comment);
}

export function secondApproval(d: Data, ctx: Ctx, caseId: string, approve: boolean, comment: string) {
  need(ctx, 'case.secondApproval');
  const cs = getCase(d, caseId);
  if (cs.status !== 'zweite_freigabe') throw new ActionError('Der Fall wartet nicht auf eine zweite Freigabe.');
  const first = [...cs.approvals].reverse().find((a) => a.step === 'compliance' && a.decision === 'freigegeben');
  if (first?.userId === ctx.userId) throw new ActionError('Vier-Augen-Prinzip: Die zweite Freigabe muss durch eine andere Person erfolgen.');
  if (!approve) {
    if (comment.trim().length < 10) throw new ActionError('Bitte den Grund für die Zurückweisung angeben.');
    cs.approvals.push({ step: 'leitung', userId: ctx.userId, at: nowIso(), decision: 'zurueckgewiesen', comment });
    cs.returnNote = comment;
    setStatus(d, ctx, cs, 'zurueckgewiesen', 'Zweite Freigabe verweigert', comment);
    return;
  }
  cs.approvals.push({ step: 'leitung', userId: ctx.userId, at: nowIso(), decision: 'freigegeben', comment });
  setStatus(d, ctx, cs, 'freigegeben', 'Zweite Freigabe erteilt (Vier-Augen)', comment);
}

export function finalizeMasterData(d: Data, ctx: Ctx, caseId: string) {
  need(ctx, 'case.open');
  const cs = getCase(d, caseId);
  if (cs.status !== 'freigegeben') throw new ActionError('Der Fall ist nicht freigegeben.');
  cs.masterDataFinal = true;
  log(d, ctx, { action: 'Stammdaten finalisiert', objectType: 'Fall', objectId: cs.id, objectLabel: caseLabel(d, cs), field: 'Stammdaten', oldValue: 'offen', newValue: 'finalisiert' });
}

export function openAccount(d: Data, ctx: Ctx, caseId: string) {
  need(ctx, 'case.open');
  const cs = getCase(d, caseId);
  const c = getCustomer(d, cs.customerId);
  if (cs.status !== 'freigegeben') throw new ActionError('Der Fall ist nicht zur Eröffnung freigegeben.');
  const failed = openChecks(cs).filter((x) => !x.ok);
  if (failed.length) throw new ActionError(`Nicht möglich: ${failed.map((f) => f.label).join(', ')}.`);
  const now = nowIso();
  const level = cs.risk?.final ?? 'normal';
  const oldLevel = c.riskLevel;
  c.status = 'aktiv';
  c.riskLevel = level;
  c.riskScore = cs.risk?.total ?? 0;
  c.openedAt = c.openedAt ?? now;
  c.lastReviewAt = now;
  c.nextReviewAt = addYears(now, level === 'gmer' ? d.settings.reviewYears.gmer : d.settings.reviewYears.normal);
  cs.closedAt = now;
  cs.approvals.push({ step: 'backoffice', userId: ctx.userId, at: now, decision: 'eroeffnet', comment: cs.kind === 'aktualisierung' ? 'Aktualisierung abgeschlossen' : 'Konto eröffnet (Demo)' });
  setStatus(d, ctx, cs, 'eroeffnet', cs.kind === 'aktualisierung' ? 'Aktualisierung abgeschlossen' : 'Geschäftsbeziehung eröffnet (Demo)');
  if (cs.kind === 'aktualisierung' && cs.reviewId) {
    const r = getReview(d, cs.reviewId);
    r.status = 'abgeschlossen';
    r.closedAt = now;
    r.closedBy = ctx.userId;
    r.closeNote = `Abgeschlossen über verkürzten Ablauf ${cs.number}.`;
    log(d, ctx, { action: 'Überprüfung abgeschlossen', objectType: 'Überprüfung', objectId: r.id, objectLabel: `${r.number} · ${c.name}`, field: 'Status', oldValue: 'Aktualisierung läuft', newValue: 'Abgeschlossen' });
    if (oldLevel !== level) log(d, ctx, { action: 'Risikoeinstufung Kunde angepasst', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: 'Risikoeinstufung', oldValue: oldLevel === 'gmer' ? 'GmeR' : 'Normal', newValue: level === 'gmer' ? 'GmeR' : 'Normal' });
  }
}

/* ------------------------------------------------------------------ */
/* Modul 2: Alarme                                                     */
/* ------------------------------------------------------------------ */

const alertLabel = (d: Data, a: Alert) => `${a.id} · ${d.customers.find((c) => c.id === a.customerId)?.name ?? ''}`;

export function takeAlert(d: Data, ctx: Ctx, alertId: string) {
  need(ctx, 'alert.work');
  const a = getAlert(d, alertId);
  const old = a.assigneeId;
  a.assigneeId = ctx.userId;
  if (a.status === 'offen') a.status = 'in_bearbeitung';
  log(d, ctx, { action: 'Alarm übernommen', objectType: 'Alarm', objectId: a.id, objectLabel: alertLabel(d, a), field: 'Bearbeiter/in', oldValue: old ?? '–', newValue: ctx.userId });
}

export interface AlertWork {
  answers: Record<string, Answer>;
  justification: string;
  evidence?: string;
  noEvidenceReason: string;
}

export function saveAlertWork(d: Data, ctx: Ctx, alertId: string, w: AlertWork) {
  need(ctx, 'alert.work');
  const a = getAlert(d, alertId);
  const changed: string[] = [];
  for (const [q, v] of Object.entries(w.answers)) if (a.answers[q] !== v) changed.push(q);
  if (a.justification !== w.justification) changed.push('Begründung');
  if (a.evidence !== w.evidence) changed.push('Beleg');
  if (!changed.length) return;
  const oldJust = a.justification;
  Object.assign(a, { answers: { ...w.answers }, justification: w.justification, evidence: w.evidence, noEvidenceReason: w.noEvidenceReason });
  if (a.status === 'offen') a.status = 'in_bearbeitung';
  a.assigneeId = a.assigneeId ?? ctx.userId;
  log(d, ctx, { action: 'Prüfung zwischengespeichert', objectType: 'Alarm', objectId: a.id, objectLabel: alertLabel(d, a), field: changed.length > 3 ? `${changed.length} Felder` : changed.join(', '), oldValue: oldJust ? oldJust.slice(0, 80) : '–', newValue: w.justification.slice(0, 80) || '–' });
}

export function closeAlert(d: Data, ctx: Ctx, alertId: string, outcome: Extract<AlertOutcome, 'falsch_positiv' | 'plausibilisiert'>, w: AlertWork) {
  need(ctx, 'alert.work');
  const a = getAlert(d, alertId);
  if (a.status === 'abgeschlossen') throw new ActionError('Der Alarm ist bereits abgeschlossen.');
  if (!w.evidence && w.noEvidenceReason.trim().length < 20) throw new ActionError('Bitte einen Beleg anhängen oder das Fehlen begründen (mind. 20 Zeichen).');
  Object.assign(a, { answers: { ...w.answers }, justification: w.justification, evidence: w.evidence, noEvidenceReason: w.noEvidenceReason });
  a.status = 'abgeschlossen';
  a.outcome = outcome;
  a.closedAt = nowIso();
  a.closedBy = ctx.userId;
  a.handlingMinutes = Math.max(5, Math.round((Date.now() - new Date(a.triggeredAt).getTime()) / 60000 / 40));
  log(d, ctx, { action: 'Alarm abgeschlossen', objectType: 'Alarm', objectId: a.id, objectLabel: alertLabel(d, a), field: 'Ergebnis', oldValue: 'offen', newValue: `${OUTCOME_LABEL[outcome]} – ${w.justification}` });
}

export function escalateAlert(d: Data, ctx: Ctx, alertId: string, w: AlertWork, createReview: boolean, mrosRequested: boolean) {
  need(ctx, 'alert.work');
  const a = getAlert(d, alertId);
  if (a.status === 'abgeschlossen' || a.status === 'eskaliert') throw new ActionError('Der Alarm ist bereits eskaliert oder abgeschlossen.');
  Object.assign(a, { answers: { ...w.answers }, justification: w.justification, evidence: w.evidence, noEvidenceReason: w.noEvidenceReason });
  a.status = 'eskaliert';
  a.escalation = { by: ctx.userId, at: nowIso(), note: mrosRequested ? `MROS-Meldung beantragt. ${w.justification}` : w.justification };
  a.dueAt = addDays(nowIso(), 10);
  if (mrosRequested) a.mros = mrosDraftFor(d, ctx, a);
  log(d, ctx, { action: mrosRequested ? 'Alarm eskaliert – MROS-Meldung beantragt' : 'Alarm an Leitung Compliance eskaliert', objectType: 'Alarm', objectId: a.id, objectLabel: alertLabel(d, a), field: 'Status', oldValue: 'in Bearbeitung', newValue: `eskaliert – ${w.justification}` });
  if (createReview) linkAlertToReview(d, ctx, a);
}

function linkAlertToReview(d: Data, ctx: Ctx, a: Alert) {
  const c = getCustomer(d, a.customerId);
  addEvent(d, ctx, {
    customerId: c.id,
    type: 'alarm_eskaliert',
    source: `Transaktionsüberwachung (Alarm ${a.id})`,
    title: 'Eskalierter Alarm',
    detail: `${fmtChf(a.amount)} eskaliert. Risikoeinstufung überprüfen (TmeR → GmeR).`,
  }, true);
}

/** Vorausgefüllter MROS-Entwurf (wird nicht versendet) */
export function mrosDraftFor(d: Data, ctx: Ctx, a: Alert): MrosDraft {
  const c = getCustomer(d, a.customerId);
  const tx = d.transactions.find((t) => t.id === a.triggerTxId);
  return {
    createdAt: nowIso(),
    createdBy: ctx.userId,
    basis: 'Art. 9 GwG (Meldepflicht)',
    facts: `Kunde: ${c.name} (${c.uid}), ${c.legalForm}, ${c.seat}. Auslösende Transaktion vom ${tx ? fmtDate(tx.date) : '–'}: ${fmtChf(a.amount)}, Gegenpartei ${tx?.counterparty ?? '–'} (${tx?.counterpartyCountry ?? '–'}).\n\nAbklärungen: ${a.justification}`,
    suspicion: 'Verdacht auf Geldwäscherei (Art. 305bis StGB).',
    measures: 'Keine Information an den Kunden (Informationsverbot Art. 10a GwG). Geschäftsbeziehung unter verstärkter Beobachtung.',
  };
}

export function decideEscalation(d: Data, ctx: Ctx, alertId: string, decision: 'mros' | 'abgeschlossen', note: string) {
  need(ctx, 'alert.decideEscalation');
  const a = getAlert(d, alertId);
  if (a.status !== 'eskaliert' || !a.escalation) throw new ActionError('Der Alarm ist nicht eskaliert.');
  if (a.escalation.by === ctx.userId) throw new ActionError('Vier-Augen-Prinzip: Über die Eskalation entscheidet eine andere Person.');
  if (note.trim().length < 20) throw new ActionError('Bitte den Entscheid begründen (mind. 20 Zeichen).');
  a.escalation = { ...a.escalation, decision, decidedBy: ctx.userId, decidedAt: nowIso(), decisionNote: note };
  if (decision === 'abgeschlossen') {
    a.status = 'abgeschlossen';
    a.outcome = 'eskaliert';
    a.closedAt = nowIso();
    a.closedBy = ctx.userId;
    a.handlingMinutes = a.handlingMinutes ?? 90;
  } else if (!a.mros) {
    a.mros = mrosDraftFor(d, ctx, a);
  }
  log(d, ctx, { action: decision === 'mros' ? 'Eskalation entschieden: MROS-Meldung vorbereiten' : 'Eskalation entschieden: ohne Meldung abschliessen', objectType: 'Alarm', objectId: a.id, objectLabel: alertLabel(d, a), field: 'Entscheid Leitung', newValue: note });
}

export function saveMros(d: Data, ctx: Ctx, alertId: string, draft: MrosDraft, finalize: boolean) {
  need(ctx, 'alert.decideEscalation');
  const a = getAlert(d, alertId);
  a.mros = draft;
  log(d, ctx, { action: finalize ? 'MROS-Meldung als Entwurf abgeschlossen (nicht versendet, Demo)' : 'MROS-Entwurf gespeichert', objectType: 'Alarm', objectId: a.id, objectLabel: alertLabel(d, a), field: 'MROS-Entwurf', newValue: draft.basis });
  if (finalize) {
    a.status = 'abgeschlossen';
    a.outcome = 'mros';
    a.closedAt = nowIso();
    a.closedBy = ctx.userId;
    a.handlingMinutes = a.handlingMinutes ?? 120;
  }
}

/* ------------------------------------------------------------------ */
/* Modul 3: Überprüfungen und Ereignisse                               */
/* ------------------------------------------------------------------ */

/** Erzeugt ein Ereignis und hängt es an eine offene Überprüfung oder legt eine neue an */
export function addEvent(d: Data, ctx: Ctx, e: Omit<KycEvent, 'id' | 'date' | 'reviewId'> & { date?: string }, riskRecheck = false): Review {
  const c = getCustomer(d, e.customerId);
  const ev: KycEvent = { ...e, id: uid('ev'), date: e.date ?? nowIso() };
  d.events.push(ev);
  log(d, ctx, { userId: 'system', role: 'system', action: `Ereignis erfasst: ${EVENT_LABEL[e.type]}`, objectType: 'Ereignis', objectId: ev.id, objectLabel: c.name, field: e.change?.field, oldValue: e.change?.oldValue, newValue: `${e.source}: ${e.detail}` });
  let r = d.reviews.find((x) => x.customerId === c.id && x.status !== 'abgeschlossen');
  if (r) {
    r.eventIds.push(ev.id);
    if (riskRecheck) r.riskRecheck = true;
    log(d, ctx, { userId: 'system', role: 'system', action: 'Ereignis bestehender Überprüfung zugeordnet', objectType: 'Überprüfung', objectId: r.id, objectLabel: `${r.number} · ${c.name}`, newValue: EVENT_LABEL[e.type] });
  } else {
    r = {
      id: uid('r'),
      number: nextReviewNumber(d),
      customerId: c.id,
      trigger: 'ereignis',
      status: 'offen',
      createdAt: nowIso(),
      dueAt: addDays(nowIso(), 30),
      eventIds: [ev.id],
      riskRecheck,
    };
    d.reviews.push(r);
    log(d, ctx, { userId: 'system', role: 'system', action: 'KYC-Überprüfung automatisch erstellt', objectType: 'Überprüfung', objectId: r.id, objectLabel: `${r.number} · ${c.name}`, newValue: `Auslöser: ${EVENT_LABEL[e.type]}${riskRecheck ? ' (Risikoeinstufung überprüfen)' : ''}` });
  }
  ev.reviewId = r.id;
  return r;
}

export function applyHrMutation(d: Data, ctx: Ctx, customerId: string, m: HrMutation): Review {
  if (m.person && !d.persons.some((p) => p.id === m.person!.id)) d.persons.push(m.person);
  return addEvent(d, ctx, {
    customerId,
    type: 'hr_mutation',
    source: 'Handelsregister (SHAB, Demo)',
    title: m.title,
    detail: m.detail,
    change: { field: m.field, oldValue: m.oldValue, newValue: m.newValue, personId: m.person?.id, personFunction: m.personFunction },
  });
}

export function simulateEvent(d: Data, ctx: Ctx, customerId: string, type: Exclude<EventType, 'hr_mutation'>): Review {
  const c = getCustomer(d, customerId);
  const detail: Record<typeof type, [string, string, string]> = {
    tr_meldung: ['Transparenzregister (Demo)', 'Neue Meldung wirtschaftlich Berechtigte', 'Neue Meldung eingegangen: Änderung der gemeldeten Kontrollinhaber.'],
    alarm_eskaliert: ['Transaktionsüberwachung (Demo)', 'Eskalierter Alarm', 'Alarm eskaliert. Risikoeinstufung überprüfen (TmeR → GmeR).'],
    volumen_abweichung: ['Transaktionsüberwachung (Volumenabgleich)', 'Transaktionsvolumen deutlich über Profil', `Volumen der letzten 90 Tage deutlich über dem erwarteten Volumen von ${fmtChf(c.expectedVolume)} p. a.`],
  };
  const [source, title, text] = detail[type];
  return addEvent(d, ctx, { customerId, type, source, title, detail: text }, type === 'alarm_eskaliert');
}

/** Volumenabgleich: letzte 90 Tage gegenüber Kundenprofil */
export function volumeCheck(d: Data, ctx: Ctx): number {
  let created = 0;
  for (const c of d.customers.filter((x) => x.status === 'aktiv' && x.expectedVolume > 0)) {
    const vol = d.transactions.filter((t) => t.customerId === c.id && daysBetween(t.date, nowIso()) <= 90).reduce((s, t) => s + t.amount, 0);
    const expected = c.expectedVolume / 4;
    const pct = (vol / expected) * 100;
    const already = d.events.some((e) => e.customerId === c.id && e.type === 'volumen_abweichung' && daysBetween(e.date, nowIso()) < 30);
    if (pct >= d.settings.volumeDeviationPct && !already) {
      addEvent(d, ctx, { customerId: c.id, type: 'volumen_abweichung', source: 'Transaktionsüberwachung (Volumenabgleich)', title: 'Transaktionsvolumen deutlich über Profil', detail: `Volumen der letzten 90 Tage ${fmtChf(vol)} = ${Math.round(pct)} % des erwarteten Volumens (${fmtChf(expected)}).` });
      created++;
    }
  }
  log(d, ctx, { action: 'Volumenabgleich ausgeführt (Demo)', objectType: 'System', objectId: 'volumen', objectLabel: 'Transaktionsüberwachung', newValue: `${created} neue Abweichung(en), Schwelle ${d.settings.volumeDeviationPct} %` });
  return created;
}

const reviewLabel = (d: Data, r: Review) => `${r.number} · ${d.customers.find((c) => c.id === r.customerId)?.name ?? ''}`;

export function requestConfirmation(d: Data, ctx: Ctx, reviewId: string) {
  need(ctx, 'review.work');
  const r = getReview(d, reviewId);
  r.status = 'warten_auf_kunde';
  r.requestedAt = nowIso();
  log(d, ctx, { action: 'Selbstbestätigung beim Kunden angefordert', objectType: 'Überprüfung', objectId: r.id, objectLabel: reviewLabel(d, r), field: 'Status', newValue: 'Warten auf Kunde' });
}

export function customerRespond(d: Data, ctx: Ctx, reviewId: string, changes: { section: string; note: string }[], viaEid: boolean) {
  const r = getReview(d, reviewId);
  r.response = { at: nowIso(), viaEid, changes };
  r.status = 'in_pruefung';
  log(d, ctx, {
    action: changes.length ? 'Kunde meldet Änderungen (Portal)' : 'Kunde bestätigt Daten unverändert (Portal)',
    objectType: 'Überprüfung',
    objectId: r.id,
    objectLabel: reviewLabel(d, r),
    newValue: changes.length ? changes.map((c) => `${c.section}: ${c.note}`).join(' | ') : 'Keine Änderungen',
    userId: 'kunde',
    role: 'kunde',
  });
}

export function canQuickClose(d: Data, r: Review): { ok: boolean; reason?: string } {
  const c = d.customers.find((x) => x.id === r.customerId);
  if (!c) return { ok: false };
  if (!r.response) return { ok: false, reason: 'Selbstbestätigung des Kunden fehlt.' };
  if (r.response.changes.length) return { ok: false, reason: 'Der Kunde hat Änderungen gemeldet.' };
  if (c.riskLevel !== 'normal') return { ok: false, reason: 'GmeR-Kunden werden vollständig geprüft.' };
  if (r.riskRecheck) return { ok: false, reason: 'Risikoeinstufung muss überprüft werden (eskalierter Alarm).' };
  if (r.eventIds.length) return { ok: false, reason: 'Ereignisse werden im verkürzten Ablauf geprüft.' };
  return { ok: true };
}

export function closeReview(d: Data, ctx: Ctx, reviewId: string, note: string, newRisk?: { level: RiskLevel; reason: string }) {
  need(ctx, newRisk ? 'risk.confirm' : 'review.work');
  const r = getReview(d, reviewId);
  const c = getCustomer(d, r.customerId);
  if (c.riskLevel === 'gmer' || newRisk?.level === 'gmer') need(ctx, 'review.closeGmer');
  const quick = canQuickClose(d, r);
  if (!quick.ok && !newRisk && !r.riskRecheck) throw new ActionError(quick.reason ?? 'Abschluss nicht möglich.');
  if (newRisk) {
    if (newRisk.reason.trim().length < 30) throw new ActionError('Bitte die Risikoeinstufung begründen (mind. 30 Zeichen).');
    const old = c.riskLevel;
    c.riskLevel = newRisk.level;
    log(d, ctx, { action: 'Risikoeinstufung Kunde überprüft', objectType: 'Kunde', objectId: c.id, objectLabel: c.name, field: 'Risikoeinstufung', oldValue: old === 'gmer' ? 'GmeR' : 'Normal', newValue: `${newRisk.level === 'gmer' ? 'GmeR' : 'Normal'} – ${newRisk.reason}` });
  }
  const now = nowIso();
  const oldNext = c.nextReviewAt;
  c.lastReviewAt = now;
  c.nextReviewAt = addYears(now, c.riskLevel === 'gmer' ? d.settings.reviewYears.gmer : d.settings.reviewYears.normal);
  r.status = 'abgeschlossen';
  r.closedAt = now;
  r.closedBy = ctx.userId;
  r.closeNote = note;
  log(d, ctx, { action: 'Überprüfung abgeschlossen', objectType: 'Überprüfung', objectId: r.id, objectLabel: reviewLabel(d, r), field: 'Nächste Fälligkeit', oldValue: oldNext ? new Date(oldNext).toLocaleDateString('de-CH') : '–', newValue: `${new Date(c.nextReviewAt).toLocaleDateString('de-CH')} – ${note}` });
}

/** Startet den verkürzten Ablauf aus Modul 1 mit den bestehenden Daten */
export function startUpdateCase(d: Data, ctx: Ctx, reviewId: string): string {
  need(ctx, 'review.work');
  const r = getReview(d, reviewId);
  const c = getCustomer(d, r.customerId);
  if (r.caseId) return r.caseId;
  const evs = d.events.filter((e) => r.eventIds.includes(e.id));
  const needNew = new Set<string>();
  for (const e of evs) {
    if (e.type === 'hr_mutation' && e.change) {
      needNew.add('hr_auszug');
      if (e.change.field === 'Sitz') c.seat = e.change.newValue;
      if (e.change.field === 'Zweck') c.purpose = e.change.newValue;
      if (e.change.field === 'Zeichnungsberechtigte' && e.change.personId) {
        const person = d.persons.find((p) => p.id === e.change!.personId);
        if (person) {
          if (!c.signatories.some((s) => s.personId === person.id)) {
            c.signatories.push({ personId: person.id, function: e.change.personFunction ?? 'Mitglied des Verwaltungsrates', signature: 'Kollektivunterschrift zu zweien', fromRegister: true });
          }
          needNew.add(`ausweis:${person.id}`);
        }
      }
    }
    if (e.type === 'tr_meldung') needNew.add(c.formType === 'A' ? 'formular_a' : 'formular_k');
  }
  if (r.response?.changes.length) needNew.add(c.formType === 'A' ? 'formular_a' : 'formular_k');
  const documents = syncDocuments(c, []).map((doc) => {
    const key = doc.personId ? `${doc.type}:${doc.personId}` : doc.type;
    return needNew.has(key) || needNew.has(doc.type)
      ? doc
      : { ...doc, status: 'geprueft' as const, fileName: 'aus bestehendem Kundendossier', uploadedAt: c.openedAt ?? c.lastReviewAt, uploadedBy: 'system' };
  });
  const cs: OnboardingCase = {
    id: uid('f'),
    number: nextCaseNumber(d).replace('ONB', 'AKT'),
    customerId: c.id,
    kind: 'aktualisierung',
    reviewId: r.id,
    status: 'in_erfassung',
    advisorId: c.advisorId,
    createdAt: nowIso(),
    documents,
    deviations: [],
    approvals: [],
    masterDataFinal: false,
  };
  if (!evs.some((e) => e.type === 'tr_meldung')) {
    cs.registerOwners = lookupOwners(c).owners;
    cs.registerCheckedAt = nowIso();
    cs.deviations = compareOwners(c, cs.registerOwners);
  }
  d.cases.push(cs);
  r.caseId = cs.id;
  r.status = 'aktualisierung';
  log(d, ctx, { action: 'Verkürzter Ablauf gestartet', objectType: 'Überprüfung', objectId: r.id, objectLabel: reviewLabel(d, r), field: 'Status', oldValue: 'In Prüfung', newValue: `Aktualisierung ${cs.number} (bestehende Daten übernommen)` });
  return cs.id;
}

/* ------------------------------------------------------------------ */
/* Einstellungen                                                       */
/* ------------------------------------------------------------------ */

export function updateSettings(d: Data, ctx: Ctx, next: Settings, changes: { label: string; oldValue: string; newValue: string }[]) {
  need(ctx, 'settings.edit');
  if (!changes.length) throw new ActionError('Keine Änderungen.');
  d.settings = next;
  for (const ch of changes) log(d, ctx, { action: 'Einstellung geändert', objectType: 'Einstellungen', objectId: 'settings', objectLabel: 'Konfiguration', field: ch.label, oldValue: ch.oldValue, newValue: ch.newValue });
}
