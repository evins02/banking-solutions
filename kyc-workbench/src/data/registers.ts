/**
 * Fiktive Registerdaten (Handelsregister / Transparenzregister) für die simulierten Dienste.
 * Alle Namen, Personen und UID-Nummern sind erfunden.
 */
import type { LegalForm, Person, RegisterOwner, SignatureKind } from '../types';

export const PEOPLE: Person[] = [
  { id: 'p-hans-muster', firstName: 'Hans', lastName: 'Muster', birthDate: '1966-04-12', nationality: 'CH', domicile: 'Burgdorf, CH', pep: false },
  { id: 'p-erika-muster', firstName: 'Erika', lastName: 'Muster', birthDate: '1969-09-03', nationality: 'CH', domicile: 'Burgdorf, CH', pep: false },
  { id: 'p-peter-beispiel', firstName: 'Peter', lastName: 'Beispiel', birthDate: '1975-01-22', nationality: 'CH', domicile: 'Emmen, CH', pep: false },
  { id: 'p-luca-demoli', firstName: 'Luca', lastName: 'Demoli', birthDate: '1981-07-30', nationality: 'IT', domicile: 'Zürich, CH', pep: false },
  { id: 'p-sara-demoli', firstName: 'Sara', lastName: 'Demoli', birthDate: '1984-02-14', nationality: 'CH', domicile: 'Zürich, CH', pep: false },
  { id: 'p-ivo-exempel', firstName: 'Ivo', lastName: 'Exempel', birthDate: '1958-11-05', nationality: 'CH', domicile: 'Zug, CH', pep: false },
  { id: 'p-mara-exempel', firstName: 'Mara', lastName: 'Exempel', birthDate: '1962-06-18', nationality: 'LU', domicile: 'Luxemburg, LU', pep: false },
  { id: 'p-lea-exempel', firstName: 'Lea', lastName: 'Exempel', birthDate: '1990-03-09', nationality: 'CH', domicile: 'Baar, CH', pep: false },
  { id: 'p-natalia-fiktiva', firstName: 'Natalia', lastName: 'Fiktiva', birthDate: '1972-12-01', nationality: 'CY', domicile: 'Limassol, CY', pep: false },
  { id: 'p-andre-fiktiv', firstName: 'André', lastName: 'Fiktiv', birthDate: '1970-05-27', nationality: 'CH', domicile: 'Genf, CH', pep: false },
  { id: 'p-jean-musterli', firstName: 'Jean', lastName: 'Musterli', birthDate: '1964-08-08', nationality: 'FR', domicile: 'Neuenburg, CH', pep: false },
  { id: 'p-claire-musterli', firstName: 'Claire', lastName: 'Musterli', birthDate: '1967-10-21', nationality: 'CH', domicile: 'Biel, CH', pep: false },
  {
    id: 'p-erika-beispielmann',
    firstName: 'Erika',
    lastName: 'Beispielmann',
    birthDate: '1955-03-15',
    nationality: 'CH',
    domicile: 'Lugano, CH',
    pep: true,
    pepDetail: 'Inländische PEP: ehem. Regierungsrätin (fiktiv)',
  },
  { id: 'p-marco-beispielmann', firstName: 'Marco', lastName: 'Beispielmann', birthDate: '1983-09-29', nationality: 'CH', domicile: 'Lugano, CH', pep: false },
  {
    id: 'p-viktor-testmann',
    firstName: 'Viktor',
    lastName: 'Testmann',
    birthDate: '1961-01-17',
    nationality: 'AT',
    domicile: 'Bregenz, AT',
    pep: true,
    pepDetail: 'Ausländische PEP: Mitglied eines nationalen Parlaments (fiktiv)',
  },
  { id: 'p-martin-testmann', firstName: 'Martin', lastName: 'Testmann', birthDate: '1988-04-04', nationality: 'CH', domicile: 'St. Gallen, CH', pep: false },
  { id: 'p-monika-beispiel', firstName: 'Monika', lastName: 'Beispiel', birthDate: '1971-12-11', nationality: 'CH', domicile: 'Aarau, CH', pep: false },
  { id: 'p-reto-platzhalter', firstName: 'Reto', lastName: 'Platzhalter', birthDate: '1968-02-02', nationality: 'CH', domicile: 'Suhr, CH', pep: false },
  { id: 'p-felix-exempel', firstName: 'Felix', lastName: 'Exempel', birthDate: '1950-07-07', nationality: 'CH', domicile: 'Basel, CH', pep: false },
  { id: 'p-ursula-demo', firstName: 'Ursula', lastName: 'Demo', birthDate: '1963-05-19', nationality: 'DE', domicile: 'Riehen, CH', pep: false },
  { id: 'p-roman-muster', firstName: 'Roman', lastName: 'Muster', birthDate: '1979-10-10', nationality: 'CH', domicile: 'Thun, CH', pep: false },
  { id: 'p-nina-beispiel', firstName: 'Nina', lastName: 'Beispiel', birthDate: '1986-06-06', nationality: 'CH', domicile: 'Winterthur, CH', pep: false },
  { id: 'p-tim-beispiel', firstName: 'Tim', lastName: 'Beispiel', birthDate: '1985-11-23', nationality: 'DE', domicile: 'Winterthur, CH', pep: false },
  { id: 'p-ole-fiktiv', firstName: 'Ole', lastName: 'Fiktiv', birthDate: '1992-01-31', nationality: 'NL', domicile: 'Zürich, CH', pep: false },
  { id: 'p-jana-exempel', firstName: 'Jana', lastName: 'Exempel', birthDate: '1991-08-14', nationality: 'CH', domicile: 'Freiburg, CH', pep: false },
  { id: 'p-paolo-demo', firstName: 'Paolo', lastName: 'Demo', birthDate: '1960-09-09', nationality: 'IT', domicile: 'Genf, CH', pep: false },
  { id: 'p-urs-mustermann', firstName: 'Urs', lastName: 'Mustermann', birthDate: '1974-04-24', nationality: 'CH', domicile: 'Sitten, CH', pep: false },
  { id: 'p-kurt-beispiel', firstName: 'Kurt', lastName: 'Beispiel', birthDate: '1967-03-03', nationality: 'CH', domicile: 'Langenthal, CH', pep: false },
  { id: 'p-lea-fiktiv', firstName: 'Lea', lastName: 'Fiktiv', birthDate: '1980-12-24', nationality: 'DE', domicile: 'Konstanz, DE', pep: false },
  { id: 'p-silvia-muster', firstName: 'Silvia', lastName: 'Muster', birthDate: '1982-05-05', nationality: 'CH', domicile: 'Luzern, CH', pep: false },
  { id: 'p-daniel-exempel', firstName: 'Daniel', lastName: 'Exempel', birthDate: '1977-02-28', nationality: 'CH', domicile: 'Cham, CH', pep: false },
  { id: 'p-omar-fiktiv', firstName: 'Omar', lastName: 'Fiktiv', birthDate: '1969-07-12', nationality: 'AE', domicile: 'Dubai, AE', pep: false },
  { id: 'p-claude-fiktiv', firstName: 'Claude', lastName: 'Fiktiv', birthDate: '1973-10-02', nationality: 'CH', domicile: 'Genf, CH', pep: false },
  { id: 'p-beat-muster', firstName: 'Beat', lastName: 'Muster', birthDate: '1957-01-09', nationality: 'CH', domicile: 'Bern, CH', pep: false },
  { id: 'p-anna-platzhalter', firstName: 'Anna', lastName: 'Platzhalter', birthDate: '1976-03-21', nationality: 'CH', domicile: 'Köniz, CH', pep: false },
  { id: 'p-gian-demo', firstName: 'Gian', lastName: 'Demo', birthDate: '1987-09-17', nationality: 'CH', domicile: 'Chur, CH', pep: false },
  { id: 'p-regula-beispiel', firstName: 'Regula', lastName: 'Beispiel', birthDate: '1978-08-01', nationality: 'CH', domicile: 'Wädenswil, CH', pep: false },
  { id: 'p-thomas-beispiel', firstName: 'Thomas', lastName: 'Beispiel', birthDate: '1976-11-30', nationality: 'CH', domicile: 'Wädenswil, CH', pep: false },
  { id: 'p-mario-exempel', firstName: 'Mario', lastName: 'Exempel', birthDate: '1983-06-25', nationality: 'IT', domicile: 'Olten, CH', pep: false },
  { id: 'p-petra-fiktiv', firstName: 'Petra', lastName: 'Fiktiv', birthDate: '1971-04-16', nationality: 'CH', domicile: 'Basel, CH', pep: false },
];

