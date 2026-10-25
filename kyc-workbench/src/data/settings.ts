import type { Settings } from '../types';

export const DEFAULT_SETTINGS: Settings = {
  criteria: [
    { id: 'domizil', label: 'Sitzland / Domizil', description: 'Sitz des Kunden und aller Gesellschaften der Struktur', enabled: true, points: { ch: 0, eu: 1, drittland: 3, hochrisiko: 10 } },
    { id: 'branche', label: 'Branche', description: 'Bargeldintensive Branchen gemäss interner Liste', enabled: true, points: { standard: 0, bargeldintensiv: 4 } },
    { id: 'pep', label: 'PEP-Bezug', description: 'Zeichnungsberechtigte, Kontrollinhaber oder Beteiligte als PEP; ausländische PEP immer GmeR', enabled: true, points: { inlaendisch: 5, auslaendisch: 10 } },
    { id: 'struktur', label: 'Komplexe Struktur', description: 'Mehr als zwei Ebenen bis zu den natürlichen Personen', enabled: true, points: { einfach: 0, komplex: 4 } },
    { id: 'herkunft', label: 'Herkunft der Vermögenswerte', description: 'Geschäftstätigkeit, einmalige Herkunft oder nicht belegt', enabled: true, points: { geschaeft: 0, andere: 2, unklar: 6 } },
    { id: 'volumen', label: 'Erwartetes Transaktionsvolumen', description: 'Jahresvolumen und Bargeldanteil gemäss Kundenprofil', enabled: true, points: { normal: 0, hoch: 2, sehr_hoch: 4, bar_anteil: 3 } },
  ],
  gmerThreshold: 8,
  reviewYears: { gmer: 1, normal: 3 },
  slaDays: { hoch: 3, mittel: 7, tief: 14 },
  minJustification: 100,
  phrases: ['branchenüblich', 'lohnzahlung', 'lieferantenzahlung', 'geschäftlich begründet', 'kunde bekannt', 'plausibel', 'keine auffälligkeiten', 'normaler geschäftsverkehr'],
  volumeDeviationPct: 150,
};

export const POINT_LABEL: Record<string, string> = {
  ch: 'Schweiz',
  eu: 'EU/EFTA',
  drittland: 'Drittland',
  hochrisiko: 'Hochrisikoland',
  standard: 'Standard',
  bargeldintensiv: 'Bargeldintensiv',
  inlaendisch: 'Inländische PEP',
  auslaendisch: 'Ausländische PEP',
  einfach: 'Bis 2 Ebenen',
  komplex: 'Mehr als 2 Ebenen',
  geschaeft: 'Geschäftstätigkeit',
  andere: 'Einmalige Herkunft',
  unklar: 'Nicht belegt',
  normal: 'Unter CHF 5 Mio.',
  hoch: 'CHF 5–20 Mio.',
  sehr_hoch: 'Über CHF 20 Mio.',
  bar_anteil: 'Bargeldanteil > 30 %',
};
