/** Formatierung nach Schweizer Konventionen: TT.MM.JJJJ, CHF 1'250'000.00 */

const DAY = 86_400_000;

export const nowIso = () => new Date().toISOString();

let counter = 0;
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${(counter++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtDate(iso?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '–';
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '–';
  const d = new Date(iso);
  return `${fmtDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Tausendertrennzeichen Apostroph (Schweiz) */
export function fmtNumber(n: number, decimals = 0): string {
  const neg = n < 0;
  const [int, dec] = Math.abs(n).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'");
  return `${neg ? '−' : ''}${grouped}${dec ? `.${dec}` : ''}`;
}

export const fmtChf = (n: number) => `CHF ${fmtNumber(n, 2)}`;
export const fmtChfShort = (n: number) => `CHF ${fmtNumber(n, 0)}`;

export const fmtPct = (n: number, decimals = 0) => `${fmtNumber(n, decimals)} %`;

export const addDays = (iso: string, days: number) => new Date(new Date(iso).getTime() + days * DAY).toISOString();

export function addYears(iso: string, years: number): string {
  const d = new Date(iso);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString();
}

/** Ganze Tage von a nach b (b − a) */
export const daysBetween = (a: string, b: string) => Math.round((new Date(b).getTime() - new Date(a).getTime()) / DAY);

export const daysFromNow = (iso: string) => daysBetween(nowIso(), iso);

export const daysSince = (iso: string) => daysBetween(iso, nowIso());

/** Verbleibende Zeit bis Frist, z. B. «2 T 4 h» oder «überfällig seit 1 T» */
export function fmtRemaining(dueIso: string): string {
  const ms = new Date(dueIso).getTime() - Date.now();
  const abs = Math.abs(ms);
  const d = Math.floor(abs / DAY);
  const h = Math.floor((abs % DAY) / 3_600_000);
  const txt = d > 0 ? `${d} T ${h} h` : `${h} h`;
  return ms < 0 ? `überfällig seit ${txt}` : txt;
}

export type Ampel = 'gruen' | 'gelb' | 'rot';

/** Ampel nach verbleibendem Anteil der Frist */
export function deadlineAmpel(startIso: string, dueIso: string): Ampel {
  const total = new Date(dueIso).getTime() - new Date(startIso).getTime();
  const left = new Date(dueIso).getTime() - Date.now();
  if (left < 0) return 'rot';
  if (total > 0 && left / total < 0.35) return 'gelb';
  return 'gruen';
}

/** Kalenderwoche nach ISO 8601 */
export function isoWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / DAY + 1) / 7);
}

export const MONTHS = ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.'];

export const COUNTRY: Record<string, string> = {
  CH: 'Schweiz',
  DE: 'Deutschland',
  AT: 'Österreich',
  FR: 'Frankreich',
  IT: 'Italien',
  LI: 'Liechtenstein',
  LU: 'Luxemburg',
  NL: 'Niederlande',
  CY: 'Zypern',
  GB: 'Vereinigtes Königreich',
  AE: 'Vereinigte Arabische Emirate',
  PA: 'Panama',
  US: 'USA',
  TR: 'Türkei',
  IR: 'Iran',
  KP: 'Nordkorea',
  MM: 'Myanmar',
  RU: 'Russland',
  HK: 'Hongkong',
  SG: 'Singapur',
};

export const countryName = (code: string) => COUNTRY[code] ?? code;

/** Einfacher Hash (FNV-1a, 32 Bit) für die Verkettung des Audit-Trails – Demo, kein kryptografischer Schutz */
export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Deterministischer Zufall für Testdaten */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
