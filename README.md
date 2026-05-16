# Chronotop

> Ein offenes, modulares Framework zur Darstellung historischer Zusammenhänge in Schule und Selbststudium.

Chronotop verbindet **räumliche, zeitliche, begriffliche und quellenbezogene** Dimensionen historischen Wissens in einer gemeinsamen Arbeitsumgebung. Es ist nicht um eine Karte herum gebaut, sondern um ein **historisches Daten- und Beziehungsmodell**, auf dem mehrere gekoppelte Ansichten aufsetzen.

Primärer Einsatzkontext: **Geschichtsunterricht der Sekundarstufen I und II**, daneben Selbstarbeit interessierter Lernender und eigene Inhaltsmodule beliebiger Autorinnen und Autoren.

Der Name knüpft an Michail Bachtins Begriff der untrennbaren Verschränkung von Raum und Zeit in Erzählungen an.

---

## Public-Beta auf GitHub Pages

Die öffentliche Beta ist als **statische GitHub-Pages-Demo** gedacht:

- keine Server-Logins und keine persistente Speicherung auf GitHub Pages
- drei kuratierte Module: Ebersbach, Esslingen 1933-45, Industrialisierung an Neckar und Fils
- Lernendenansicht, Autorendemo und Export sind testbar
- Bearbeitungen im Autorentool bleiben lokal im Browserzustand und können als JSON-Entwurf exportiert werden

Für das Deployment nutzt das Repo einen GitHub-Actions-Workflow unter `.github/workflows/pages.yml`. In den Repository-Einstellungen muss GitHub Pages als **GitHub Actions**-Quelle aktiviert sein.

```bash
npm install
npm run pages:prepare
npm run build:pages
```

Der Workflow erzeugt die Demo-Daten automatisch aus den Seeds und veröffentlicht `packages/client/dist` als Pages-Artefakt.

---

## Schnellstart lokal

Voraussetzungen: **Node.js ≥ 20**, **npm ≥ 9**. Nichts weiter — keine Datenbank-Installation, kein Docker.

```bash
# Repository auschecken
git clone <repo-url> chronotop
cd chronotop

# Abhängigkeiten installieren (npm workspaces)
npm install

# Kuratierte Beta-Module einseeden
npm run seed:local

# Entwicklungs-Server starten (Backend + Client parallel)
npm run dev
```

Anschließend:
- Backend-API: <http://localhost:3000/api/v1>
- Frontend: <http://localhost:5173>

---

## Architektur

```
chronotop/
├── packages/
│   ├── server/          Express + sql.js (SQLite via WebAssembly)
│   │   └── src/
│   │       ├── routes/         REST-API-Routen
│   │       ├── repositories/   Datenzugriff pro Entität
│   │       ├── services/       JSON-LD-Export, Wikidata-Proxy
│   │       ├── migrations/     SQL-Migrationen (versioniert)
│   │       └── seed/           Beispielmodule + externe Geo-Datenquellen
│   └── client/          Vite + React + TypeScript + MapLibre GL
│       └── src/
│           ├── components/
│           │   ├── map/        MapView + Overlay (Stil-Wechsler, Legende)
│           │   ├── timeline/   Zeitleiste mit Zeitcursor / Zeitfenster
│           │   ├── detail/     Detailpanel mit IIIF-Viewer
│           │   ├── author/     Autorenwerkzeug (Tabs: Ereignisse|Akteure|Begriffe)
│           │   ├── concept/    Begriffliche Ansicht (bipartiter Graph)
│           │   └── layout/     Header, Layout-Container
│           ├── lib/            Karten-Stile, Timeline-Helper
│           └── store/          Zustand-Store (Zustand)
└── shared/              TypeScript-Typen für Backend & Frontend
```

### Datenmodell (Kurzfassung)

