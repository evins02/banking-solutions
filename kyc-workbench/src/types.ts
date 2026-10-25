/**
 * Datenmodelle der KYC & Compliance Workbench.
 * Alle Objekte sind flach und über IDs verknüpft, damit sie später 1:1 als
 * Tabellen (z. B. Supabase/Postgres) abgelegt werden können.
 */

export type Role = 'kb' | 'compliance' | 'backoffice' | 'leitung';

export interface User {
  id: string;
  name: string;
  role: Role;
}

export type LegalForm = 'AG' | 'GmbH' | 'Einzelunternehmen' | 'Verein' | 'Stiftung';
export type RiskLevel = 'normal' | 'gmer';
export type SignatureKind = 'Einzelunterschrift' | 'Kollektivunterschrift zu zweien' | 'Prokura kollektiv zu zweien';

/** Natürliche Person (fiktiv) */
export interface Person {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string; // ISO
  nationality: string; // ISO-2
  domicile: string; // Ort, Land
  pep: boolean;
  pepDetail?: string;
}

export interface Signatory {
  personId: string;
  function: string;
  signature: SignatureKind;
  fromRegister: boolean;
}

/** Knoten der Eigentümerstruktur: Gesellschaft oder natürliche Person */
export interface Entity {
  id: string;
  kind: 'company' | 'person';
  name: string;
  country: string; // ISO-2
  personId?: string;
}

/** Beteiligung: owner hält percent an owned */
export interface Holding {
  id: string;
  ownerId: string;
  ownedId: string;
  percent: number;
}

export type SourceOfFunds = 'Geschäftstätigkeit' | 'Beteiligungsverkauf' | 'Erbschaft / Schenkung' | 'Kapitalerhöhung Muttergesellschaft' | 'Nicht belegt';

export interface Customer {
  id: string;
  name: string;
  uid: string;
  legalForm: LegalForm;
  street: string;
  seat: string;
  canton: string;
  country: string; // Domizil ISO-2
  purpose: string;
  foundedAt: string;
  industry: string;
  cashIntensive: boolean;
  signatories: Signatory[];
  /** Gesellschaft (Wurzel = id des Kunden) plus Eigentümer */
  entities: Entity[];
  holdings: Holding[];
  /** Bestätigte Kontrollinhaber bzw. wirtschaftlich Berechtigte (Formular K/A) */
  controllerIds: string[];
  formType: 'K' | 'A';
  relationshipPurpose: string;
  expectedVolume: number; // CHF pro Jahr
  expectedCashShare: number; // Prozent
  sourceOfFunds: SourceOfFunds;
  riskLevel: RiskLevel;
  riskScore: number;
  status: 'onboarding' | 'aktiv';
  advisorId: string;
  openedAt?: string;
  lastReviewAt?: string;
  nextReviewAt?: string;
  /** Felder, die aus dem Handelsregister vorbefüllt wurden */
  prefilled: string[];
}

export type DocType =
  | 'hr_auszug'
  | 'statuten'
  | 'ausweis'
  | 'formular_k'
  | 'formular_a'
  | 'unterschriftenkarte'
  | 'stiftungsurkunde'
  | 'vorstandsliste'
  | 'stiftungsrat';

export type DocStatus = 'fehlt' | 'hochgeladen' | 'geprueft' | 'abgelehnt';

export interface ExtractedField {
  key: string;
  label: string;
  value: string;
  /** Wert gemäss Fall, zum Vergleich */
  expected?: string;
  state: 'offen' | 'bestaetigt' | 'korrigiert';
  corrected?: string;
}

export interface CaseDocument {
  id: string;
  type: DocType;
  personId?: string;
  status: DocStatus;
  fileName?: string;
  uploadedAt?: string;
  uploadedBy?: string; // userId oder 'kunde'
  rejectReason?: string;
  extracted?: ExtractedField[];
  requestedAt?: string;
}

/** Abweichung zum Transparenzregister */
export interface Deviation {
  id: string;
  subject: string;
  customerValue: string;
  registerValue: string;
  justification: string;
}

export interface RegisterOwner {
  name: string;
  birthYear: number;
  nationality: string;
  share: number;
  kind: string;
}

export interface CriterionResult {
  criterionId: string;
  label: string;
  value: string;
  points: number;
  reason: string;
  mandatory?: boolean;
}

export interface RiskAssessment {
  results: CriterionResult[];
  total: number;
  threshold: number;
  computed: RiskLevel;
  override?: { level: RiskLevel; reason: string; by: string; at: string };
  final: RiskLevel;
  confirmedBy?: string;
  confirmedAt?: string;
}

export type CaseStatus = 'in_erfassung' | 'eingereicht' | 'zweite_freigabe' | 'freigegeben' | 'eroeffnet' | 'zurueckgewiesen';

export interface Approval {
  step: 'compliance' | 'leitung' | 'backoffice';
  userId: string;
  at: string;
  decision: 'freigegeben' | 'zurueckgewiesen' | 'eroeffnet';
  comment: string;
}