export interface HrSignatory {
  personId: string;
  function: string;
  signature: SignatureKind;
}

export interface HrRecord {
  uid: string;
  name: string;
  legalForm: LegalForm;
  street: string;
  seat: string;
  canton: string;
  purpose: string;
  foundedAt: string;
  signatories: HrSignatory[];
}

const S = (personId: string, fn: string, signature: SignatureKind = 'Einzelunterschrift'): HrSignatory => ({ personId, function: fn, signature });
const K2: SignatureKind = 'Kollektivunterschrift zu zweien';

/** Simuliertes Handelsregister (Zefix) */
export const HR_RECORDS: HrRecord[] = [
  // Bestandskunden
  { uid: 'CHE-999.100.101', name: 'Muster Holz AG', legalForm: 'AG', street: 'Sägeweg 4', seat: 'Burgdorf', canton: 'BE', foundedAt: '1998-03-02', purpose: 'Betrieb einer Zimmerei und Schreinerei sowie Handel mit Holzprodukten.', signatories: [S('p-hans-muster', 'Präsident des Verwaltungsrates'), S('p-erika-muster', 'Mitglied des Verwaltungsrates', K2)] },
  { uid: 'CHE-999.100.102', name: 'Beispiel Bau GmbH', legalForm: 'GmbH', street: 'Industriestrasse 12', seat: 'Emmen', canton: 'LU', foundedAt: '2009-06-15', purpose: 'Ausführung von Hoch- und Tiefbauarbeiten.', signatories: [S('p-peter-beispiel', 'Gesellschafter und Geschäftsführer')] },
  { uid: 'CHE-999.100.103', name: 'Demo Gastro GmbH', legalForm: 'GmbH', street: 'Langstrasse 88', seat: 'Zürich', canton: 'ZH', foundedAt: '2016-02-01', purpose: 'Betrieb von Restaurants und Bars sowie Catering.', signatories: [S('p-luca-demoli', 'Gesellschafter und Geschäftsführer'), S('p-sara-demoli', 'Gesellschafterin', K2)] },
  { uid: 'CHE-999.100.104', name: 'Exempel Treuhand AG', legalForm: 'AG', street: 'Baarerstrasse 21', seat: 'Zug', canton: 'ZG', foundedAt: '2003-09-10', purpose: 'Erbringung von Treuhand-, Buchhaltungs- und Steuerberatungsdienstleistungen.', signatories: [S('p-ivo-exempel', 'Präsident des Verwaltungsrates'), S('p-daniel-exempel', 'Geschäftsführer', K2)] },
  { uid: 'CHE-999.100.105', name: 'Fiktiv Rohstoffe AG', legalForm: 'AG', street: 'Rue du Rhône 50', seat: 'Genf', canton: 'GE', foundedAt: '2012-11-20', purpose: 'Handel mit Rohstoffen, insbesondere Metallen und Agrarprodukten.', signatories: [S('p-andre-fiktiv', 'Mitglied des Verwaltungsrates'), S('p-natalia-fiktiva', 'Präsidentin des Verwaltungsrates', K2)] },
  { uid: 'CHE-999.100.106', name: 'Muster Uhren AG', legalForm: 'AG', street: 'Uhrmacherweg 7', seat: 'Biel/Bienne', canton: 'BE', foundedAt: '1994-05-30', purpose: 'Herstellung und Handel von Uhren, Schmuck und Edelmetallen.', signatories: [S('p-claire-musterli', 'Delegierte des Verwaltungsrates'), S('p-jean-musterli', 'Präsident des Verwaltungsrates', K2)] },
  { uid: 'CHE-999.100.107', name: 'Platzhalter Immobilien AG', legalForm: 'AG', street: 'Via Nassa 3', seat: 'Lugano', canton: 'TI', foundedAt: '2005-01-12', purpose: 'Erwerb, Verwaltung und Verkauf von Immobilien.', signatories: [S('p-erika-beispielmann', 'Präsidentin des Verwaltungsrates'), S('p-marco-beispielmann', 'Geschäftsführer', K2)] },
  { uid: 'CHE-999.100.108', name: 'Testmann Autohandel GmbH', legalForm: 'GmbH', street: 'Fürstenlandstrasse 99', seat: 'St. Gallen', canton: 'SG', foundedAt: '2011-08-01', purpose: 'Handel mit Neu- und Occasionsfahrzeugen sowie Werkstattbetrieb.', signatories: [S('p-martin-testmann', 'Gesellschafter und Geschäftsführer'), S('p-viktor-testmann', 'Gesellschafter', K2)] },
  { uid: 'CHE-999.100.109', name: 'Verein Musterchor Beispielstadt', legalForm: 'Verein', street: 'Kirchgasse 2', seat: 'Aarau', canton: 'AG', foundedAt: '1987-10-01', purpose: 'Pflege des Chorgesangs und Durchführung von Konzerten.', signatories: [S('p-monika-beispiel', 'Präsidentin', K2), S('p-reto-platzhalter', 'Kassier', K2)] },
  { uid: 'CHE-999.100.110', name: 'Stiftung Beispiel Kultur', legalForm: 'Stiftung', street: 'Rheinsprung 9', seat: 'Basel', canton: 'BS', foundedAt: '2001-04-04', purpose: 'Förderung von Kunst und Kultur in der Region Basel.', signatories: [S('p-felix-exempel', 'Präsident des Stiftungsrates', K2), S('p-ursula-demo', 'Mitglied des Stiftungsrates', K2)] },
  { uid: 'CHE-999.100.111', name: 'Elektro Muster', legalForm: 'Einzelunternehmen', street: 'Frutigenstrasse 40', seat: 'Thun', canton: 'BE', foundedAt: '2014-03-01', purpose: 'Elektroinstallationen und Telematik.', signatories: [S('p-roman-muster', 'Inhaber')] },
  { uid: 'CHE-999.100.112', name: 'Beispiel Informatik GmbH', legalForm: 'GmbH', street: 'Technikumstrasse 5', seat: 'Winterthur', canton: 'ZH', foundedAt: '2018-07-01', purpose: 'Entwicklung von Software und IT-Beratung.', signatories: [S('p-nina-beispiel', 'Gesellschafterin und Geschäftsführerin'), S('p-tim-beispiel', 'Gesellschafter', K2)] },
  { uid: 'CHE-999.100.113', name: 'Velo Exempel GmbH', legalForm: 'GmbH', street: 'Route de la Glâne 11', seat: 'Freiburg', canton: 'FR', foundedAt: '2020-04-15', purpose: 'Handel und Reparatur von Velos und E-Bikes.', signatories: [S('p-jana-exempel', 'Gesellschafterin und Geschäftsführerin')] },
  { uid: 'CHE-999.100.114', name: 'Demo Kunsthandel AG', legalForm: 'AG', street: 'Grand-Rue 18', seat: 'Genf', canton: 'GE', foundedAt: '2008-10-10', purpose: 'Handel mit Kunstwerken und Antiquitäten sowie Durchführung von Auktionen.', signatories: [S('p-paolo-demo', 'Einziges Mitglied des Verwaltungsrates')] },
  { uid: 'CHE-999.100.115', name: 'FC Musterdorf', legalForm: 'Verein', street: 'Sportplatzweg 1', seat: 'Sitten', canton: 'VS', foundedAt: '1972-06-01', purpose: 'Förderung des Fussballsports, insbesondere der Juniorinnen und Junioren.', signatories: [S('p-urs-mustermann', 'Präsident', K2)] },
  // Onboarding-Fälle
  { uid: 'CHE-999.200.201', name: 'Beispiel Sanitär AG', legalForm: 'AG', street: 'Bahnhofstrasse 30', seat: 'Langenthal', canton: 'BE', foundedAt: '2024-11-04', purpose: 'Sanitär- und Heizungsinstallationen.', signatories: [S('p-kurt-beispiel', 'Präsident des Verwaltungsrates')] },
  { uid: 'CHE-999.200.202', name: 'Muster Catering GmbH', legalForm: 'GmbH', street: 'Pilatusstrasse 15', seat: 'Luzern', canton: 'LU', foundedAt: '2025-02-01', purpose: 'Catering und Eventgastronomie.', signatories: [S('p-silvia-muster', 'Gesellschafterin und Geschäftsführerin')] },
  { uid: 'CHE-999.200.203', name: 'Exempel Consulting AG', legalForm: 'AG', street: 'Zugerstrasse 70', seat: 'Cham', canton: 'ZG', foundedAt: '2025-06-20', purpose: 'Unternehmensberatung im Bereich Digitalisierung.', signatories: [S('p-daniel-exempel', 'Präsident des Verwaltungsrates')] },
  { uid: 'CHE-999.200.204', name: 'Fiktiv Trading SA', legalForm: 'AG', street: 'Quai du Mont-Blanc 2', seat: 'Genf', canton: 'GE', foundedAt: '2025-03-03', purpose: 'Internationaler Handel mit Industriegütern.', signatories: [S('p-claude-fiktiv', 'Mitglied des Verwaltungsrates'), S('p-omar-fiktiv', 'Präsident des Verwaltungsrates', K2)] },
  { uid: 'CHE-999.200.205', name: 'Stiftung Muster Bildung', legalForm: 'Stiftung', street: 'Kramgasse 10', seat: 'Bern', canton: 'BE', foundedAt: '2025-08-01', purpose: 'Vergabe von Stipendien an Lernende und Studierende.', signatories: [S('p-beat-muster', 'Präsident des Stiftungsrates', K2), S('p-anna-platzhalter', 'Mitglied des Stiftungsrates', K2)] },
  { uid: 'CHE-999.200.206', name: 'Demo Bäckerei Muster', legalForm: 'Einzelunternehmen', street: 'Poststrasse 6', seat: 'Chur', canton: 'GR', foundedAt: '2025-09-01', purpose: 'Betrieb einer Bäckerei-Konditorei.', signatories: [S('p-gian-demo', 'Inhaber')] },
  // Noch keine Kunden – für «Neuer Fall»
  { uid: 'CHE-999.300.301', name: 'Beispiel Garten AG', legalForm: 'AG', street: 'Seestrasse 140', seat: 'Wädenswil', canton: 'ZH', foundedAt: '2026-05-12', purpose: 'Gartenbau, Gartenunterhalt und Handel mit Pflanzen.', signatories: [S('p-regula-beispiel', 'Präsidentin des Verwaltungsrates'), S('p-thomas-beispiel', 'Mitglied des Verwaltungsrates', K2)] },
  { uid: 'CHE-999.300.302', name: 'Exempel Logistik GmbH', legalForm: 'GmbH', street: 'Industriestrasse 3', seat: 'Olten', canton: 'SO', foundedAt: '2026-01-20', purpose: 'Transporte und Lagerlogistik.', signatories: [S('p-mario-exempel', 'Gesellschafter und Geschäftsführer')] },
  { uid: 'CHE-999.300.303', name: 'Fiktiv Pharma Holding AG', legalForm: 'AG', street: 'Aeschenvorstadt 1', seat: 'Basel', canton: 'BS', foundedAt: '2026-07-01', purpose: 'Halten und Verwalten von Beteiligungen im Pharmabereich.', signatories: [S('p-petra-fiktiv', 'Präsidentin des Verwaltungsrates')] },
];

