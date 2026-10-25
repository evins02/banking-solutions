/**
 * Fiktive Testdaten. Datumswerte relativ zum ersten Start, damit Fristen in der Demo stimmen.
 */
import type {
  Alert,
  AlertOutcome,
  CaseDocument,
  CaseStatus,
  Customer,
  DocStatus,
  Entity,
  HistoryAlertMonth,
  HistoryScenario,
  HistoryWeek,
  KycEvent,
  OnboardingCase,
  Person,
  Priority,
  Review,
  ScenarioId,
  Settings,
  SourceOfFunds,
  Transaction,
} from '../types';
import { assessRisk, requiredDocs, suggestedControllers } from '../lib/domain';
import { compareOwners, lookupOwners } from '../services/transparenzregister';
import { HR_RECORDS, PEOPLE, STRUCTURES } from './registers';
import { addDays, addYears, isoWeek, MONTHS, rng } from '../lib/format';
import { INDUSTRIES } from '../lib/catalog';

const NOW = () => new Date().toISOString();
const ago = (d: number, h = 0) => addDays(NOW(), -d - h / 24);
const inDays = (d: number) => addDays(NOW(), d);

/* ------------------------------------------------------------------ */
/* Kunden                                                              */
/* ------------------------------------------------------------------ */

interface Profile {
  industry: string;
  relationshipPurpose: string;
  expectedVolume: number;
  expectedCashShare: number;
  sourceOfFunds: SourceOfFunds;
  advisorId?: string;
}

function personName(id: string, persons: Person[]) {
  const p = persons.find((x) => x.id === id);
  return p ? `${p.firstName} ${p.lastName}` : id;
}

/** Baut Entitäten/Beteiligungen aus der Strukturdefinition */
export function buildStructure(customerId: string, name: string, country: string, uidNo: string, persons: Person[]) {
  const def = STRUCTURES[uidNo] ?? { companies: [], holdings: [] };
  const map = (k: string) => (k === 'root' ? customerId : k.startsWith('p-') ? `e-${k}` : `${customerId}-${k}`);
  const entities: Entity[] = [
    { id: customerId, kind: 'company', name, country },
    ...def.companies.map((c) => ({ id: map(c.key), kind: 'company' as const, name: c.name, country: c.country })),
  ];
  for (const pid of new Set(def.holdings.map(([o]) => o).filter((o) => o.startsWith('p-')))) {
    const p = persons.find((x) => x.id === pid);
    entities.push({ id: map(pid), kind: 'person', name: personName(pid, persons), country: p?.nationality ?? 'CH', personId: pid });
  }
  const holdings = def.holdings.map(([o, d, pct], i) => ({ id: `${customerId}-h${i}`, ownerId: map(o), ownedId: map(d), percent: pct }));
  return { entities, holdings };
}

function customerFromHr(id: string, uidNo: string, profile: Profile, settings: Settings, extra: Partial<Customer> = {}): Customer {
  const r = HR_RECORDS.find((x) => x.uid === uidNo);
  if (!r) throw new Error(`HR-Eintrag fehlt: ${uidNo}`);
  const country = extra.country ?? 'CH';
  const { entities, holdings } = buildStructure(id, r.name, country, uidNo, PEOPLE);
  const industry = INDUSTRIES.find((i) => i.name === profile.industry);
  const c: Customer = {
    id,
    name: r.name,
    uid: r.uid,
    legalForm: r.legalForm,
    street: r.street,
    seat: r.seat,
    canton: r.canton,
    country,
    purpose: r.purpose,
    foundedAt: r.foundedAt,
    industry: profile.industry,
    cashIntensive: industry?.cashIntensive ?? false,
    signatories: r.signatories.map((s) => ({ ...s, fromRegister: true })),
    entities,
    holdings,
    controllerIds: [],
    formType: r.legalForm === 'Stiftung' ? 'A' : 'K',
    relationshipPurpose: profile.relationshipPurpose,
    expectedVolume: profile.expectedVolume,
    expectedCashShare: profile.expectedCashShare,
    sourceOfFunds: profile.sourceOfFunds,
    riskLevel: 'normal',
    riskScore: 0,
    status: 'aktiv',
    advisorId: profile.advisorId ?? 'u-kb',
    prefilled: ['name', 'uid', 'legalForm', 'street', 'seat', 'canton', 'purpose', 'foundedAt', 'signatories'],
    ...extra,
  };
  c.controllerIds = suggestedControllers(c).personIds;
  const risk = assessRisk({ customer: c, persons: PEOPLE }, settings);
  c.riskLevel = risk.final;
  c.riskScore = risk.total;
  return c;
}

