/**
 * Reine Fachlogik ohne UI: Unterlagen-Checkliste, Eigentümerstruktur,
 * Risikomodell, Qualität von Begründungen, Rechte und Voraussetzungen.
 * Die App schlägt vor – entscheiden tut immer eine Person.
 */
import type {
  CaseDocument,
  CriterionResult,
  Customer,
  DocType,
  Entity,
  OnboardingCase,
  Person,
  RiskAssessment,
  Role,
  Settings,
} from '../types';
import { countryRiskGroup } from './catalog';
import { fmtChfShort, uid } from './format';

/* ------------------------------------------------------------------ */
/* Unterlagen-Checkliste je Rechtsform                                 */
/* ------------------------------------------------------------------ */

export interface RequiredDoc {
  type: DocType;
  personId?: string;
}

export function requiredDocs(c: Customer, registered = true): RequiredDoc[] {
  const ids = c.signatories.map((s) => ({ type: 'ausweis' as const, personId: s.personId }));
  const form: DocType = c.formType === 'A' ? 'formular_a' : 'formular_k';
  switch (c.legalForm) {
    case 'AG':
    case 'GmbH':
      return [{ type: 'hr_auszug' }, { type: 'statuten' }, ...ids, { type: 'formular_k' }, { type: 'unterschriftenkarte' }];
    case 'Verein':
      return [{ type: 'statuten' }, { type: 'vorstandsliste' }, { type: form }];
    case 'Stiftung':
      return [{ type: 'stiftungsurkunde' }, { type: 'stiftungsrat' }, { type: form }];
    case 'Einzelunternehmen':
      return [ids[0] ?? { type: 'ausweis' }, ...(registered ? [{ type: 'hr_auszug' as const }] : [])];
  }
}

/** Gleicht bestehende Dokumente mit der Soll-Liste ab (behält Status bestehender Einträge) */
export function syncDocuments(c: Customer, existing: CaseDocument[]): CaseDocument[] {
  return requiredDocs(c).map((r) => {
    const found = existing.find((d) => d.type === r.type && (d.personId ?? '') === (r.personId ?? ''));
    return found ?? { id: uid('doc'), type: r.type, personId: r.personId, status: 'fehlt' };
  });
}

export const missingDocs = (docs: CaseDocument[]) => docs.filter((d) => d.status === 'fehlt' || d.status === 'abgelehnt');

/* ------------------------------------------------------------------ */
/* Eigentümerstruktur                                                  */
/* ------------------------------------------------------------------ */

export interface OwnerNode {
  entity: Entity;
  holdingId?: string;
  percent: number; // direkt am Elternknoten
  effective: number; // durchgerechnet bis zur Gesellschaft
  children: OwnerNode[];
}

export function ownershipTree(c: Customer): OwnerNode {
  const root = c.entities.find((e) => e.id === c.id) ?? { id: c.id, kind: 'company' as const, name: c.name, country: c.country };
  const build = (e: Entity, percent: number, effective: number, seen: Set<string>, holdingId?: string): OwnerNode => ({
    entity: e,
    holdingId,
    percent,
    effective,
    children: seen.has(e.id)
      ? []
      : c.holdings
          .filter((h) => h.ownedId === e.id)
          .map((h) => {
            const owner = c.entities.find((x) => x.id === h.ownerId);
            return owner ? build(owner, h.percent, (effective * h.percent) / 100, new Set([...seen, e.id]), h.id) : null;
          })
          .filter((n): n is OwnerNode => n !== null),
  });
  return build(root, 100, 100, new Set());
}

/** Anzahl Ebenen zwischen Gesellschaft und natürlichen Personen */
export function structureDepth(node: OwnerNode): number {
  if (node.children.length === 0) return 0;
  return 1 + Math.max(...node.children.map(structureDepth));
}