export interface OnboardingCase {
  id: string;
  number: string;
  customerId: string;
  kind: 'onboarding' | 'aktualisierung';
  reviewId?: string;
  status: CaseStatus;
  advisorId: string;
  createdAt: string;
  submittedAt?: string;
  closedAt?: string;
  documents: CaseDocument[];
  registerOwners?: RegisterOwner[];
  registerCheckedAt?: string;
  deviations: Deviation[];
  risk?: RiskAssessment;
  approvals: Approval[];
  masterDataFinal: boolean;
  returnNote?: string;
  portalOpenedAt?: string;
}

export type ScenarioId = 'bar_schwelle' | 'durchlauf' | 'profil_abweichung' | 'risikoland' | 'strukturierung';
export type Priority = 'hoch' | 'mittel' | 'tief';
export type AlertStatus = 'offen' | 'in_bearbeitung' | 'eskaliert' | 'abgeschlossen';
export type AlertOutcome = 'falsch_positiv' | 'plausibilisiert' | 'eskaliert' | 'mros';
export type Answer = 'ja' | 'nein' | 'unklar';

export interface Transaction {
  id: string;
  customerId: string;
  date: string;
  amount: number; // CHF, positiv
  direction: 'eingang' | 'ausgang';
  type: 'Überweisung' | 'Bareinzahlung' | 'Barbezug' | 'Kartenzahlung' | 'Lastschrift';
  counterparty: string;
  counterpartyCountry: string;
  reference: string;
}

export interface MrosDraft {
  createdAt: string;
  createdBy: string;
  basis: 'Art. 9 GwG (Meldepflicht)' | 'Art. 305ter Abs. 2 StGB (Melderecht)';
  facts: string;
  suspicion: string;
  measures: string;
}

export interface Alert {
  id: string;
  customerId: string;
  scenario: ScenarioId;
  amount: number;
  triggeredAt: string;
  priority: Priority;
  dueAt: string;
  status: AlertStatus;
  triggerTxId: string;
  assigneeId?: string;
  answers: Record<string, Answer>;
  justification: string;
  evidence?: string; // Dateiname
  noEvidenceReason: string;
  outcome?: AlertOutcome;
  closedAt?: string;
  closedBy?: string;
  handlingMinutes?: number;
  escalation?: { by: string; at: string; note: string; decision?: 'mros' | 'abgeschlossen'; decidedBy?: string; decidedAt?: string; decisionNote?: string };
  mros?: MrosDraft;
}

export type EventType = 'hr_mutation' | 'tr_meldung' | 'alarm_eskaliert' | 'volumen_abweichung';

export interface KycEvent {
  id: string;
  customerId: string;
  type: EventType;
  source: string;
  date: string;
  title: string;
  detail: string;
  reviewId?: string;
  /** strukturierte Änderung, z. B. neue Zeichnungsberechtigte */
  change?: { field: string; oldValue: string; newValue: string; personId?: string; personFunction?: string };
}

export type ReviewStatus = 'offen' | 'warten_auf_kunde' | 'in_pruefung' | 'aktualisierung' | 'abgeschlossen';

export interface CustomerResponse {
  at: string;
  viaEid: boolean;
  changes: { section: string; note: string }[];
}

export interface Review {
  id: string;
  number: string;
  customerId: string;
  trigger: 'periodisch' | 'ereignis';
  status: ReviewStatus;
  createdAt: string;
  dueAt: string;
  eventIds: string[];
  requestedAt?: string;
  response?: CustomerResponse;
  caseId?: string;
  riskRecheck?: boolean;
  closedAt?: string;
  closedBy?: string;
  closeNote?: string;
}

export interface AuditEntry {
  id: string;
  seq: number;
  at: string;
  userId: string; // oder 'kunde' / 'system'
  role: Role | 'kunde' | 'system';
  action: string;
  objectType: 'Fall' | 'Kunde' | 'Dokument' | 'Alarm' | 'Überprüfung' | 'Ereignis' | 'Einstellungen' | 'System';
  objectId: string;
  objectLabel: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  /** Verkettung: Hash des Eintrags inkl. Hash des Vorgängers */
  hash: string;
}

export interface RiskCriterionConfig {
  id: 'domizil' | 'branche' | 'pep' | 'struktur' | 'herkunft' | 'volumen';
  label: string;
  description: string;
  enabled: boolean;
  /** Punkte je Ausprägung */
  points: Record<string, number>;
}

export interface Settings {
  criteria: RiskCriterionConfig[];
  gmerThreshold: number;
  reviewYears: { gmer: number; normal: number };
  slaDays: Record<Priority, number>;
  minJustification: number;
  phrases: string[];
  volumeDeviationPct: number;
}

/** Historische Kennzahlen (Vorperiode, für Diagramme) */
export interface HistoryWeek {
  week: string; // KW
  start: string;
  avgDays: number;
  opened: number;
}

export interface HistoryAlertMonth {
  month: string;
  falsch_positiv: number;
  plausibilisiert: number;
  eskaliert: number;
}

export interface HistoryScenario {
  scenario: ScenarioId;
  total: number;
  falsePositive: number;
  avgMinutes: number;
}