const ACTIVE: [string, string, Profile, Partial<Customer>?][] = [
  ['k-101', 'CHE-999.100.101', { industry: 'Holzbau / Schreinerei', relationshipPurpose: 'Zahlungsverkehr, Betriebskredit und Lohnzahlungen', expectedVolume: 3_200_000, expectedCashShare: 2, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-102', 'CHE-999.100.102', { industry: 'Bauhauptgewerbe', relationshipPurpose: 'Zahlungsverkehr und Baukonto', expectedVolume: 4_500_000, expectedCashShare: 1, sourceOfFunds: 'Geschäftstätigkeit', advisorId: 'u-kb2' }],
  ['k-103', 'CHE-999.100.103', { industry: 'Gastronomie', relationshipPurpose: 'Zahlungsverkehr, Einzahlung Tageseinnahmen', expectedVolume: 1_100_000, expectedCashShare: 40, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-104', 'CHE-999.100.104', { industry: 'Treuhand / Beratung', relationshipPurpose: 'Zahlungsverkehr und Anlage liquider Mittel', expectedVolume: 8_000_000, expectedCashShare: 0, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-105', 'CHE-999.100.105', { industry: 'Rohstoffhandel', relationshipPurpose: 'Handelsfinanzierung und internationaler Zahlungsverkehr', expectedVolume: 45_000_000, expectedCashShare: 0, sourceOfFunds: 'Kapitalerhöhung Muttergesellschaft', advisorId: 'u-kb2' }],
  ['k-106', 'CHE-999.100.106', { industry: 'Edelmetall- und Uhrenhandel', relationshipPurpose: 'Zahlungsverkehr, Edelmetallkonto', expectedVolume: 12_000_000, expectedCashShare: 10, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-107', 'CHE-999.100.107', { industry: 'Immobilien', relationshipPurpose: 'Mietzinskonto und Hypothekarfinanzierung', expectedVolume: 6_000_000, expectedCashShare: 0, sourceOfFunds: 'Erbschaft / Schenkung' }],
  ['k-108', 'CHE-999.100.108', { industry: 'Autohandel', relationshipPurpose: 'Zahlungsverkehr und Leasingabwicklung', expectedVolume: 5_500_000, expectedCashShare: 15, sourceOfFunds: 'Geschäftstätigkeit', advisorId: 'u-kb2' }],
  ['k-109', 'CHE-999.100.109', { industry: 'Kultur / Gemeinnützig', relationshipPurpose: 'Vereinskonto (Mitgliederbeiträge, Konzerte)', expectedVolume: 80_000, expectedCashShare: 20, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-110', 'CHE-999.100.110', { industry: 'Kultur / Gemeinnützig', relationshipPurpose: 'Stiftungsvermögen und Vergabungen', expectedVolume: 900_000, expectedCashShare: 0, sourceOfFunds: 'Erbschaft / Schenkung' }],
  ['k-111', 'CHE-999.100.111', { industry: 'Elektroinstallation', relationshipPurpose: 'Geschäftskonto Einzelunternehmen', expectedVolume: 650_000, expectedCashShare: 3, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-112', 'CHE-999.100.112', { industry: 'Informatik / Software', relationshipPurpose: 'Zahlungsverkehr und Lohnzahlungen', expectedVolume: 2_400_000, expectedCashShare: 0, sourceOfFunds: 'Geschäftstätigkeit', advisorId: 'u-kb2' }],
  ['k-113', 'CHE-999.100.113', { industry: 'Velohandel / Werkstatt', relationshipPurpose: 'Geschäftskonto und Kartenterminal', expectedVolume: 900_000, expectedCashShare: 12, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-114', 'CHE-999.100.114', { industry: 'Kunsthandel', relationshipPurpose: 'Abwicklung von Kunstverkäufen und Auktionen', expectedVolume: 3_800_000, expectedCashShare: 35, sourceOfFunds: 'Geschäftstätigkeit' }],
  ['k-115', 'CHE-999.100.115', { industry: 'Sport / Freizeit', relationshipPurpose: 'Vereinskonto (Beiträge, Sponsoring, Anlässe)', expectedVolume: 150_000, expectedCashShare: 25, sourceOfFunds: 'Geschäftstätigkeit' }],
];

/** Letzte Überprüfung und Fälligkeit je Kunde (Tage relativ zu heute) */
const REVIEW_DATES: Record<string, [number, number]> = {
  'k-101': [-1083, 12],
  'k-102': [-1070, 25],
  'k-103': [-200, 900],
  'k-104': [-400, 700],
  'k-105': [-120, 245],
  'k-106': [-345, 20],
  'k-107': [-90, 275],
  'k-108': [-150, 215],
  'k-109': [-600, 495],
  'k-110': [-1098, -3],
  'k-111': [-1090, 5],
  'k-112': [-500, 595],
  'k-113': [-1103, -8],
  'k-114': [-300, 795],
  'k-115': [-700, 395],
};

/* ------------------------------------------------------------------ */
/* Onboarding-Fälle                                                    */
/* ------------------------------------------------------------------ */

interface CaseDef {
  id: string;
  number: string;
  customerId: string;
  uid: string;
  profile: Profile;
  status: CaseStatus;
  createdDaysAgo: number;
  /** Status je Dokumenttyp, Rest = Standard */
  docs: (type: string, index: number) => DocStatus;
  country?: string;
  checked?: boolean;
  returnNote?: string;
}

const ONBOARDING: CaseDef[] = [
  {
    id: 'f-201',
    number: 'ONB-2026-041',
    customerId: 'k-201',
    uid: 'CHE-999.200.201',
    profile: { industry: 'Bauhauptgewerbe', relationshipPurpose: 'Zahlungsverkehr und Betriebskredit', expectedVolume: 1_800_000, expectedCashShare: 2, sourceOfFunds: 'Geschäftstätigkeit' },
    status: 'in_erfassung',
    createdDaysAgo: 4,
    docs: (t) => (t === 'hr_auszug' || t === 'statuten' ? 'hochgeladen' : 'fehlt'),
    checked: true,
  },
  {
    id: 'f-202',
    number: 'ONB-2026-039',
    customerId: 'k-202',
    uid: 'CHE-999.200.202',
    profile: { industry: 'Gastronomie', relationshipPurpose: 'Zahlungsverkehr, Kartenterminal, Einzahlung Bargeld', expectedVolume: 750_000, expectedCashShare: 35, sourceOfFunds: 'Geschäftstätigkeit', advisorId: 'u-kb2' },
    status: 'zurueckgewiesen',
    createdDaysAgo: 12,
    docs: (t) => (t === 'formular_k' ? 'abgelehnt' : 'geprueft'),
    checked: true,
    returnNote: 'Formular K ist nicht unterzeichnet. Bitte neu einholen und Herkunft des Startkapitals belegen.',
  },
  {
    id: 'f-203',
    number: 'ONB-2026-037',
    customerId: 'k-203',
    uid: 'CHE-999.200.203',
    profile: { industry: 'Treuhand / Beratung', relationshipPurpose: 'Zahlungsverkehr und Lohnzahlungen', expectedVolume: 1_200_000, expectedCashShare: 0, sourceOfFunds: 'Geschäftstätigkeit' },
    status: 'eingereicht',
    createdDaysAgo: 8,
    docs: (t) => (t === 'unterschriftenkarte' ? 'hochgeladen' : 'geprueft'),
    checked: true,
  },
  {
    id: 'f-204',
    number: 'ONB-2026-035',
    customerId: 'k-204',
    uid: 'CHE-999.200.204',
    profile: { industry: 'Rohstoffhandel', relationshipPurpose: 'Internationaler Zahlungsverkehr, Akkreditive', expectedVolume: 25_000_000, expectedCashShare: 0, sourceOfFunds: 'Kapitalerhöhung Muttergesellschaft', advisorId: 'u-kb2' },
    status: 'zweite_freigabe',
    createdDaysAgo: 15,
    docs: () => 'geprueft',
    checked: true,
  },
  {
    id: 'f-205',
    number: 'ONB-2026-033',
    customerId: 'k-205',
    uid: 'CHE-999.200.205',
    profile: { industry: 'Kultur / Gemeinnützig', relationshipPurpose: 'Stiftungsvermögen und Auszahlung von Stipendien', expectedVolume: 400_000, expectedCashShare: 0, sourceOfFunds: 'Erbschaft / Schenkung' },
    status: 'freigegeben',
    createdDaysAgo: 18,
    docs: (t) => (t === 'stiftungsrat' ? 'hochgeladen' : 'geprueft'),
    checked: true,
  },
  {
    id: 'f-206',
    number: 'ONB-2026-030',
    customerId: 'k-206',
    uid: 'CHE-999.200.206',
    profile: { industry: 'Detailhandel', relationshipPurpose: 'Geschäftskonto und Einzahlung Tageseinnahmen', expectedVolume: 380_000, expectedCashShare: 30, sourceOfFunds: 'Geschäftstätigkeit' },
    status: 'eroeffnet',
    createdDaysAgo: 24,
    docs: () => 'geprueft',
    checked: true,
  },
];

function buildCase(def: CaseDef, settings: Settings): { customer: Customer; cs: OnboardingCase } {
  const customer = customerFromHr(def.customerId, def.uid, def.profile, settings, {
    status: def.status === 'eroeffnet' ? 'aktiv' : 'onboarding',
    country: def.country ?? 'CH',
  });
  const created = ago(def.createdDaysAgo, 3);
  const documents: CaseDocument[] = requiredDocs(customer).map((r, i) => {
    const status = def.docs(r.type, i);
    return {
      id: `${def.id}-d${i}`,
      type: r.type,
      personId: r.personId,
      status,
      requestedAt: addDays(created, 0.1),
      ...(status !== 'fehlt'
        ? { fileName: `${r.type}_${customer.name.split(' ')[0].toLowerCase()}${r.personId ? `_${r.personId.split('-')[1]}` : ''}.pdf`, uploadedAt: addDays(created, 1 + (i % 3)), uploadedBy: i % 2 ? 'kunde' : def.profile.advisorId ?? 'u-kb' }
        : {}),
      ...(status === 'abgelehnt' ? { rejectReason: 'Nicht unterzeichnet' } : {}),
    };
  });
  const register = def.checked ? lookupOwners(customer).owners : undefined;
  const deviations = register ? compareOwners(customer, register) : [];
  const risk = assessRisk({ customer, persons: PEOPLE }, settings);
  const advisor = def.profile.advisorId ?? 'u-kb';
  const cs: OnboardingCase = {
    id: def.id,
    number: def.number,
    customerId: customer.id,
    kind: 'onboarding',
    status: def.status,
    advisorId: advisor,
    createdAt: created,
    documents,
    registerOwners: register,
    registerCheckedAt: def.checked ? addDays(created, 0.2) : undefined,
    deviations,
    risk: ['in_erfassung', 'zurueckgewiesen'].includes(def.status) ? undefined : risk,
    approvals: [],
    masterDataFinal: def.status === 'eroeffnet',
    returnNote: def.returnNote,
  };
  if (['eingereicht', 'zweite_freigabe', 'freigegeben', 'eroeffnet'].includes(def.status)) cs.submittedAt = addDays(created, 4);
  if (['zweite_freigabe', 'freigegeben', 'eroeffnet'].includes(def.status) && cs.risk) {
    cs.risk = { ...cs.risk, confirmedBy: 'u-co', confirmedAt: addDays(created, 6) };
    cs.approvals.push({ step: 'compliance', userId: 'u-co', at: addDays(created, 6), decision: 'freigegeben', comment: 'Unterlagen vollständig, Risikoeinstufung bestätigt.' });
  }
  if (def.status === 'zurueckgewiesen') {
    cs.submittedAt = addDays(created, 5);
    cs.approvals.push({ step: 'compliance', userId: 'u-co', at: addDays(created, 7), decision: 'zurueckgewiesen', comment: def.returnNote ?? '' });
  }
  if (['freigegeben', 'eroeffnet'].includes(def.status) && cs.risk?.final === 'gmer') {
    cs.approvals.push({ step: 'leitung', userId: 'u-lc', at: addDays(created, 8), decision: 'freigegeben', comment: 'Zweite Freigabe erteilt.' });
  }
  if (def.status === 'eroeffnet') {
    cs.approvals.push({ step: 'backoffice', userId: 'u-bo', at: addDays(created, 9), decision: 'eroeffnet', comment: 'Konto eröffnet.' });
    cs.closedAt = addDays(created, 9);
    customer.openedAt = cs.closedAt;
    customer.lastReviewAt = cs.closedAt;
    customer.nextReviewAt = addYears(cs.closedAt, risk.final === 'gmer' ? settings.reviewYears.gmer : settings.reviewYears.normal);
  }
  return { customer, cs };
}

/* ------------------------------------------------------------------ */
/* Transaktionen und Alarme                                            */
/* ------------------------------------------------------------------ */

const COUNTERPARTIES = ['Muster Lieferanten AG', 'Beispiel Grosshandel GmbH', 'Exempel Versicherung AG', 'Fiktiv Energie AG', 'Demo Leasing AG', 'Steuerverwaltung (fiktiv)', 'Ausgleichskasse (fiktiv)', 'Platzhalter Logistik GmbH', 'Beispiel Software AG', 'Muster Kunde GmbH'];

/** Faktor tatsächliches / erwartetes Volumen (Demo Gastro deutlich darüber) */
const VOLUME_FACTOR: Record<string, number> = { 'k-103': 2.6, 'k-108': 1.3 };

function generateTransactions(customers: Customer[]): Transaction[] {
  const txs: Transaction[] = [];
  customers.forEach((c, ci) => {
    if (c.status !== 'aktiv') return;
    const r = rng(1000 + ci * 17);
    const perMonth = (c.expectedVolume / 12) * (VOLUME_FACTOR[c.id] ?? 0.9 + r() * 0.2);
    const count = Math.max(6, Math.min(40, Math.round(perMonth / 25_000) + 8));
    for (let m = 0; m < 3; m++) {
      for (let i = 0; i < count; i++) {
        const cash = r() * 100 < c.expectedCashShare;
        const incoming = r() > 0.48;
        const amount = Math.round(((perMonth / count) * (0.4 + r() * 1.2)) / 2) * 2 + Math.round(r() * 100) / 100;
        txs.push({
          id: `t-${c.id}-${m}-${i}`,
          customerId: c.id,
          date: ago(m * 30 + Math.floor(r() * 30), Math.floor(r() * 10)),
          amount: Math.max(50, amount),
          direction: incoming ? 'eingang' : 'ausgang',
          type: cash ? (incoming ? 'Bareinzahlung' : 'Barbezug') : incoming ? 'Überweisung' : r() > 0.7 ? 'Lastschrift' : 'Überweisung',
          counterparty: cash ? 'Kasse Filiale' : COUNTERPARTIES[Math.floor(r() * COUNTERPARTIES.length)],
          counterpartyCountry: cash ? 'CH' : r() > 0.9 ? 'DE' : 'CH',
          reference: incoming ? 'Rechnung' : 'Zahlung',
        });
      }
    }
  });
  return txs;
}

interface AlertDef {
  customerId: string;
  scenario: ScenarioId;
  amount: number;
  daysAgo: number;
  priority: Priority;
  /** offen | in_bearbeitung | eskaliert | Ergebnis */
  state: 'offen' | 'in_bearbeitung' | 'eskaliert' | AlertOutcome;
  overdue?: boolean;
  country?: string;
  counterparty?: string;
  minutes?: number;
  justification?: string;
}

const ALERTS: AlertDef[] = [
  // offen, davon 3 mit überschrittener Frist
  { customerId: 'k-103', scenario: 'bar_schwelle', amount: 128_500, daysAgo: 9, priority: 'hoch', state: 'offen', overdue: true },
  { customerId: 'k-114', scenario: 'bar_schwelle', amount: 210_000, daysAgo: 11, priority: 'hoch', state: 'in_bearbeitung', overdue: true },
  { customerId: 'k-105', scenario: 'risikoland', amount: 1_450_000, daysAgo: 16, priority: 'mittel', state: 'offen', overdue: true, country: 'PA', counterparty: 'Fiktiv Trading Inc.' },
  { customerId: 'k-108', scenario: 'durchlauf', amount: 385_000, daysAgo: 2, priority: 'hoch', state: 'offen', country: 'AT', counterparty: 'Exempel Motors GmbH' },
  { customerId: 'k-106', scenario: 'risikoland', amount: 620_000, daysAgo: 1, priority: 'hoch', state: 'offen', country: 'AE', counterparty: 'Fiktiv Gold DMCC' },
  { customerId: 'k-113', scenario: 'profil_abweichung', amount: 240_000, daysAgo: 3, priority: 'mittel', state: 'offen', counterparty: 'Beispiel Velo Import GmbH' },
  { customerId: 'k-101', scenario: 'bar_schwelle', amount: 104_000, daysAgo: 1, priority: 'mittel', state: 'offen' },
  { customerId: 'k-112', scenario: 'profil_abweichung', amount: 1_150_000, daysAgo: 4, priority: 'mittel', state: 'in_bearbeitung', counterparty: 'Exempel Ventures AG' },
  { customerId: 'k-115', scenario: 'strukturierung', amount: 38_400, daysAgo: 5, priority: 'tief', state: 'offen' },
  { customerId: 'k-104', scenario: 'durchlauf', amount: 2_300_000, daysAgo: 2, priority: 'hoch', state: 'offen', country: 'LU', counterparty: 'Exempel Group S.à r.l.' },
  { customerId: 'k-107', scenario: 'profil_abweichung', amount: 3_500_000, daysAgo: 6, priority: 'mittel', state: 'offen', counterparty: 'Notariat Beispiel (fiktiv)' },
  { customerId: 'k-109', scenario: 'bar_schwelle', amount: 100_500, daysAgo: 3, priority: 'tief', state: 'offen' },
  { customerId: 'k-102', scenario: 'risikoland', amount: 85_000, daysAgo: 0, priority: 'tief', state: 'offen', country: 'TR', counterparty: 'Beispiel Insaat Ltd.' },
  { customerId: 'k-114', scenario: 'strukturierung', amount: 47_200, daysAgo: 4, priority: 'mittel', state: 'offen' },
  // eskaliert, wartet auf Leitung Compliance
  { customerId: 'k-105', scenario: 'durchlauf', amount: 4_800_000, daysAgo: 6, priority: 'hoch', state: 'eskaliert', country: 'CY', counterparty: 'Fiktiva Holdings Ltd.', justification: 'Eingang CHF 4.8 Mio. von Fiktiva Holdings Ltd. (Zypern) am Vortag, Weiterleitung von CHF 4.75 Mio. an Fiktiv Trading Inc. (Panama) innert 48 Stunden. Kein Handelsvertrag oder Rechnung vorgelegt, wirtschaftlicher Hintergrund unklar.' },
  { customerId: 'k-103', scenario: 'strukturierung', amount: 57_000, daysAgo: 8, priority: 'hoch', state: 'eskaliert', justification: 'Sechs Bareinzahlungen zwischen CHF 9\'200 und CHF 9\'900 innert acht Tagen an verschiedenen Filialen. Kassenbücher für die betreffenden Tage wurden angefordert, Rückmeldung des Kunden steht seit 5 Tagen aus.' },
  // abgeschlossen
  { customerId: 'k-101', scenario: 'bar_schwelle', amount: 112_000, daysAgo: 20, priority: 'mittel', state: 'falsch_positiv', minutes: 18, justification: 'Bareinzahlung CHF 112\'000 am Monatsende aus Verkauf von Restholz an Sägerei «Beispiel Holzwerk AG», Lieferschein Nr. 2026-114 und Quittung liegen vor. Entspricht dem jährlichen Lagerabbau gemäss Kundenprofil.' },
  { customerId: 'k-113', scenario: 'bar_schwelle', amount: 101_000, daysAgo: 25, priority: 'tief', state: 'falsch_positiv', minutes: 12, justification: 'Bareinzahlung aus Velobörse vom 14.09., Kassenabrechnung mit 412 Einzelverkäufen liegt vor. Anlass findet jährlich statt und ist im KYC-Profil vermerkt (Zweck: Kartenterminal und Bareinzahlungen).' },
  { customerId: 'k-111', scenario: 'profil_abweichung', amount: 180_000, daysAgo: 30, priority: 'tief', state: 'falsch_positiv', minutes: 15, justification: 'Zahlungseingang CHF 180\'000 der Gemeinde Beispielstadt für Elektroinstallation Schulhaus, Rechnung Nr. 2026-088 und Werkvertrag vom 12.03. liegen vor. Einmaliger Grossauftrag, KYC-Profil wird angepasst.' },
  { customerId: 'k-102', scenario: 'bar_schwelle', amount: 100_200, daysAgo: 33, priority: 'tief', state: 'falsch_positiv', minutes: 9, justification: 'Bareinzahlung CHF 100\'200 aus Verkauf eines Baggers an Privatperson, Kaufvertrag vom 02.09. und Fahrzeugausweis liegen vor. Betrag entspricht Kaufpreis gemäss Vertrag.' },
  { customerId: 'k-112', scenario: 'risikoland', amount: 24_000, daysAgo: 28, priority: 'tief', state: 'falsch_positiv', minutes: 11, country: 'TR', counterparty: 'Beispiel Yazilim Ltd.', justification: 'Zahlung an Softwareentwickler in Istanbul für Teilprojekt «Kundenportal», Rahmenvertrag vom 10.01. und Rechnung Nr. 77 liegen vor. Gegenpartei seit 2024 bekannt, wiederkehrende Zahlungen.' },
  { customerId: 'k-115', scenario: 'bar_schwelle', amount: 102_000, daysAgo: 40, priority: 'tief', state: 'falsch_positiv', minutes: 10, justification: 'Bareinzahlung CHF 102\'000 aus Grümpelturnier vom 23.08. (Festwirtschaft, Startgelder), Kassenabrechnung des Organisationskomitees liegt vor. Jährlicher Anlass gemäss Vereinszweck.' },
  { customerId: 'k-104', scenario: 'durchlauf', amount: 950_000, daysAgo: 22, priority: 'mittel', state: 'plausibilisiert', minutes: 46, country: 'LU', counterparty: 'Exempel Group S.à r.l.', justification: 'Eingang CHF 950\'000 von Muttergesellschaft (Luxemburg) als Darlehen gemäss Darlehensvertrag vom 01.10., Weiterleitung CHF 930\'000 an Exempel Holding AG zur Rückzahlung Bankkredit. Vertrag und Kontoauszug der Holding liegen vor.' },
  { customerId: 'k-106', scenario: 'profil_abweichung', amount: 2_400_000, daysAgo: 35, priority: 'mittel', state: 'plausibilisiert', minutes: 38, counterparty: 'Fiktiv Uhren Distribution SA', justification: 'Eingang CHF 2.4 Mio. aus Saisonverkauf an Distributor, Rechnungen Nr. 2026-301 bis 2026-318 liegen vor. Volumen über Profil wegen neuer Produktlinie, Anpassung KYC-Profil bei nächster Überprüfung.' },
  { customerId: 'k-108', scenario: 'durchlauf', amount: 640_000, daysAgo: 45, priority: 'hoch', state: 'mros', minutes: 120, country: 'AT', counterparty: 'Exempel Motors GmbH', justification: 'Eingang CHF 640\'000 von Exempel Motors GmbH (Österreich), am Folgetag Weiterleitung an Privatkonto in Österreich. Keine Fahrzeuglieferung belegt, Gesellschafter ist ausländische PEP. Verdacht auf Verschleierung, Meldung an MROS vorbereitet.' },
];

function triggerTx(a: AlertDef, id: string, date: string): Transaction[] {
  const base = { customerId: a.customerId, date, counterpartyCountry: a.country ?? 'CH' };
  switch (a.scenario) {
    case 'bar_schwelle':
      return [{ ...base, id, amount: a.amount, direction: 'eingang', type: 'Bareinzahlung', counterparty: 'Kasse Filiale', reference: 'Bareinzahlung' }];
    case 'strukturierung': {
      const n = 5;
      return Array.from({ length: n }, (_, i) => ({
        ...base,
        id: i === n - 1 ? id : `${id}-s${i}`,
        date: addDays(date, -(n - 1 - i) * 1.7),
        amount: Math.round(a.amount / n / 10) * 10 - i * 30,
        direction: 'eingang' as const,
        type: 'Bareinzahlung' as const,
        counterparty: `Kasse Filiale ${['Bern', 'Thun', 'Biel', 'Olten', 'Aarau'][i]}`,
        reference: 'Bareinzahlung',
      }));
    }
    case 'durchlauf':
      return [
        { ...base, id: `${id}-in`, date: addDays(date, -1.5), amount: a.amount, direction: 'eingang', type: 'Überweisung', counterparty: a.counterparty ?? 'Unbekannt', reference: 'Zahlung gem. Vereinbarung' },
        { ...base, id, amount: Math.round(a.amount * 0.98), direction: 'ausgang', type: 'Überweisung', counterparty: a.counterparty ? `${a.counterparty} (Konto 2)` : 'Drittkonto', reference: 'Weiterleitung' },
      ];
    case 'risikoland':
      return [{ ...base, id, amount: a.amount, direction: 'ausgang', type: 'Überweisung', counterparty: a.counterparty ?? 'Unbekannt', reference: 'Zahlung Rechnung' }];
    case 'profil_abweichung':
      return [{ ...base, id, amount: a.amount, direction: 'eingang', type: 'Überweisung', counterparty: a.counterparty ?? 'Unbekannt', reference: 'Zahlung' }];
  }
}

function buildAlerts(settings: Settings): { alerts: Alert[]; txs: Transaction[] } {
  const alerts: Alert[] = [];
  const txs: Transaction[] = [];
  ALERTS.forEach((a, i) => {
    const id = `AL-2026-${String(318 + i).padStart(4, '0')}`;
    const triggeredAt = ago(a.daysAgo, 2 + (i % 6));
    const txId = `t-${id}`;
    txs.push(...triggerTx(a, txId, triggeredAt));
    const sla = settings.slaDays[a.priority];
    const dueAt = a.overdue ? addDays(triggeredAt, Math.min(sla, a.daysAgo - 1)) : addDays(triggeredAt, a.state === 'eskaliert' ? sla + 10 : sla);
    const closed = !['offen', 'in_bearbeitung', 'eskaliert'].includes(a.state);
    const alert: Alert = {
      id,
      customerId: a.customerId,
      scenario: a.scenario,
      amount: a.amount,
      triggeredAt,
      priority: a.priority,
      dueAt,
      status: closed ? 'abgeschlossen' : (a.state as Alert['status']),
      triggerTxId: txId,
      assigneeId: a.state === 'offen' ? undefined : 'u-co',
      answers: {},
      justification: a.justification ?? '',
      evidence: closed || a.state === 'eskaliert' ? `beleg_${id.toLowerCase()}.pdf` : undefined,
      noEvidenceReason: '',
    };
    if (a.state === 'eskaliert') alert.escalation = { by: 'u-co', at: addDays(triggeredAt, 1.5), note: a.justification ?? '' };
    if (closed) {
      alert.outcome = a.state as AlertOutcome;
      alert.closedAt = addDays(triggeredAt, 1 + (i % 3));
      alert.closedBy = a.state === 'mros' ? 'u-lc' : 'u-co';
      alert.handlingMinutes = a.minutes;
      if (a.state === 'mros') {
        alert.escalation = { by: 'u-co', at: addDays(triggeredAt, 1), note: a.justification ?? '', decision: 'mros', decidedBy: 'u-lc', decidedAt: alert.closedAt, decisionNote: 'Begründeter Verdacht, Meldung nach Art. 9 GwG.' };
        alert.mros = {
          createdAt: alert.closedAt!,
          createdBy: 'u-lc',
          basis: 'Art. 9 GwG (Meldepflicht)',
          facts: a.justification ?? '',
          suspicion: 'Verdacht auf Geldwäscherei (Art. 305bis StGB): Durchlauftransaktion ohne erkennbaren wirtschaftlichen Hintergrund.',
          measures: 'Vermögenswerte nicht gesperrt (keine Sperrpflicht vor Rückmeldung MROS), Geschäftsbeziehung unter Beobachtung.',
        };
      }
    }
    alerts.push(alert);
  });
  return { alerts, txs };
}

/* ------------------------------------------------------------------ */
/* Überprüfungen und Ereignisse                                        */
/* ------------------------------------------------------------------ */

function buildReviews(customers: Customer[]): { reviews: Review[]; events: KycEvent[] } {
  const reviews: Review[] = [];
  const events: KycEvent[] = [];
  let n = 81;
  const rev = (customerId: string, r: Partial<Review>): Review => {
    const c = customers.find((x) => x.id === customerId)!;
    const review: Review = {
      id: `r-${customerId}`,
      number: `KYC-2026-${String(n++).padStart(3, '0')}`,
      customerId,
      trigger: 'periodisch',
      status: 'offen',
      createdAt: ago(30),
      dueAt: c.nextReviewAt ?? inDays(30),
      eventIds: [],
      ...r,
    };
    reviews.push(review);
    return review;
  };
  // periodisch
  rev('k-101', { status: 'in_pruefung', requestedAt: ago(10), response: { at: ago(2), viaEid: false, changes: [] } });
  rev('k-102', { status: 'offen' });
  rev('k-113', { status: 'warten_auf_kunde', requestedAt: ago(20), createdAt: ago(45) });
  rev('k-111', { status: 'offen' });
  rev('k-106', {
    status: 'in_pruefung',
    requestedAt: ago(14),
    response: { at: ago(3), viaEid: false, changes: [{ section: 'Geschäftstätigkeit', note: 'Neu zusätzlich Ankauf von Altgold von Privatpersonen (ca. CHF 1.5 Mio. pro Jahr, teilweise bar).' }] },
  });
  rev('k-110', { status: 'offen', createdAt: ago(40) });
  // ereignisgesteuert
  const evt = (e: Omit<KycEvent, 'id'>, r: Partial<Review>) => {
    const id = `ev-${e.customerId}-${events.length + 1}`;
    const review = rev(e.customerId, { trigger: 'ereignis', eventIds: [id], ...r });
    events.push({ ...e, id, reviewId: review.id });
  };
  evt(
    { customerId: 'k-104', type: 'hr_mutation', source: 'Handelsregister (SHAB)', date: ago(3), title: 'Neue zeichnungsberechtigte Person', detail: 'Eingetragen: Lea Exempel, Mitglied des Verwaltungsrates, mit Kollektivunterschrift zu zweien.', change: { field: 'Zeichnungsberechtigte', oldValue: '2 Person(en)', newValue: 'Lea Exempel, Mitglied des Verwaltungsrates, Kollektivunterschrift zu zweien', personId: 'p-lea-exempel', personFunction: 'Mitglied des Verwaltungsrates' } },
    { createdAt: ago(3), dueAt: inDays(27) },
  );
  evt(
    { customerId: 'k-112', type: 'tr_meldung', source: 'Transparenzregister', date: ago(6), title: 'Neue Meldung wirtschaftlich Berechtigte', detail: 'Ole Fiktiv neu mit 30 % gemeldet (bisher 20 %), Tim Beispiel neu mit 20 % (bisher 30 %).' },
    { createdAt: ago(6), dueAt: inDays(24) },
  );
  evt(
    { customerId: 'k-108', type: 'alarm_eskaliert', source: 'Transaktionsüberwachung (Alarm AL-2026-0342)', date: ago(44), title: 'Eskalierter Alarm mit MROS-Meldung', detail: 'Durchlauftransaktion CHF 640\'000.00, MROS-Meldung erstattet. Risikoeinstufung überprüfen (TmeR → GmeR).' },
    { createdAt: ago(44), dueAt: inDays(-14), riskRecheck: true },
  );
  evt(
    { customerId: 'k-103', type: 'volumen_abweichung', source: 'Transaktionsüberwachung (Volumenabgleich)', date: ago(1), title: 'Transaktionsvolumen deutlich über Profil', detail: 'Volumen der letzten 90 Tage rund 260 % des erwarteten Volumens gemäss KYC-Profil.' },
    { createdAt: ago(1), dueAt: inDays(29) },
  );
  return { reviews, events };
}

/* ------------------------------------------------------------------ */
/* Historie für Diagramme                                              */
/* ------------------------------------------------------------------ */

function buildHistory() {
  const weeks: HistoryWeek[] = [];
  const avg = [14.5, 13.8, 14.1, 12.9, 13.2, 12.1, 11.4, 11.8, 10.6, 10.1, 9.7, 9.2];
  for (let i = 11; i >= 0; i--) {
    const start = new Date(addDays(NOW(), -i * 7));
    weeks.push({ week: `KW ${isoWeek(start)}`, start: start.toISOString(), avgDays: avg[11 - i], opened: [3, 4, 2, 5, 3, 4, 6, 3, 4, 5, 4, 3][11 - i] });
  }
  const months: HistoryAlertMonth[] = [];
  const d = new Date();
  const data: [number, number, number][] = [
    [41, 6, 2],
    [38, 7, 3],
    [45, 5, 2],
    [36, 8, 4],
    [40, 6, 3],
    [33, 5, 2],
  ];
  for (let i = 5; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i - 1, 1);
    const [fp, pl, es] = data[5 - i];
    months.push({ month: `${MONTHS[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`, falsch_positiv: fp, plausibilisiert: pl, eskaliert: es });
  }
  const scenarios: HistoryScenario[] = [
    { scenario: 'bar_schwelle', total: 142, falsePositive: 133, avgMinutes: 14 },
    { scenario: 'durchlauf', total: 58, falsePositive: 39, avgMinutes: 41 },
    { scenario: 'profil_abweichung', total: 86, falsePositive: 71, avgMinutes: 27 },
    { scenario: 'risikoland', total: 47, falsePositive: 31, avgMinutes: 33 },
    { scenario: 'strukturierung', total: 21, falsePositive: 12, avgMinutes: 52 },
  ];
  return { weeks, months, scenarios, reviewsDoneYear: 34 };
}

/* ------------------------------------------------------------------ */

export function buildSeed(settings: Settings) {
  const customers: Customer[] = ACTIVE.map(([id, uidNo, profile, extra]) => {
    const c = customerFromHr(id, uidNo, profile, settings, extra);
    const [last, next] = REVIEW_DATES[id];
    c.lastReviewAt = ago(-last);
    c.nextReviewAt = inDays(next);
    c.openedAt = addYears(c.lastReviewAt, -2);
    return c;
  });
  const cases: OnboardingCase[] = [];
  for (const def of ONBOARDING) {
    const { customer, cs } = buildCase(def, settings);
    customers.push(customer);
    cases.push(cs);
  }
  const base = generateTransactions(customers);
  const { alerts, txs } = buildAlerts(settings);
  const { reviews, events } = buildReviews(customers);
  return {
    customers,
    persons: structuredClone(PEOPLE),
    cases,
    alerts,
    transactions: [...base, ...txs].sort((a, b) => b.date.localeCompare(a.date)),
    reviews,
    events,
    history: buildHistory(),
  };
}
