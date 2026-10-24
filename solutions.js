/**
 * Lösungen im Portal. Neue Lösung = neuer Eintrag in dieser Liste.
 * status: 'live' (verlinkt) | 'planned' (Kachel ohne Link)
 */
window.SOLUTIONS = [
  {
    id: 'creditflow',
    name: 'CreditFlow',
    tagline: 'Vorprüfung von Kreditdossiers',
    description:
      'Die Filiale prüft Kreditdossiers vor der Einreichung: Checkliste für Dokumente, Sicherheiten, Auszahlungsbedingungen und Hypothekartranchen – mit den Anforderungen von Credit Office und Credit Operations auf einen Blick.',
    features: ['Dossier-Readiness', 'Anforderungen CO & OPS', 'Meinungsverschiedenheiten mit Quellen'],
    url: 'https://creditflow.vercel.app',
    status: 'live',
    icon: 'folder',
    accent: '#1546d6',
  },
  {
    id: 'baucheck',
    name: 'BauCheck',
    tagline: 'Prüfung von Bauprojekten',
    description:
      'Strukturierte Prüfung von Bau- und Immobilienprojekten im Finanzierungsprozess – Unterlagen, Baufortschritt und offene Punkte übersichtlich an einem Ort.',
    features: ['Bauprojekte', 'Unterlagen', 'Offene Punkte'],
    url: 'https://bau-check-one.vercel.app/',
    status: 'live',
    icon: 'building',
    accent: '#0b8a8f',
  },
  {
    id: 'next',
    name: 'Weitere Lösungen',
    tagline: 'In Vorbereitung',
    description: 'Weitere Werkzeuge für Kreditprozesse und Zusammenarbeit zwischen Front und Backoffice sind in Planung.',
    features: [],
    url: '',
    status: 'planned',
    icon: 'plus',
    accent: '#5b4bd6',
  },
];
