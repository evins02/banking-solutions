# KYC & Compliance Workbench (Prototyp)

Klickbarer Prototyp für Schweizer Regional-, Kantonal- und Privatbanken – Banking Solutions, Division Banking Operations.
Drei Abläufe in einer Oberfläche:

1. **Onboarding Firmenkunden (KYC)** – Handelsregister-Vorbefüllung, Abgleich Transparenzregister, dynamische Unterlagen-Checkliste, Kundenportal, Dokumente auslesen, Eigentümerstruktur, Risikoeinstufung, Vier-Augen-Freigabe, KYC-Profil als PDF
2. **Prüfung von AML-Alarmen** – Warteschlange mit Fristen-Ampel, Alarmdetail auf einem Bildschirm, geführte Plausibilisierung, Qualitätsprüfung der Begründung, Eskalation, MROS-Entwurf, Rückkopplung TmeR → GmeR, Auswertung je Szenario
3. **Periodische und laufende KYC-Überprüfung** – Fälligkeiten nach Risiko, Ereignisse (HR-Mutation, Transparenzregister, eskalierter Alarm, Volumenabweichung), Selbstbestätigung durch den Kunden (E-ID-Platzhalter), Abschluss mit einem Klick oder verkürzter Ablauf

Dazu Audit-Trail (verkettete Hashes, nur anfügen) und Einstellungen (Risikokriterien, Intervalle, Fristen, Floskel-Liste).

> **Ausschliesslich fiktive Testdaten.** Handelsregister, Transparenzregister und das Auslesen von Dokumenten sind simuliert und in der Oberfläche als «Demo» gekennzeichnet. Es gibt keine echten Schnittstellen, kein Login und keinen Versand von MROS-Meldungen. Die App schlägt vor – entschieden wird immer durch eine Person.

## Starten

```bash
cd kyc-workbench
npm install
npm run dev        # http://localhost:5174
npm test           # Fachlogik und Abnahmekriterien (Vitest)
npm run build      # Typprüfung + Produktions-Build nach dist/
```

Node ≥ 22.12. Die Daten liegen im `localStorage` des Browsers; «Einstellungen → Demo-Daten zurücksetzen» lädt die Testdaten neu.

## Demo-Drehbuch (Abnahmekriterien)

Rolle oben rechts umschalten – jede Rolle ist eine fiktive Person.

1. **Onboarding bis zur Eröffnung** – *Kundenberater/in*: Onboarding → «Neuer Fall» → «Beispiel Garten» suchen → Fall anlegen. Reiter «Stammdaten & Profil» (Branche, Zweck, Volumen), «Eigentümerstruktur» → «Angaben Formular K laden» → bestätigen, «Transparenzregister» → Abgleich, «Unterlagen» → «Unterlagen anfordern» → «Kundensicht öffnen» und dort hochladen. *Backoffice*: Dokumente prüfen (erkannte Felder bestätigen/korrigieren). *Kundenberater/in*: einreichen. *Compliance*: Risikoeinstufung bestätigen oder übersteuern (z. B. auf GmeR), freigeben. *Leitung Compliance*: zweite Freigabe (Vier-Augen). *Backoffice*: Stammdaten finalisieren, Konto eröffnen. KYC-Profil drucken bzw. als PDF speichern.
   Abweichung zum Transparenzregister: Fall «Beispiel Sanitär AG».
2. **Alarm mit Floskel** – *Compliance*: Alarme → beliebiger offener Alarm → als Begründung «Lieferantenzahlung, branchenüblich» eingeben → Warnung der Qualitätsprüfung.
3. **HR-Mutation erzeugt Überprüfung** – KYC-Überprüfungen → «Ereignis simulieren» → «Neue zeichnungsberechtigte Person» → es entsteht automatisch eine Überprüfung (oder die offene wird ergänzt).
4. **Audit-Trail** – jede Aktion inkl. Kundenportal erscheint mit Zeitstempel, Person, Rolle und altem/neuem Wert.

## Aufbau

```
src/
  types.ts                 Datenmodelle (Kunde, Person, Beteiligung, Fall, Dokument, Risikobewertung,
                           Alarm, Transaktion, Überprüfung, Ereignis, Audit-Eintrag)
  lib/domain.ts            Reine Fachlogik: Checkliste je Rechtsform, Eigentümerstruktur (≥ 25 %),
                           Punktemodell, Qualitätsprüfung Begründung, Rechte je Rolle
  lib/actions.ts           Alle Aktionen mit Rechte-/Voraussetzungsprüfung und Audit-Eintrag
                           (entspricht später je einem API-Aufruf)
  services/                Simulierte Dienste mit künstlicher Ladezeit, austauschbar über services/index.ts
    handelsregister.ts     Zefix/SHAB (Suche, Auszug, Mutationen)
    transparenzregister.ts Gemeldete wirtschaftlich Berechtigte, Abgleich
    dokumentenleser.ts     «Erkannte» Felder aus Ausweis und HR-Auszug
  data/                    Fiktive Register- und Testdaten, Standard-Einstellungen, Demo-Benutzer
  store.tsx                Zustand im Browser (localStorage, Tab-Synchronisation mit der Kundensicht)
  views/                   Dashboard, Onboarding, Alarme, KYC-Überprüfungen, Kundenportal, Audit-Trail, Einstellungen
```

Für eine Datenbank (z. B. Supabase) sind die Modelle flach und über IDs verknüpft; `load`/`persist` im Store
und die Funktionen in `lib/actions.ts` sind die Stellen, die durch API-Aufrufe ersetzt würden.

Technik: React 19, TypeScript, Tailwind CSS 4, Recharts, lucide-react, Vite.

## Deployment auf Vercel

Live: https://banking-solutions-6ils.vercel.app/

Eigenes Vercel-Projekt aus diesem Repository, **Root Directory `kyc-workbench`**, Framework Preset **Vite** (Build `npm run build`, Output `dist`). Jeder Push auf `main` löst ein neues Deployment aus.
