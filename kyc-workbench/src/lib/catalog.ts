import type { AlertOutcome, AlertStatus, CaseStatus, DocStatus, DocType, EventType, LegalForm, Priority, ReviewStatus, Role, ScenarioId } from '../types';

export const ROLE_LABEL: Record<Role, string> = {
  kb: 'Kundenberater/in',
  compliance: 'Compliance',
  backoffice: 'Backoffice',
  leitung: 'Leitung Compliance',
};

export const LEGAL_FORMS: LegalForm[] = ['AG', 'GmbH', 'Einzelunternehmen', 'Verein', 'Stiftung'];

export const DOC_LABEL: Record<DocType, string> = {
  hr_auszug: 'Handelsregisterauszug',
  statuten: 'Statuten',
  ausweis: 'Ausweis',
  formular_k: 'Formular K (Kontrollinhaber)',
  formular_a: 'Formular A (wirtschaftlich Berechtigte)',
  unterschriftenkarte: 'Unterschriftenkarte',
  stiftungsurkunde: 'Stiftungsurkunde',
  vorstandsliste: 'Vorstandsliste',
  stiftungsrat: 'Liste Stiftungsrat',
};

export const DOC_HINT: Partial<Record<DocType, string>> = {
  hr_auszug: 'nicht älter als 12 Monate',
  ausweis: 'Pass oder ID, gültig',
  formular_k: 'unterzeichnet durch Zeichnungsberechtigte',
  formular_a: 'unterzeichnet durch Zeichnungsberechtigte',
};

/** Dokumente, deren Inhalt (simuliert) ausgelesen werden kann */
export const READABLE_DOCS: DocType[] = ['ausweis', 'hr_auszug'];

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  fehlt: 'Fehlt',
  hochgeladen: 'Hochgeladen',
  geprueft: 'Geprüft',
  abgelehnt: 'Abgelehnt',
};

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  in_erfassung: 'In Erfassung',
  eingereicht: 'Prüfung Compliance',
  zweite_freigabe: 'Zweite Freigabe',
  freigegeben: 'Bereit zur Eröffnung',
  eroeffnet: 'Eröffnet',
  zurueckgewiesen: 'Zurückgewiesen',
};

export const SCENARIO_LABEL: Record<ScenarioId, string> = {
  bar_schwelle: 'Bareinzahlung über Schwelle',
  durchlauf: 'Durchlauftransaktion',
  profil_abweichung: 'Abweichung vom Kundenprofil',
  risikoland: 'Zahlung in Risikoland',
  strukturierung: 'Gestückelte Bareinzahlungen',
};

export const SCENARIO_RULE: Record<ScenarioId, string> = {
  bar_schwelle: 'Bareinzahlung ≥ CHF 100\'000.00 innert 24 Stunden',
  durchlauf: 'Eingang und Ausgang ähnlicher Höhe (± 10 %) innert 3 Tagen',
  profil_abweichung: 'Monatsvolumen > 200 % des erwarteten Volumens gemäss KYC-Profil',
  risikoland: 'Zahlung von oder an ein Land der Risikoliste (FATF / intern)',
  strukturierung: 'Mehrere Bareinzahlungen knapp unter der Schwelle innert 10 Tagen',
};

export const PRIORITY_LABEL: Record<Priority, string> = { hoch: 'Hoch', mittel: 'Mittel', tief: 'Tief' };

export const ALERT_STATUS_LABEL: Record<AlertStatus, string> = {
  offen: 'Offen',
  in_bearbeitung: 'In Bearbeitung',
  eskaliert: 'Eskaliert',
  abgeschlossen: 'Abgeschlossen',
};

export const OUTCOME_LABEL: Record<AlertOutcome, string> = {
  falsch_positiv: 'Falsch positiv',
  plausibilisiert: 'Plausibilisiert',
  eskaliert: 'Eskaliert',
  mros: 'MROS-Meldung',
};

export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  offen: 'Offen',
  warten_auf_kunde: 'Warten auf Kunde',
  in_pruefung: 'In Prüfung',
  aktualisierung: 'Aktualisierung läuft',
  abgeschlossen: 'Abgeschlossen',
};

export const EVENT_LABEL: Record<EventType, string> = {
  hr_mutation: 'Mutation Handelsregister',
  tr_meldung: 'Meldung Transparenzregister',
  alarm_eskaliert: 'Eskalierter Alarm',
  volumen_abweichung: 'Abweichung Transaktionsvolumen',
};

export const INDUSTRIES: { name: string; cashIntensive: boolean }[] = [
  { name: 'Holzbau / Schreinerei', cashIntensive: false },
  { name: 'Bauhauptgewerbe', cashIntensive: false },
  { name: 'Gastronomie', cashIntensive: true },
  { name: 'Autohandel', cashIntensive: true },
  { name: 'Edelmetall- und Uhrenhandel', cashIntensive: true },
  { name: 'Kunsthandel', cashIntensive: true },
  { name: 'Detailhandel', cashIntensive: true },
  { name: 'Treuhand / Beratung', cashIntensive: false },
  { name: 'Informatik / Software', cashIntensive: false },
  { name: 'Elektroinstallation', cashIntensive: false },
  { name: 'Immobilien', cashIntensive: false },
  { name: 'Rohstoffhandel', cashIntensive: false },
  { name: 'Gesundheit', cashIntensive: false },
  { name: 'Kultur / Gemeinnützig', cashIntensive: false },
  { name: 'Sport / Freizeit', cashIntensive: false },
  { name: 'Velohandel / Werkstatt', cashIntensive: false },
];

export const CANTONS = ['AG', 'AI', 'AR', 'BE', 'BL', 'BS', 'FR', 'GE', 'GL', 'GR', 'JU', 'LU', 'NE', 'NW', 'OW', 'SG', 'SH', 'SO', 'SZ', 'TG', 'TI', 'UR', 'VD', 'VS', 'ZG', 'ZH'];

/** Länder nach Risikogruppe (Demo-Liste, nicht abschliessend) */
export const HIGH_RISK_COUNTRIES = ['IR', 'KP', 'MM', 'PA', 'RU'];
export const EU_EFTA = ['DE', 'AT', 'FR', 'IT', 'LI', 'LU', 'NL', 'CY', 'GB'];

export function countryRiskGroup(code: string): 'ch' | 'eu' | 'drittland' | 'hochrisiko' {
  if (code === 'CH') return 'ch';
  if (HIGH_RISK_COUNTRIES.includes(code)) return 'hochrisiko';
  if (EU_EFTA.includes(code)) return 'eu';
  return 'drittland';
}
