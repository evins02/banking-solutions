# Banking Solutions

Portalseite für Demo-Lösungen für Schweizer Banken. Verlinkt auf eigenständig laufende Apps:

| Lösung | Beschreibung | URL |
| --- | --- | --- |
| CreditFlow | Vorprüfung von Kreditdossiers | https://creditflow-opal.vercel.app/ |
| BauCheck | Baufortschritt bei Baukrediten per Fotonachweis prüfen | https://bau-check-one.vercel.app/ |

Reine statische Seite (HTML/CSS/JS), kein Build nötig.

## Neue Lösung hinzufügen

Einen Eintrag in `solutions.js` ergänzen:

```js
{
  id: 'neu',
  name: 'Name',
  tagline: 'Kurzbeschreibung',
  description: 'Ein bis zwei Sätze.',
  features: ['Stichwort 1', 'Stichwort 2'],
  url: 'https://…vercel.app',
  status: 'live',        // oder 'planned' (Kachel ohne Link)
  icon: 'chart',         // folder | building | plus | chart
  accent: '#1546d6',
}
```

## Lokal ansehen

`index.html` im Browser öffnen oder `npx serve .`

## Deployment auf Vercel

Repository importieren, Application Preset **Other**, kein Build-Befehl, Output `./`. Projektname klein schreiben, z. B. `banking-solutions`.