/** Eigentümerstruktur gemäss Kundenangaben (Formular K): Gesellschaften und Beteiligungen */
export interface StructureDef {
  companies: { key: string; name: string; country: string }[];
  /** [Eigentümer, gehaltene Einheit, Prozent]; 'root' = Kunde, Personen über personId */
  holdings: [string, string, number][];
}

export const STRUCTURES: Record<string, StructureDef> = {
  'CHE-999.100.101': { companies: [], holdings: [['p-hans-muster', 'root', 60], ['p-erika-muster', 'root', 40]] },
  'CHE-999.100.102': { companies: [], holdings: [['p-peter-beispiel', 'root', 100]] },
  'CHE-999.100.103': { companies: [], holdings: [['p-luca-demoli', 'root', 70], ['p-sara-demoli', 'root', 30]] },
  'CHE-999.100.104': {
    companies: [
      { key: 'c-exh', name: 'Exempel Holding AG', country: 'CH' },
      { key: 'c-exg', name: 'Exempel Group S.à r.l.', country: 'LU' },
    ],
    holdings: [['c-exh', 'root', 100], ['c-exg', 'c-exh', 80], ['p-ivo-exempel', 'c-exh', 20], ['p-ivo-exempel', 'c-exg', 55], ['p-mara-exempel', 'c-exg', 45]],
  },
  'CHE-999.100.105': {
    companies: [
      { key: 'c-fh', name: 'Fiktiv Holding AG', country: 'CH' },
      { key: 'c-ft', name: 'Fiktiv Trading Inc.', country: 'PA' },
    ],
    holdings: [['c-fh', 'root', 100], ['c-ft', 'c-fh', 100], ['p-natalia-fiktiva', 'c-ft', 100]],
  },
  'CHE-999.100.106': {
    companies: [
      { key: 'c-muh', name: 'Muster Uhren Holding AG', country: 'CH' },
      { key: 'c-hm', name: 'Horloge Muster B.V.', country: 'NL' },
    ],
    holdings: [['c-muh', 'root', 100], ['c-hm', 'c-muh', 100], ['p-jean-musterli', 'c-hm', 50], ['p-claire-musterli', 'c-hm', 50]],
  },
  'CHE-999.100.107': { companies: [], holdings: [['p-erika-beispielmann', 'root', 51], ['p-marco-beispielmann', 'root', 49]] },
  'CHE-999.100.108': { companies: [], holdings: [['p-viktor-testmann', 'root', 50], ['p-martin-testmann', 'root', 50]] },
  'CHE-999.100.109': { companies: [], holdings: [] },
  'CHE-999.100.110': { companies: [], holdings: [] },
  'CHE-999.100.111': { companies: [], holdings: [['p-roman-muster', 'root', 100]] },
  'CHE-999.100.112': { companies: [], holdings: [['p-nina-beispiel', 'root', 50], ['p-tim-beispiel', 'root', 30], ['p-ole-fiktiv', 'root', 20]] },
  'CHE-999.100.113': { companies: [], holdings: [['p-jana-exempel', 'root', 100]] },
  'CHE-999.100.114': { companies: [], holdings: [['p-paolo-demo', 'root', 100]] },
  'CHE-999.100.115': { companies: [], holdings: [] },
  'CHE-999.200.201': { companies: [], holdings: [['p-kurt-beispiel', 'root', 100]] },
  'CHE-999.200.202': { companies: [], holdings: [['p-silvia-muster', 'root', 100]] },
  'CHE-999.200.203': { companies: [], holdings: [['p-daniel-exempel', 'root', 100]] },
  'CHE-999.200.204': {
    companies: [{ key: 'c-fg', name: 'Fiktiv Global FZE', country: 'AE' }],
    holdings: [['c-fg', 'root', 100], ['p-omar-fiktiv', 'c-fg', 70], ['p-claude-fiktiv', 'c-fg', 30]],
  },
  'CHE-999.200.205': { companies: [], holdings: [] },
  'CHE-999.200.206': { companies: [], holdings: [['p-gian-demo', 'root', 100]] },
  'CHE-999.300.301': { companies: [], holdings: [['p-regula-beispiel', 'root', 50], ['p-thomas-beispiel', 'root', 50]] },
  'CHE-999.300.302': { companies: [], holdings: [['p-mario-exempel', 'root', 100]] },
  'CHE-999.300.303': {
    companies: [{ key: 'c-fpg', name: 'Fiktiv Pharma Group Ltd.', country: 'GB' }],
    holdings: [['c-fpg', 'root', 100], ['p-petra-fiktiv', 'c-fpg', 100]],
  },
};

