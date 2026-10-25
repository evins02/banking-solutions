import type { Role, User } from '../types';

/** Demo-Benutzer, je Rolle eine fiktive Person (kein Login) */
export const USERS: User[] = [
  { id: 'u-kb', name: 'Anna Beispiel', role: 'kb' },
  { id: 'u-kb2', name: 'Lukas Platzhalter', role: 'kb' },
  { id: 'u-co', name: 'Marco Muster', role: 'compliance' },
  { id: 'u-bo', name: 'Sandra Exempel', role: 'backoffice' },
  { id: 'u-lc', name: 'Dr. Thomas Demo', role: 'leitung' },
];

/** Benutzer, der beim Wechsel der Rolle aktiv wird */
export const DEFAULT_USER: Record<Role, string> = { kb: 'u-kb', compliance: 'u-co', backoffice: 'u-bo', leitung: 'u-lc' };

export function userName(id?: string): string {
  if (!id) return '–';
  if (id === 'kunde') return 'Kunde (Portal)';
  if (id === 'system') return 'System';
  return USERS.find((u) => u.id === id)?.name ?? id;
}
