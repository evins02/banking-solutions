/**
 * Handelsregister (simuliert, angelehnt an Zefix / SHAB).
 * Austauschbar: Eine echte Anbindung muss nur dieses Interface erfüllen.
 */
import { HR_RECORDS, PEOPLE, STRUCTURES, type HrRecord, type StructureDef } from '../data/registers';
import type { Customer, Person } from '../types';
import { delay } from './delay';

export interface HrMutation {
  uid: string;
  kind: 'neue_zeichnung' | 'sitzverlegung' | 'zweck';
  title: string;
  detail: string;
  field: string;
  oldValue: string;
  newValue: string;
  publishedAt: string;
  /** neue Person bei neuer Zeichnungsberechtigung */
  person?: Person;
  personFunction?: string;
}

export interface HandelsregisterService {
  search(query: string): Promise<HrRecord[]>;
  get(uid: string): Promise<{ record: HrRecord; persons: Person[] } | null>;
  /** Kundenangaben zur Eigentümerstruktur (Demo: vorbereitete Formular-K-Daten) */
  declaredStructure(uid: string): Promise<{ structure: StructureDef; persons: Person[] } | null>;
  /** Simulierte SHAB-Publikation für einen Kunden */
  simulateMutation(customer: Customer, kind: HrMutation['kind']): Promise<HrMutation>;
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9äöüéè]/g, '');

const NEW_PEOPLE: Person[] = [
  { id: 'p-hr-neu-1', firstName: 'Simon', lastName: 'Neumuster', birthDate: '1985-02-11', nationality: 'CH', domicile: 'Olten, CH', pep: false },
  { id: 'p-hr-neu-2', firstName: 'Carla', lastName: 'Beispielneu', birthDate: '1979-06-30', nationality: 'IT', domicile: 'Mendrisio, CH', pep: false },
  { id: 'p-hr-neu-3', firstName: 'Jonas', lastName: 'Exempelneu', birthDate: '1990-10-19', nationality: 'DE', domicile: 'Lörrach, DE', pep: false },
];
const NEW_SEATS = ['Olten', 'Baar', 'Schaffhausen', 'Neuenburg', 'Frauenfeld'];

export const demoHandelsregister: HandelsregisterService = {
  async search(query) {
    await delay(600);
    const q = normalize(query);
    if (!q) return [];
    return HR_RECORDS.filter((r) => normalize(r.name).includes(q) || normalize(r.uid).includes(q)).slice(0, 8);
  },
  async get(uid) {
    await delay(800);
    const record = HR_RECORDS.find((r) => r.uid === uid);
    if (!record) return null;
    const persons = record.signatories.map((s) => PEOPLE.find((p) => p.id === s.personId)).filter((p): p is Person => Boolean(p));
    return { record, persons };
  },
  async declaredStructure(uid) {
    await delay(400);
    const structure = STRUCTURES[uid];
    if (!structure) return null;
    const ids = new Set(structure.holdings.map(([o]) => o).filter((o) => o.startsWith('p-')));
    return { structure, persons: PEOPLE.filter((p) => ids.has(p.id)) };
  },
  async simulateMutation(customer, kind) {
    await delay(700);
    const publishedAt = new Date().toISOString();
    if (kind === 'sitzverlegung') {
      const seat = NEW_SEATS.find((s) => s !== customer.seat) ?? 'Olten';
      return { uid: customer.uid, kind, publishedAt, field: 'Sitz', oldValue: customer.seat, newValue: seat, title: 'Sitzverlegung', detail: `Sitz verlegt von ${customer.seat} nach ${seat}.` };
    }
    if (kind === 'zweck') {
      const newValue = `${customer.purpose.replace(/\.$/, '')} sowie Erwerb und Halten von Beteiligungen im In- und Ausland.`;
      return { uid: customer.uid, kind, publishedAt, field: 'Zweck', oldValue: customer.purpose, newValue, title: 'Änderung des Zwecks', detail: 'Zweck erweitert um «Erwerb und Halten von Beteiligungen im In- und Ausland».' };
    }
    const person = NEW_PEOPLE[Math.floor(Math.random() * NEW_PEOPLE.length)];
    const personFunction = 'Mitglied des Verwaltungsrates';
    return {
      uid: customer.uid,
      kind,
      publishedAt,
      person: { ...person, id: `${person.id}-${Date.now().toString(36)}` },
      personFunction,
      field: 'Zeichnungsberechtigte',
      oldValue: `${customer.signatories.length} Person(en)`,
      newValue: `${person.firstName} ${person.lastName}, ${personFunction}, Kollektivunterschrift zu zweien`,
      title: 'Neue zeichnungsberechtigte Person',
      detail: `Eingetragen: ${person.firstName} ${person.lastName}, ${personFunction}, mit Kollektivunterschrift zu zweien.`,
    };
  },
};