| Entität | Zweck | Wichtige Felder |
|---|---|---|
| `content_module` | Inhaltsmodul (z. B. „Reformation in Europa") | title, description, author_name, version, license |
| `place` | Historischer/aktueller Ort | lat, lng, **geometry_geojson** (Polygon/Linie), wikidata_id |
| `time_object` | Zeitpunkt oder Zeitraum | type, date / start_date+end_date, **certainty** |
| `event` | Historisches Ereignis | title, description, place_id, time_object_id, follows_id, part_of_id |
| `source` | Quelle (Text, Bild, Karte …) | type, title, **iiif_image_url**, license |
| `actor` | Person, Gruppe, Institution | type, name, wikidata_id, birth_date, death_date |
| `concept` | Begriff in drei Typen | **kind** (analytical / source / narrative), label, description |

**Junction-Tabellen** `event_source`, `event_actor` (mit Rolle), `event_concept` realisieren die n:m-Beziehungen.

### Gekoppelte Ansichten

`selectedEventId` im Zustand-Store ist Single-Source-of-Truth für die Auswahl. Klick in Karte, Timeline oder Detailpanel propagiert in alle anderen Sichten:

- **MapView** fliegt zum Ort (oder Polygon-Bounds), hebt Marker hervor.
- **TimelineView** scrollt zur Bar, hebt sie hervor.
- **DetailPanel** zeigt Titel, Beschreibung, Ort, Zeit, Akteure, Begriffe, Quellen.
- **Begriffliche Ansicht** zeigt Verbindungen Begriff↔Ereignis.

---

## Externe Datenquellen

Chronotop ist ausdrücklich kein Insellösung — Inhalte verbinden sich an offene Identifikatoren:

| Quelle | Wofür | Status |
|---|---|---|
| **Wikidata** | QID für Orte, Akteure, Begriffe; Lookup von Geburts-/Sterbedatum, Koordinaten | aktiv |
| **OpenStreetMap (Overpass)** | Detaillierte Geometrien (Berliner Mauer, Bauwerke) | aktiv |
| **Historical Basemaps** ([aourednik/historical-basemaps](https://github.com/aourednik/historical-basemaps)) | Historische Welt-Grenzen für definierte Zeitschnitte | aktiv |
| **IIIF (Image API + Presentation API)** | Hochauflösende Bildquellen aus Bibliotheken/Archiven | Viewer eingebunden, Inhalte erweiterbar |

---

## Verfügbare Skripte

| Skript | Zweck |
|---|---|
| `npm run dev` | Backend + Client parallel mit Hot-Reload |
| `npm run dev:server` | Nur Express-Server |
| `npm run dev:client` | Nur Vite-Client |
| `npm run build` | Produktions-Build des Clients |
| `npm run pages:prepare` | Kuratierte Demo-Module seeden und statische Demo-Daten exportieren |
| `npm run build:pages` | Statischen GitHub-Pages-Build mit Demo-Daten erzeugen |
| `npm run db:migrate` | Datenbank-Migrationen ausführen |
| `npm run seed:local` | Public-Beta-Set einspielen: Ebersbach, Esslingen 1933-45, Neckar/Fils |
| `npm run export:static-demo` | Aktuellen Seed-Stand nach `packages/client/public/demo/demo-data.json` exportieren |
| `npm run seed:geometries` | Präzise historische Polygone (HRR, Reich 1938) |
| `npm run seed:berlin-wall` | Berliner Mauer aus OSM |
| `npm test` | Backend-Tests (Vitest) |
| `npm run test:e2e` | End-to-End-Tests (Playwright) |

---

## Daten-Speicherort

Die lokale SQLite-Datei liegt standardmäßig unter `packages/server/data/chronotop.db`. Der Pfad kann über `DB_PATH` überschrieben werden, etwa für den Pages-Build im CI.

---

## Standards & Anschlussfähigkeit

Chronotop ist auf das digitale Kulturerbe-Ökosystem ausgerichtet:

- **Wikidata-IDs** als bevorzugte externe Identifikatoren
- **GeoJSON** für Geometrien (kompatibel mit allen GIS-Werkzeugen)
- **JSON-LD-Export** mit Schema.org-Vokabular und `chronotop:`-Erweiterungen
- Geplant: Mapping nach **CIDOC CRM / Linked Art** (siehe Roadmap)

---

## Lizenz

- **Code**: [AGPL-3.0](LICENSE) — sichert, dass auch gehostete Forks die Offenheit erhalten.
- **Inhalte der Beispielmodule**: CC-BY-SA 4.0 (siehe Modul-Metadaten).
- **OSM-Daten**: ODbL — © OpenStreetMap-Mitwirkende
- **Historical Basemaps**: MIT — Andreas Ourednik
- **Wikidata**: CC0
- **Karten-Tiles**: © OpenStreetMap-Mitwirkende, CARTO, OpenTopoMap

---

## Status

Aktiver Entwicklungs-Stand. Siehe **[ROADMAP.md](ROADMAP.md)** für die geplanten nächsten Schritte (Versionierung, Authentifizierung, CIDOC-CRM-Mapping, Lernfunktionalität).

## Mitwirken

Pull Requests willkommen. Vorher bitte:

```bash
npm test          # Backend-Tests grün
npm run test:e2e  # E2E-Tests grün (lokal)
```