/** Natürliche Personen mit durchgerechneter Beteiligung (Summe über alle Pfade) */
export function effectiveOwners(c: Customer): { personId: string; name: string; percent: number }[] {
  const acc = new Map<string, { personId: string; name: string; percent: number }>();
  const walk = (n: OwnerNode) => {
    if (n.entity.kind === 'person' && n.entity.personId) {
      const prev = acc.get(n.entity.personId);
      acc.set(n.entity.personId, { personId: n.entity.personId, name: n.entity.name, percent: (prev?.percent ?? 0) + n.effective });
    }
    n.children.forEach(walk);
  };
  walk(ownershipTree(c));
  return [...acc.values()].sort((a, b) => b.percent - a.percent);
}

/** Vorschlag Kontrollinhaber: ab 25 %, sonst Rückfall auf geschäftsführende Person (Art. 2a Abs. 3 GwG) */
export function suggestedControllers(c: Customer): { personIds: string[]; fallback: boolean } {
  const above = effectiveOwners(c).filter((o) => o.percent >= 25 - 1e-9);
  if (above.length > 0) return { personIds: above.map((o) => o.personId), fallback: false };
  const manager = c.signatories.find((s) => /geschäftsführ|präsident|inhaber/i.test(s.function)) ?? c.signatories[0];
  return { personIds: manager ? [manager.personId] : [], fallback: true };
}

/* ------------------------------------------------------------------ */
/* Risikomodell (Punktemodell, konfigurierbar)                          */
/* ------------------------------------------------------------------ */

export interface RiskContext {
  customer: Customer;
  persons: Person[];
}

function relatedPersons({ customer, persons }: RiskContext): Person[] {
  const ids = new Set([
    ...customer.signatories.map((s) => s.personId),
    ...customer.controllerIds,
    ...customer.entities.filter((e) => e.personId).map((e) => e.personId as string),
  ]);
  return persons.filter((p) => ids.has(p.id));
}

