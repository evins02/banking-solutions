/**
 * Dokumente auslesen (simuliert). Liefert «erkannte» Felder, die eine Person
 * Feld für Feld bestätigt oder korrigiert. Keine echte Texterkennung.
 */
import type { CaseDocument, Customer, ExtractedField, Person } from '../types';
import { addDays, fmtDate, fnv1a, nowIso } from '../lib/format';
import { countryName } from '../lib/format';
import { delay } from './delay';

export interface DokumentenleserService {
  read(doc: CaseDocument, customer: Customer, person?: Person): Promise<ExtractedField[]>;
}

const f = (key: string, label: string, value: string, expected?: string): ExtractedField => ({ key, label, value, expected, state: 'offen' });

/** Simulierter Lesefehler: verdreht bei manchen Dokumenten eine Ziffer */
function misread(value: string, seed: string): string {
  if (parseInt(fnv1a(seed).slice(-2), 16) % 3 !== 0) return value;
  return value.replace(/(\d)(\d)(?!.*\d\d)/, '$2$1');
}

export const demoDokumentenleser: DokumentenleserService = {
  async read(doc, customer, person) {
    await delay(1100);
    if (doc.type === 'ausweis' && person) {
      const birth = fmtDate(person.birthDate);
      return [
        f('lastName', 'Name', person.lastName.toUpperCase(), person.lastName.toUpperCase()),
        f('firstName', 'Vorname', person.firstName.toUpperCase(), person.firstName.toUpperCase()),
        f('birthDate', 'Geburtsdatum', misread(birth, doc.id + person.id), birth),
        f('nationality', 'Nationalität', countryName(person.nationality), countryName(person.nationality)),
        f('docNo', 'Ausweisnummer', `DEMO${fnv1a(person.id).slice(0, 6).toUpperCase()}`),
        f('validUntil', 'Gültig bis', fmtDate(addDays(nowIso(), 900 + (parseInt(fnv1a(person.id).slice(0, 2), 16) * 7)))),
      ];
    }
    if (doc.type === 'hr_auszug') {
      const stale = parseInt(fnv1a(customer.uid).slice(-1), 16) % 5 === 0;
      const issued = addDays(nowIso(), stale ? -420 : -12);
      return [
        f('name', 'Firma', customer.name, customer.name),
        f('uid', 'UID-Nummer', customer.uid, customer.uid),
        f('legalForm', 'Rechtsform', customer.legalForm, customer.legalForm),
        f('seat', 'Sitz', customer.seat, customer.seat),
        f('issued', 'Datum des Auszugs', fmtDate(issued)),
        f('signatories', 'Zeichnungsberechtigte', String(customer.signatories.length), String(customer.signatories.length)),
      ];
    }
    return [];
  },
};

/** Prüft, ob ein HR-Auszug älter als 12 Monate ist (Feld «Datum des Auszugs») */
export function isStaleExtract(fields: ExtractedField[]): boolean {
  const issued = fields.find((x) => x.key === 'issued');
  const value = issued?.corrected ?? issued?.value;
  if (!value) return false;
  const [d, m, y] = value.split('.').map(Number);
  const date = new Date(y, m - 1, d);
  return Date.now() - date.getTime() > 365 * 86_400_000;
}