/**
 * Meldungen im Transparenzregister, die von den Kundenangaben abweichen.
 * Für alle anderen Gesellschaften entspricht das Register den Kundenangaben.
 */
export const TR_OVERRIDES: Record<string, RegisterOwner[]> = {
  'CHE-999.200.201': [
    { name: 'Kurt Beispiel', birthYear: 1967, nationality: 'CH', share: 60, kind: 'Kontrollinhaber (Kapital)' },
    { name: 'Lea Fiktiv', birthYear: 1980, nationality: 'DE', share: 40, kind: 'Kontrollinhaberin (Kapital)' },
  ],
  'CHE-999.100.112': [
    { name: 'Nina Beispiel', birthYear: 1986, nationality: 'CH', share: 50, kind: 'Kontrollinhaberin (Kapital)' },
    { name: 'Ole Fiktiv', birthYear: 1992, nationality: 'NL', share: 30, kind: 'Kontrollinhaber (Kapital)' },
    { name: 'Tim Beispiel', birthYear: 1985, nationality: 'DE', share: 20, kind: 'Kontrollinhaber (Kapital)' },
  ],
  'CHE-999.300.302': [
    { name: 'Mario Exempel', birthYear: 1983, nationality: 'IT', share: 75, kind: 'Kontrollinhaber (Kapital)' },
    { name: 'Petra Fiktiv', birthYear: 1971, nationality: 'CH', share: 25, kind: 'Kontrollinhaberin (Kapital)' },
  ],
};