export function assessRisk(ctx: RiskContext, settings: Settings): RiskAssessment {
  const c = ctx.customer;
  const results: CriterionResult[] = [];
  for (const cr of settings.criteria) {
    if (!cr.enabled) continue;
    const p = (k: string) => cr.points[k] ?? 0;
    switch (cr.id) {
      case 'domizil': {
        const countries = [...new Set(c.entities.filter((e) => e.kind === 'company').map((e) => e.country).concat(c.country))];
        const groups = countries.map((x) => ({ x, g: countryRiskGroup(x) }));
        const worst = groups.reduce((a, b) => (p(b.g) > p(a.g) ? b : a), groups[0]);
        const label = { ch: 'Schweiz', eu: 'EU/EFTA', drittland: 'Drittland', hochrisiko: 'Hochrisikoland' }[worst.g];
        results.push({
          criterionId: cr.id,
          label: cr.label,
          value: countries.join(', '),
          points: p(worst.g),
          reason: worst.g === 'ch' ? 'Sitz und alle Gesellschaften der Struktur in der Schweiz.' : `Gesellschaft der Struktur mit Sitz in ${worst.x} (${label}).`,
        });
        break;
      }
      case 'branche':
        results.push({
          criterionId: cr.id,
          label: cr.label,
          value: c.industry,
          points: c.cashIntensive ? p('bargeldintensiv') : p('standard'),
          reason: c.cashIntensive ? 'Bargeldintensive Branche gemäss interner Branchenliste.' : 'Branche ohne erhöhtes Bargeldrisiko.',
        });
        break;
      case 'pep': {
        const peps = relatedPersons(ctx).filter((x) => x.pep);
        const foreign = peps.filter((x) => x.nationality !== 'CH' || /ausländ/i.test(x.pepDetail ?? ''));
        results.push({
          criterionId: cr.id,
          label: cr.label,
          value: peps.length ? peps.map((x) => `${x.firstName} ${x.lastName}`).join(', ') : 'kein PEP-Bezug',
          points: foreign.length ? p('auslaendisch') : peps.length ? p('inlaendisch') : 0,
          mandatory: foreign.length > 0,
          reason: foreign.length
            ? 'Ausländische PEP: Geschäftsbeziehung gilt zwingend als GmeR (Art. 13 Abs. 3 GwV-FINMA).'
            : peps.length
              ? `Inländische PEP (${peps[0].pepDetail ?? 'politisches Amt'}): erhöhtes Risiko in Kombination mit weiteren Kriterien.`
              : 'Keine beteiligte Person ist als PEP erfasst.',
        });
        break;
      }
      case 'struktur': {
        const depth = structureDepth(ownershipTree(c));
        const complex = depth > 2;
        results.push({
          criterionId: cr.id,
          label: cr.label,
          value: `${depth} ${depth === 1 ? 'Ebene' : 'Ebenen'}`,
          points: complex ? p('komplex') : p('einfach'),
          reason: complex ? 'Mehr als zwei Ebenen bis zu den natürlichen Personen.' : 'Übersichtliche Struktur (höchstens zwei Ebenen).',
        });
        break;
      }
      case 'herkunft': {
        const key = c.sourceOfFunds === 'Nicht belegt' ? 'unklar' : c.sourceOfFunds === 'Geschäftstätigkeit' ? 'geschaeft' : 'andere';
        results.push({
          criterionId: cr.id,
          label: cr.label,
          value: c.sourceOfFunds,
          points: p(key),
          reason: key === 'unklar' ? 'Herkunft der Vermögenswerte nicht belegt.' : key === 'geschaeft' ? 'Vermögenswerte stammen aus der laufenden Geschäftstätigkeit.' : 'Einmalige Herkunft, Beleg erforderlich.',
        });
        break;
      }
      case 'volumen': {
        const vol = c.expectedVolume >= 20_000_000 ? 'sehr_hoch' : c.expectedVolume >= 5_000_000 ? 'hoch' : 'normal';
        const cash = c.expectedCashShare > 30 ? p('bar_anteil') : 0;
        results.push({
          criterionId: cr.id,
          label: cr.label,
          value: `${fmtChfShort(c.expectedVolume)} p. a., Bar ${c.expectedCashShare} %`,
          points: p(vol) + cash,
          reason:
            [
              vol === 'normal' ? 'Erwartetes Volumen im üblichen Rahmen.' : `Erwartetes Volumen ${vol === 'sehr_hoch' ? 'über CHF 20 Mio.' : 'über CHF 5 Mio.'} pro Jahr.`,
              cash ? 'Bargeldanteil über 30 %.' : '',
            ]
              .filter(Boolean)
              .join(' '),
        });
        break;
      }
    }
  }
  const total = results.reduce((s, r) => s + r.points, 0);
  const computed = total >= settings.gmerThreshold || results.some((r) => r.mandatory) ? 'gmer' : 'normal';
  return { results, total, threshold: settings.gmerThreshold, computed, final: computed };
}

/* ------------------------------------------------------------------ */
/* Qualität von Begründungen (Alarmprüfung)                            */
/* ------------------------------------------------------------------ */

export interface JustificationCheck {
  ok: boolean;
  tooShort: boolean;
  phrasesOnly: boolean;
  foundPhrases: string[];
  hasSpecifics: boolean;
  length: number;
}

/** Konkrete Angaben: Zahl/Betrag, Datum, Rechnungs- oder Vertragsnummer, Name einer Gegenpartei in Anführungszeichen */
const SPECIFIC = /(\d{2,}|\d+\.\d+\.\d{2,4}|rechnung|vertrag|beleg|offerte|lieferschein|nr\.|auftrag|kontoauszug|«[^»]+»|"[^"]+")/i;

