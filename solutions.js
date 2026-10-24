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
    url: 'https://creditflow-opal.vercel.app/',
    status: 'live',
    icon: 'folder',
    accent: '#1546d6',
  },
  {
    id: 'baucheck',
    name: 'BauCheck',
    tagline: 'Baufortschritt prüfen ohne Baustellenbesuch',
    description:
      'Vor jeder Baukredit-Tranche fordert die Bank per befristetem Link geführte Fotonachweise zur Bauetappe an. Der Bauherr dokumentiert per Handy ohne Registrierung, die Bank prüft in der Inbox – und empfiehlt nur bei Bedarf einen Vor-Ort-Besuch. Keine Auszahlung, nur der Nachweis.',
    features: ['Geführte Fotonachweise', 'Prüf-Inbox mit Plausibilitätshinweisen', 'Lückenloses Protokoll'],
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
