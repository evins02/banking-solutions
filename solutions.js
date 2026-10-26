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
    id: 'kyc-workbench',
    name: 'KYC & Compliance Workbench',
    tagline: 'Onboarding, AML-Alarme und KYC-Überprüfung',
    description:
      'Firmenkunden-Onboarding mit Handelsregister-Vorbefüllung, Transparenzregister-Abgleich und Vier-Augen-Freigabe, geführte Prüfung von AML-Alarmen mit Qualitätsprüfung der Begründung sowie periodische und ereignisgesteuerte KYC-Überprüfung – jede Aktion im Audit-Trail.',
    features: ['Onboarding mit Kundenportal', 'Alarmprüfung mit MROS-Entwurf', 'Laufendes KYC bei Ereignissen'],
    url: 'https://banking-solutions-6ils.vercel.app/',
    status: 'live',
    icon: 'chart',
    accent: '#2a4583',
  },
  {
    id: 'bankacademy',
    name: 'Bank Academy',
    tagline: 'Digitales Praxistraining für Schweizer Banking',
    description:
      'Macht realitätsnahe Banksituationen digital erlebbar: interaktive Praxisfälle und simulierte Kundengespräche von KYC und Kontoeröffnung über Hypothek und Tragbarkeit bis zu Zahlungsverkehr und Anlageberatung – für Lernende, Praktikanten und Bankmitarbeitende.',
    features: ['Interaktive Praxisfälle', 'Simulierte Kundengespräche', 'Für Lernende und Mitarbeitende'],
    url: 'https://bankacademy.ch/',
    status: 'live',
    icon: 'academy',
    accent: '#b45309',
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
