import type { Answer, ScenarioId } from '../types';

export interface Question {
  id: string;
  text: string;
  /** Antwort, die auf ein erhöhtes Risiko hindeutet */
  risky: Answer;
}

const COMMON: Question[] = [
  { id: 'profil', text: 'Passt die Transaktion zum Kundenprofil (Zweck, erwartetes Volumen, Branche)?', risky: 'nein' },
  { id: 'gegenpartei', text: 'Ist die Gegenpartei bekannt und plausibel?', risky: 'nein' },
  { id: 'belege', text: 'Liegen Belege vor (Rechnung, Vertrag, Kassenbuch)?', risky: 'nein' },
];

const SPECIFIC: Record<ScenarioId, Question[]> = {
  bar_schwelle: [
    { id: 'herkunft_bar', text: 'Ist die Herkunft des Bargelds belegt?', risky: 'nein' },
    { id: 'branche_bar', text: 'Passt der Bargeldanteil zur Branche des Kunden?', risky: 'nein' },
  ],
  strukturierung: [
    { id: 'stueckelung', text: 'Gibt es Hinweise auf eine bewusste Stückelung unter der Schwelle?', risky: 'ja' },
    { id: 'tagesumsatz', text: 'Sind die Einzahlungen durch Tagesumsätze belegt?', risky: 'nein' },
  ],
  durchlauf: [
    { id: 'hintergrund', text: 'Ist der wirtschaftliche Hintergrund der Weiterleitung nachvollziehbar?', risky: 'nein' },
    { id: 'konzern', text: 'Sind Auftraggeber und Begünstigter verbunden (z. B. Konzerngesellschaft)?', risky: 'nein' },
  ],
  profil_abweichung: [
    { id: 'einmalig', text: 'Ist die Abweichung einmalig und erklärbar?', risky: 'nein' },
    { id: 'profil_anpassen', text: 'Muss das KYC-Profil angepasst werden?', risky: 'ja' },
  ],
  risikoland: [
    { id: 'bezug', text: 'Ist der Bezug zum Risikoland geschäftlich begründet?', risky: 'nein' },
    { id: 'sanktionen', text: 'Wurde die Gegenpartei mit den Sanktionslisten abgeglichen (ohne Treffer)?', risky: 'nein' },
  ],
};

export const questionsFor = (s: ScenarioId): Question[] => [...COMMON, ...SPECIFIC[s]];