export function checkJustification(text: string, settings: Pick<Settings, 'minJustification' | 'phrases'>): JustificationCheck {
  const t = text.trim();
  const lower = t.toLowerCase();
  const foundPhrases = settings.phrases.filter((p) => lower.includes(p.toLowerCase()));
  let rest = lower;
  for (const p of settings.phrases) rest = rest.split(p.toLowerCase()).join(' ');
  const restWords = rest.split(/[^a-zäöüéèà0-9]+/i).filter((w) => w.length > 3);
  const hasSpecifics = SPECIFIC.test(t);
  const phrasesOnly = foundPhrases.length > 0 && (!hasSpecifics || restWords.length < 6);
  const tooShort = t.length < settings.minJustification;
  return { ok: !tooShort && !phrasesOnly, tooShort, phrasesOnly, foundPhrases, hasSpecifics, length: t.length };
}

/* ------------------------------------------------------------------ */
/* Rechte                                                              */
/* ------------------------------------------------------------------ */

export type Permission =
  | 'case.create'
  | 'case.edit'
  | 'case.submit'
  | 'case.review'
  | 'case.secondApproval'
  | 'case.open'
  | 'doc.request'
  | 'doc.check'
  | 'risk.confirm'
  | 'alert.work'
  | 'alert.decideEscalation'
  | 'review.work'
  | 'review.closeGmer'
  | 'settings.edit';

const PERMISSIONS: Record<Role, Permission[]> = {
  kb: ['case.create', 'case.edit', 'case.submit', 'doc.request', 'review.work'],
  compliance: ['case.review', 'risk.confirm', 'alert.work', 'review.work', 'review.closeGmer'],
  backoffice: ['doc.check', 'case.open'],
  leitung: ['case.secondApproval', 'alert.decideEscalation', 'settings.edit', 'review.closeGmer', 'risk.confirm'],
};

export const can = (role: Role, p: Permission) => PERMISSIONS[role].includes(p);

/* ------------------------------------------------------------------ */
/* Voraussetzungen im Onboarding                                       */
/* ------------------------------------------------------------------ */

export interface Check {
  label: string;
  ok: boolean;
  hint?: string;
}

export function submitChecks(cs: OnboardingCase, c: Customer): Check[] {
  const missing = missingDocs(cs.documents);
  const openDev = cs.deviations.filter((d) => d.justification.trim().length < 20);
  return [
    { label: 'Stammdaten vollständig', ok: Boolean(c.name && c.seat && c.purpose && c.signatories.length), hint: 'Firma, Sitz, Zweck und Zeichnungsberechtigte erfassen' },
    { label: 'Geschäftsprofil erfasst', ok: Boolean(c.relationshipPurpose && c.expectedVolume > 0), hint: 'Zweck der Geschäftsbeziehung und erwartetes Volumen' },
    { label: 'Abgleich Transparenzregister durchgeführt', ok: Boolean(cs.registerCheckedAt), hint: 'Im Reiter «Wirtschaftlich Berechtigte» starten' },
    { label: 'Abweichungen begründet', ok: openDev.length === 0, hint: `${openDev.length} Abweichung(en) ohne Begründung (mind. 20 Zeichen)` },
    { label: c.formType === 'A' ? 'Wirtschaftlich Berechtigte festgelegt' : 'Kontrollinhaber festgelegt', ok: c.controllerIds.length > 0, hint: 'Im Reiter «Eigentümerstruktur» bestätigen' },
    { label: 'Unterlagen vollständig', ok: missing.length === 0, hint: `${missing.length} Unterlage(n) fehlen oder abgelehnt` },
  ];
}

export function openChecks(cs: OnboardingCase): Check[] {
  const unchecked = cs.documents.filter((d) => d.status !== 'geprueft');
  return [
    { label: 'Alle Unterlagen geprüft', ok: unchecked.length === 0, hint: `${unchecked.length} Unterlage(n) noch nicht geprüft` },
    { label: 'Stammdaten finalisiert', ok: cs.masterDataFinal, hint: 'Stammdaten durch Backoffice bestätigen' },
  ];
}

export const needsSecondApproval = (cs: OnboardingCase) => cs.risk?.final === 'gmer';
