/**
 * Transparenzregister (simuliert). Liefert die gemeldeten wirtschaftlich Berechtigten
 * und gleicht sie mit den Kundenangaben ab.
 */
import { PEOPLE, STRUCTURES, TR_OVERRIDES } from '../data/registers';
import type { Customer, Deviation, Person, RegisterOwner } from '../types';
import { effectiveOwners } from '../lib/domain';
import { uid } from '../lib/format';
import { delay } from './delay';

export interface TransparenzregisterService {
  owners(customer: Customer): Promise<{ owners: RegisterOwner[]; note?: string }>;
}

function fromStructure(customerUid: string, persons: Person[]): RegisterOwner[] {
  const def = STRUCTURES[customerUid];
  if (!def) return [];
  // Register spiegelt die (fiktive) Struktur – durchgerechnet bis zu den natürlichen Personen
  const fake = {
    id: 'root',
    entities: [{ id: 'root', kind: 'company', name: '', country: 'CH' }, ...def.companies.map((c) => ({ id: c.key, kind: 'company', name: c.name, country: c.country }))],
    holdings: def.holdings.map(([o, d, p], i) => ({ id: `h${i}`, ownerId: o.startsWith('p-') ? `e-${o}` : o, ownedId: d, percent: p })),
  } as unknown as Customer;
  const personEntities = def.holdings.filter(([o]) => o.startsWith('p-')).map(([o]) => o);
  fake.entities.push(...[...new Set(personEntities)].map((pid) => {
    const p = persons.find((x) => x.id === pid);
    return { id: `e-${pid}`, kind: 'person' as const, name: p ? `${p.firstName} ${p.lastName}` : pid, country: p?.nationality ?? 'CH', personId: pid };
  }));
  return effectiveOwners(fake).map((o) => {
    const p = persons.find((x) => x.id === o.personId);
    return { name: o.name, birthYear: p ? Number(p.birthDate.slice(0, 4)) : 0, nationality: p?.nationality ?? '–', share: Math.round(o.percent * 10) / 10, kind: 'Kontrollinhaber/in (Kapital)' };
  });
}

/** Registerabfrage ohne Ladezeit (auch für Testdaten verwendet) */
export function lookupOwners(customer: Customer): { owners: RegisterOwner[]; note?: string } {
  if (customer.legalForm === 'Einzelunternehmen') return { owners: [], note: 'Einzelunternehmen sind nicht meldepflichtig.' };
  if (customer.legalForm === 'Verein' || customer.legalForm === 'Stiftung') {
    return { owners: [], note: 'Keine Kontrollinhaber gemeldet (Verein/Stiftung). Gemeldet sind die Mitglieder des obersten Leitungsorgans.' };
  }
  return { owners: TR_OVERRIDES[customer.uid] ?? fromStructure(customer.uid, PEOPLE) };
}

export const demoTransparenzregister: TransparenzregisterService = {
  async owners(customer) {
    await delay(900);
    return lookupOwners(customer);
  },
};

/** Abweichungen zwischen Kundenangaben (Eigentümerstruktur) und Register */
export function compareOwners(customer: Customer, register: RegisterOwner[], previous: Deviation[] = []): Deviation[] {
  // Nicht meldepflichtige Rechtsformen: kein Abgleich der Kontrollinhaber möglich
  if (customer.legalForm === 'Einzelunternehmen' || customer.legalForm === 'Verein' || customer.legalForm === 'Stiftung') return [];
  const declared = effectiveOwners(customer);
  const keep = (subject: string, customerValue: string, registerValue: string): Deviation => {
    const prev = previous.find((d) => d.subject === subject);
    return { id: prev?.id ?? uid('dev'), subject, customerValue, registerValue, justification: prev?.justification ?? '' };
  };
  const out: Deviation[] = [];
  for (const d of declared) {
    const r = register.find((x) => x.name === d.name);
    if (!r) out.push(keep(d.name, `${round(d.percent)} %`, 'nicht gemeldet'));
    else if (Math.abs(r.share - d.percent) > 0.5) out.push(keep(d.name, `${round(d.percent)} %`, `${round(r.share)} %`));
  }
  for (const r of register) {
    if (!declared.find((d) => d.name === r.name)) out.push(keep(r.name, 'nicht angegeben', `${round(r.share)} %`));
  }
  return out;
}

const round = (n: number) => Math.round(n * 10) / 10;
