/**
 * Lösungen im Portal. Neue Lösung = neuer Eintrag in dieser Liste.
 * status: 'live' (verlinkt) | 'planned' (Kachel ohne Link)
 */
window.SOLUTIONS = [
  {
    id: 'creditflow',
    name: 'CreditFlow',
    tagline: 'Arbeitsassistent Immobilienfinanzierung',
    description:
      'Führt Kundenstamm, Antrag und Unterlagen zusammen und prüft Kreditdossiers vor der Übergabe ans Credit Office in zehn Punkten auf Lücken und Widersprüche – jeder Wert mit Quelle. Rückfragen bleiben am Prüfpunkt nachvollziehbar.',
    features: ['10 Prüfungen mit Quellenangabe', 'Fehlend · Widerspruch · nicht prüfbar', 'Rückfragen mit Einreichungsstand'],
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
