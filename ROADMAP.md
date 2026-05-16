# Chronotop — Roadmap

Dieser Plan ergibt sich aus dem kritischen Review des aktuellen Stands und ordnet die nächsten Schritte nach Priorität.

## Phase 0 — Aufräumen ✓ abgeschlossen

Codebasis testbar, dokumentiert und robust.

- [x] README + ROADMAP + LICENSE
- [x] `saveDb`-Debouncing in `dbHelper.ts` (mit `flushSaveDb()` an Sync-Punkten)
- [x] React Error-Boundary + globaler Fehler-Toast (mit API-Fehler-Anbindung)
- [x] Vitest für Backend-Repos — 15 grüne Smoke-Tests
- [x] Playwright für 3 Critical Paths — 4 grüne E2E-Tests
- [x] Form-Labels semantisch korrekt (htmlFor) als Nebeneffekt der E2E-Tests

## Phase 1 — Datenmodell aufräumen

Das eigentliche Versprechen des Zielmodells einlösen.

- [ ] **Geometrien zeitlich verankern**: `place.valid_from`, `place.valid_to`. Reich 1938 und Berliner Mauer werden dann automatisch nur in ihrer Gültigkeit angezeigt.
- [ ] **Unsicherheit überall**: `certainty`, `source_of_claim` an Place, Akteur, Verknüpfungen.
- [ ] **W3C Web Annotation-Schicht** für interpretative Annotationen — Trennung Fakt/Deutung wie im Zielmodell gefordert.
- [ ] **Versionierung kuratierter Inhalte**: jede Speicherung erzeugt zitierfähige Revision.
- [ ] **Mehrsprachigkeit pro Feld**: Title/Description als JSON, Quellenzitate parallel in Originalsprache und Übersetzung.

## Phase 2 — Schul-Tauglichkeit

- [ ] Authentifizierung (E-Mail+Passwort, später SAML)
- [ ] Rollen: Framework / Autor / Lernender / Betrachter
- [ ] Druck-/PDF-Export der Lernsicht
- [ ] Permalinks (`/learn/:mid?event=…&t=1938-11-09`)
- [ ] Aufgabenmodus (Fragen pro Ereignis + Auswertung)
- [ ] Lernenden-Annotationen in eigener Schicht

## Phase 3 — Karte und Inhalt aufwerten

- [ ] Mini-Map auf der Timeline (Übersichts-Streifen)
- [ ] Bewegungen / Routen mit gerichteten Pfeilen
- [ ] Historische Karten als IIIF-Tile-Layer (BSB, BnF)
- [ ] Reformations-Modul: präzisere konfessionelle Verbreitung
- [ ] Drittes Beispielmodul mit echten IIIF-Bildquellen

## Phase 4 — Produktionsreife

- [ ] Migration auf PostgreSQL/PostGIS
- [ ] Dockerfile + docker-compose für ganze Anwendung
- [ ] CI/CD (GitHub Actions: Lint, Test, Build)
- [ ] WCAG 2.1 AA Audit (axe-core + Screenreader)
- [ ] DSGVO-Texte (Datenschutz, AVV)
- [ ] Backup-Strategie

## Phase 5 — Langfristig

- Echtes CIDOC-CRM / Linked Art-Mapping
- Apache Jena Fuseki als optionale RDF-Read-Layer
- Echtzeit-Kollaboration (CRDT)
- Klassen-/Lerngruppenverwaltung
- Mobile Native App (Capacitor) für Tablets im Unterricht
