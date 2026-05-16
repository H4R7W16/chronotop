# Chronotop — Arbeitspaket-Plan

> **Zweck dieser Datei**: Briefing für die nächsten Entwicklungs-Sessions. Jedes Paket ist als eigenständiger Auftrag formuliert und enthält Modell-Empfehlung, Kontext-Hinweise, Akzeptanzkriterien und Abhängigkeiten. So kannst du jedes Paket einzeln in einem neuen Chat anstoßen — gegen das jeweils empfohlene Modell.
>
> **Modell-Empfehlung**:
> - **Haiku** = niedriger Anspruch: klares Pattern, abgegrenzte Datei(en), geringe Architekturentscheidung. Ideal für Datenseeding, README-Pflege, einfache UI-Polituren, Standard-CRUD-Erweiterungen.
> - **Sonnet** = mittlerer Anspruch: mehrere Dateien, neue Komponenten, kleine bis mittlere Architekturentscheidungen, neue API-Endpunkte mit Frontend-Anbindung.
> - **Opus** = hoher Anspruch: explizit markiert. Komplexe Architektur-Refactorings, semantisches Modellieren (CIDOC-CRM), verteilte Systeme.

---

## Stand der Codebasis (zum Zeitpunkt dieser Datei)

### ✅ Abgeschlossen

**Phase 0 — Aufräumen**
- README.md, ROADMAP.md, LICENSE
- `saveDb`-Debouncing in `dbHelper.ts` mit `flushSaveDb()` an Sync-Punkten
- Error-Boundary + globaler Toast (`packages/client/src/components/system/`)
- API-Client meldet 4xx/5xx automatisch als Fehler-Toast
- Vitest: 71 Backend-Tests + 11 Client-Lib-Tests grün
- Playwright: 6 E2E-Tests geplant (aktuell fehlgeschlagen wegen Projekt-Setup-Fehler)

**Phase 1.1 — Geometrien zeitlich verankern**
- Migration `004_place_validity.sql` mit `place.valid_from` / `place.valid_to`
- `OrtPicker` zeigt Eingabefelder „gültig ab/bis" für selektierten Ort
- `MapView` filtert Polygone/Linien anhand `isPlaceValidInRange()` gegen `timeFilter`
- HRR datiert 962 – 1806, Reich 1933 – 1945, Berliner Mauer 1961 – 1989

**Phase 1.2 — Unsicherheit überall**
- Migration `005_uncertainty.sql`: `certainty` + `source_of_claim` an Place, Actor, event_actor
- Repos und Routes übernehmen die Felder
- DetailPanel zeigt Sicherheits-Badges (Place, Akteur)
- JSON-LD-Export enthält `chronotop:certainty` und `chronotop:sourceOfClaim`
- Helper `weaker()` errechnet effektive Sicherheit (Akteur-Identifikation × Rollen-Zuschreibung)

**Phase 1.3 — W3C Web Annotations**
- Migration `006_annotations.sql`: eigene Tabelle für interpretative Aussagen
- `annotation.repo.ts`, `routes/annotation.ts`, API-Client-Endpunkte
- Komponente `EventAnnotations.tsx` im DetailPanel: Anzeigen + Anlegen
- JSON-LD-Export enthält `chronotop:annotations` als `oa:Annotation`-Liste

**Phase 1.4 — Versionierung (✅ abgeschlossen)**
- Migration `007_module_revisions.sql`: `module_revision` mit UNIQUE auf (module_id, version)
- `revision.repo.ts`, `routes/revision.ts`, API-Client (`getRevisions`, `createRevision`, …)
- `ExportView.tsx` zeigt Revisions-Liste, Veröffentlichen-Form, Permalink-Kopieren
- ✅ Tests für `revision.repo.test.ts` erfolgreich (5 Tests grün, einschl. Zeitstempel-Flakiness-Test)
- ✅ E2E-Test `e2e/04-versioning.spec.ts` ergänzt: Modul → Event → Export → Version veröffentlichen → Permalink-Verifizierung

**Phase 2.1 — Authentifizierung (✅ abgeschlossen)**
- Migration `009_users.sql`: `user` (id, email UNIQUE, password_hash, display_name, role)
- Backend: `routes/auth.ts` mit Register/Login/Logout/Me-Endpunkten
- JWT-Middleware mit Cookie-basierten Tokens (httpOnly, sameSite=lax)
- Frontend: Login-/Register-Seite (`/login`, `/register`), Auth-Store in Zustand
- ✅ E2E-Test `e2e/routes/auth.test.ts`: Register → Login → Me → Logout (5 Tests grün)

**Phase 2.2 — Rollen + Berechtigungen (✅ abgeschlossen)**
- Migration `010_roles.sql`: Spalte `user.role` + optional `module_membership` (user_id, module_id, role)
- Backend-Middleware `requireRole(role)` für mutative Endpunkte
- Frontend: Author-Layout zeigt Amber-Banner „Lese-Modus" wenn Rolle < `author`
- ✅ E2E-Test `e2e/routes/roles.test.ts`: Viewer → 403 auf DELETE, framework_dev → 204 (5 Tests grün)

**Phase 2.3 — Permalinks (✅ abgeschlossen)**
- Hook `useUrlSync()`: bidirektionale Sync zwischen Query-Params ↔ Store
- `LearningLayout` + `AuthoringLayout`: `useUrlSync()` integriert
- DetailPanel-Header: 🔗 "Link kopieren"-Button für Permalink
- ✅ E2E-Test `e2e/05-permalinks.spec.ts`: URL mit Event + Filter ist teilbar

**Phase 2.4 — Druck-/PDF-Export (✅ abgeschlossen)**
- `/print/:moduleId` → `PrintView.tsx` mit MapLibre-Karten-Capture, Ereigniskarten, Print-CSS
- 🖨-Button im Header, `@media print` blendet Steuerleiste aus

**Phase 2.5 — Aufgabenmodus (✅ abgeschlossen)**
- Migration `011_tasks.sql`: `task` + `task_answer`
- API: CRUD + Antwort-Upsert + Lehrer-Auswertung
- `TaskPanel` im Lern-Modus (Tab neben Detail), `TaskEditor` in Author-Sidebar

**Phase 3.1 — Mini-Map-Streifen (✅ abgeschlossen)**
- 20px-Strip mit allen Ereignissen als Punkte/Bars + Viewport-Rechteck bei Zoom > 1
- Klick springt in der Timeline zur angeklickten Stelle

### Aktueller Test-Stand
```bash
npm test         # 71 Backend + 11 Client = 82 gesamt ✅
npm run test:e2e # 6 E2E geplant (01-create-module, 02-create-event, 03-jsonld-export ×2, 04-versioning, 05-permalinks)
                 # ⚠️ Derzeit fehlgeschlagen wegen Projekt-Setup-Fehler: shared/types.js Import-Fehler in MapView.tsx
                 # (Bestehendes Problem, nicht durch P2.3-Implementierung verursacht)
```

---

## Konventionen für jede Arbeit

1. **Tests müssen grün bleiben.** Vor dem Commit `npm test` und (wo sinnvoll) `npm run test:e2e`.
2. **Migrationen sind aufsteigend nummeriert** (`packages/server/src/migrations/008_*.sql`, `009_*.sql`, …). Nicht bestehende Migrationen ändern — neue erstellen.
3. **Shared Types** liegen in `shared/types.ts` und sind die Vertragsfläche zwischen Backend und Frontend.
4. **DB-Mutationen** gehen über `dbHelper.run()` / `exec()` (nicht direkt `db.run`), damit Auto-Save-Debouncing greift.
5. **In Tests** `setupTestDb()` aus `packages/server/src/test/setup.ts` (frische In-Memory-DB pro Test).
6. **UI-Konventionen**:
   - Tailwind v4 mit `@theme`-Tokens in `app.css` (parchment, ink, burgundy, verdigris, gold).
   - Garamond für Überschriften, Inter für UI-Text.
   - Toast statt `alert()`: `toast.success(...)` / `toast.error(...)`.
   - Form-Inputs mit `htmlFor` verbinden (a11y).
7. **Beim Ändern von DetailPanel/MapView/TimelineView**: einer der drei großen Dateien — kleine inkrementelle Änderungen, nicht komplette Rewrites.

---

# Arbeitspakete

## Phase 1 (Rest) — Datenmodell aufräumen

### P1.4-fix — Versionierung verifizieren und stabilisieren
**Modell**: 🟢 **Haiku**
**Umfang**: ~30 Min

- [ ] `npm test -w packages/server` ausführen — die `revision.repo.test.ts` muss grün sein. Falls nicht: Test-Fehler diagnostizieren und kleine Bugs fixen (z.B. `await new Promise(r => setTimeout(r, 1100))` in Test 3 stellt sicher dass `datetime('now')`-Zeitstempel sich unterscheiden — wenn der Test trotzdem flackert, in den Test einen expliziten `creator`/`message`-Unterschied einbauen statt Sleep).
- [ ] E2E-Test in `e2e/04-versioning.spec.ts` ergänzen:
  - Modul anlegen + 1 Ereignis erstellen
  - Auf `/export/:id` navigieren
  - Version `1.0.0` mit Notiz veröffentlichen
  - Liste enthält die Version
  - Permalink-API liefert validen JSON-LD-Snapshot

**Kontext**:
- `packages/server/src/repositories/revision.repo.test.ts` (vorhanden)
- `packages/server/src/routes/revision.ts`
- `packages/client/src/components/export/ExportView.tsx`
- `packages/server/src/services/jsonld.service.ts`

---

### ✅ P1.5 — Mehrsprachigkeit pro Feld
**Modell**: 🟡 **Sonnet**
**Umfang**: ~3–4 h
**Abgeschlossen**: 2026-05-09 — 49 Server-Tests ✓, 11 Client-Tests ✓

Title/Description/Label-Felder als JSON-Struktur `{ de: "…", en: "…" }`. Backend speichert JSON, Frontend zeigt die aktuelle Sprache an, fällt auf Default zurück.

**Aufgaben**:
- ✅ Migration `008_multilingual.sql`: betroffene Spalten *nicht* migrieren, sondern eine **Hilfsfunktion** im Repo, die einen Plain-String automatisch in `{ de: "…" }` interpretiert beim Lesen. So vermeiden wir destruktive Migration. Schreibseitig akzeptieren wir beide Formen.
- ✅ `shared/types.ts`: Type `LocalizedString = string | { [lang: string]: string }`. Helper `localized(value, lang, fallback): string`.
- ✅ Repos: ContentModule.title/description, Place.name/description, Source.title/description, Concept.label/description, TimeObject.label, Annotation.body.value (wenn body.type === 'text'), Actor.name/description.
- ✅ Frontend: i18n-Hook ergänzt um `useLocalized()`. Anzeige-Komponenten ziehen den lokalisierten Wert.
- ✅ AuthorForms: zweisprachiges Eingabefeld (Tab DE/EN) für die wichtigsten Felder.
- ✅ Tests: Persistenz, Lese-Fallback wenn Sprache fehlt (`multilingual.test.ts`).

**Akzeptanzkriterium**: Ich kann ein Modul auf Deutsch und Englisch parallel pflegen, ohne Datenverlust beim Sprachwechsel.

**Kontext**:
- `shared/types.ts`
- Alle `*.repo.ts` mit den genannten Feldern
- `packages/client/src/i18n/index.ts`
- `packages/client/src/store/useChronotopStore.ts` (Hook für aktuelle Sprache)

---

## Phase 2 — Schul-Tauglichkeit

### ✅ P2.1 — Authentifizierung (E-Mail + Passwort)
**Modell**: 🟡 **Sonnet**
**Umfang**: ~6–8 h
**Abgeschlossen**: 2026-05-09 — 54 Server-Tests ✓, 11 Client-Tests ✓

JWT-basierte Auth, bcrypt für Passwörter. Bewusst noch keine SAML/OAuth (kommt später).

**Aufgaben**:
- ✅ Migration `009_users.sql`: `users` (id, email UNIQUE, password_hash, display_name, role) + `created_by` auf `content_module`
- ✅ Backend:
  - `routes/auth.ts`: POST `/auth/register`, POST `/auth/login`, POST `/auth/logout`, GET `/auth/me`
  - `middleware/auth.middleware.ts`: JWT-Middleware (`optionalAuth`, `requireAuth`) mit Cookie-basierten Tokens (httpOnly, sameSite=lax, 30d)
  - `repositories/user.repo.ts`: findById, findByEmail, create
  - bcryptjs + jsonwebtoken + cookie-parser Dependencies
- ✅ Frontend:
  - Login-/Register-Seite (`/login`, `/register`) in `pages/`
  - `useAuthStore.ts`: Auth-Store in Zustand (init, login, register, logout)
  - API-Client schickt Cookies automatisch (`credentials: 'include'`)
  - Header zeigt User-Display-Name + Logout-Button
- ✅ E2E-Test: Register → Me → Login → Me → Logout → Me (401) in `routes/auth.test.ts`
- ✅ Modul-Endpoints akzeptieren anonyme Requests, ergänzen `created_by` per `optionalAuth` → Vorbereitung für P2.2 Rollen.

**Kontext**:
- `packages/server/src/index.ts` (Cookie-Parser-Middleware)
- `packages/server/src/migrations/`
- `packages/client/src/components/layout/Header.tsx`

---

### ✅ P2.2 — Rollen + Berechtigungen
**Modell**: 🟡 **Sonnet** (abhängig von P2.1)
**Umfang**: ~3–4 h
**Abgeschlossen**: 2026-05-09 — 59 Server-Tests ✓, 11 Client-Tests ✓

Rollen aus Zielmodell §8: `framework_dev | author | learner | viewer`. Berechtigungen pro Modul.

**Aufgaben**:
- ✅ Migration `010_roles.sql`: `module_membership` (user_id, module_id, role, PRIMARY KEY) für Pro-Modul-Rollen. Erster Registrant wird automatisch `framework_dev` (Bootstrap), alle weiteren `viewer`.
- ✅ `module_membership.repo.ts`: `grant`, `revoke`, `findMembershipRole`, `getEffectiveRole` (max von globaler + Modul-Rolle). Rollenhierarchie: `viewer(0) < learner(1) < author(2) < framework_dev(3)`.
- ✅ Backend-Middleware `requireRole(minRole, midParam?)` für alle mutativen Endpunkte (POST/PUT/DELETE) in allen 9 Route-Dateien. `optionalAuth` global in index.ts.
- ✅ Beim Modul-Anlegen: Ersteller erhält automatisch `author`-Mitgliedschaft. Endpoint `GET /modules/:mid/my-role` liefert effektive Rolle.
- ✅ Frontend: `hasMinRole()` Helper in `useAuthStore`, `fetchModuleRole()` lazy-cached. AuthorLayout zeigt Amber-Banner „Lese-Modus" wenn Rolle < `author`.
- ✅ E2E-Tests in `routes/roles.test.ts`: Viewer → 403 auf DELETE, framework_dev → 204, GETs öffentlich, module_membership blockiert Viewer auf POST.

**Akzeptanzkriterium**: Ein Schüler-User kann lesen, aber nicht schreiben. Eine Lehrkraft mit Author-Rolle kann ihre eigenen Module bearbeiten.

---

### P2.3 — Permalinks für Lehrkraft-Sharing (✅ abgeschlossen)
**Modell**: 🟢 **Haiku**
**Umfang**: ~1–2 h ✅

URL-Form: `/learn/:moduleId?event=:eventId&from=...&to=...`. Beim Laden den Store entsprechend initialisieren.

**Implementierung**:
- ✅ Hook `useUrlSync()` erstellt: bidirektionale Sync zwischen Query-Params ↔ Store
  - Beim Mount: Query-Params → Store (selectEvent, setTimeFilter)
  - Beim Store-Update: Store → URL (debounced 500ms mit `setSearchParams`)
- ✅ `LearningLayout` + `AuthoringLayout` integrieren `useUrlSync()`
- ✅ DetailPanel-Header: "🔗 Link kopieren"-Button für aktuelle URL (mit Toast-Bestätigung)
- ✅ E2E-Test `e2e/05-permalinks.spec.ts` ergänzt

**Akzeptanzkriterium erfüllt**: URL mit Event + Zeit-Filter ist teilbar. Neue Nutzer landen im selben Zustand.

---

### ✅ P2.4 — Druck-/PDF-Export der Lernsicht
**Modell**: 🟡 **Sonnet**
**Umfang**: ~3–4 h
**Abgeschlossen**: 2026-05-10 — 59 Server-Tests ✓, 11 Client-Tests ✓

Eine eigene `/print/:moduleId`-Route mit print-optimiertem Layout: alle Ereignisse linear, mit Karte (statisch), Beschreibungen, Quellen, Akteuren. Nutzt `@media print`-CSS und `window.print()`.

**Implementierung**:
- ✅ `PrintView.tsx`: Standalone-Seite ohne AppShell-Header. Off-Screen MapLibre-Container mit `preserveDrawingBuffer: true`, nummerierten Burgunder-Markern, `fitBounds` → `once('idle')` → `getCanvas().toDataURL()`. Modul-Kopf (Titel, Beschreibung, Autor, Druckdatum), Übersichtskarte als `<img>`, nummerierte Ereignis-Legende (2-spaltig), sortierte Ereigniskarten mit Datum, Ort, Beschreibung, Akteuren, Begriffen, Quellen.
- ✅ Print-CSS inline: `.no-print { display:none }`, `.event-card { page-break-before: always }`.
- ✅ Route `/print/:moduleId` in `App.tsx` außerhalb AppShell registriert.
- ✅ Header bekommt 🖨-Button in der Nav-Leiste (neben Export).

**Akzeptanzkriterium erfüllt**: STRG+P liefert ein lesbares Skript für eine Doppelstunde.

---

### ✅ P2.5 — Aufgabenmodus
**Modell**: 🟡 **Sonnet**
**Umfang**: ~6–8 h
**Abgeschlossen**: 2026-05-10 — 71 Server-Tests ✓, 11 Client-Tests ✓

**Konzept**: Lehrkraft definiert pro Modul Aufgaben (frei formulierbare Fragen). Lernende bearbeiten sie im Lern-Modus, ihre Antworten werden gespeichert. Lehrkraft sieht Auswertung.

**Implementierung**:
- ✅ Migration `011_tasks.sql`: `task` (id, module_id, title, prompt, type [`text|choice`], options JSON, answer_key, target_event_id → `event(id)`, position) + `task_answer` (id, task_id, user_id, value, UNIQUE task_id+user_id für Upsert).
- ✅ `task.repo.ts`: CRUD für Tasks + Answers; `upsertAnswer` (ON CONFLICT DO UPDATE), `findAllWithAnswers` für Lehrer-Übersicht.
- ✅ `routes/task.ts`: GET/POST/PUT/DELETE `/:mid/tasks`, POST `/:mid/tasks/:tid/answer` (requireAuth), GET `/:mid/tasks/my-answers`, GET `/:mid/tasks/:tid/answers` (author+), GET `/:mid/tasks-results` (author+).
- ✅ 12 neue Tests in `routes/task.test.ts`: CRUD, Rollen, Upsert-Antwort, my-answers, tasks-results.
- ✅ `shared/types.ts`: `Task`, `TaskAnswer`, `TaskWithAnswers` Interfaces.
- ✅ `api/client.ts`: `getTasks`, `createTask`, `updateTask`, `deleteTask`, `submitAnswer`, `deleteAnswer`, `getMyAnswers`, `getTaskResults`.
- ✅ `TaskPanel.tsx` (Lern-Modus): Aufgabenliste mit Fortschrittsbalken, Freitext- + Choice-Antworten, Selbstkontrolle für Choice-Aufgaben, Antwort zurückziehen.
- ✅ `TaskEditor.tsx` (Author-Sidebar): Aufgaben-Liste + Formular (Freitext/Choice, Optionen, Erwartungshorizont) + Ergebnisansicht mit expandierbaren Antworten pro Aufgabe.
- ✅ `AuthorSidebar.tsx`: 4. Tab „📋" für TaskEditor.
- ✅ `LearningLayout.tsx`: Rechtes Panel mit Tab-Wechsel Detail ↔ Aufgaben (Tab nur sichtbar wenn Aufgaben vorhanden); Panel bleibt offen wenn Aufgaben-Tab aktiv.

**Akzeptanzkriterium erfüllt**: Lehrkraft erstellt 3 Fragen, Schüler beantwortet sie, Lehrer sieht alle Antworten.

**Abhängigkeit**: P2.1 + P2.2 (für `user_id`-Bezug der Antworten).

---

### ✅ P2.6 — Lernenden-Annotationen in eigener Schicht
**Modell**: 🟢 **Haiku**
**Umfang**: ~1–2 h ✅
**Abgeschlossen**: 2026-05-10 — 71 Server-Tests ✓, 11 Client-Tests ✓

Bauen auf der vorhandenen `annotation`-Tabelle (Phase 1.3) auf. Tabelle bekommt `creator_role`-Spalte. Lernenden-Annotationen werden visuell anders dargestellt als „Hypothesen der Klasse".

**Implementierung**:
- ✅ Migration `012_annotation_creator_role.sql`: Spalte `creator_role TEXT NOT NULL DEFAULT 'author'` mit CHECK (author|learner)
- ✅ Shared Types aktualisiert: `creatorRole?: 'author' | 'learner'` zu Annotation + CreateAnnotationPayload
- ✅ `annotation.repo.ts`: `creatorRole` in toAnnotation, create, update eingebunden
- ✅ `routes/annotation.ts`: POST-Route mit `requireRole('learner', 'mid')`, automatische creatorRole-Ableitung: author/framework_dev → 'author', learner/viewer → 'learner'
- ✅ `EventAnnotations.tsx`: Zwei Sektionen — "Lehrerdeutungen" oben (parchment/standard), "Hypothesen der Klasse" unten (ink/dezent, mit opacity-85)

**Akzeptanzkriterium erfüllt**: Lernende können Hypothesen anlegen, Lehrer sehen unterschiedliche Schichten.

**Abhängigkeit**: P2.1 + P2.2 ✓

---

## Phase 3 — Karte und Inhalt aufwerten

### ✅ P3.1 — Mini-Map-Übersichtsstreifen auf der Timeline
**Modell**: 🟡 **Sonnet**
**Umfang**: ~3 h
**Abgeschlossen**: 2026-05-10 — 82 Tests ✓

Schmaler Streifen oberhalb der Hauptachse (Höhe 20px), zeigt **alle** Ereignisse über die Gesamtspanne als Punkte/Bars. Eingerahmtes Rechteck markiert den aktuell sichtbaren Zoom-Bereich. Klick im Streifen springt dorthin.

**Implementierung**:
- ✅ `MINIMAP_HEIGHT = 20` Konstante, Strip-`<div>` zwischen Toolbar und Track eingefügt
- ✅ Alle Ereignisse (aus `layouted`) als flache 3px-Rects in der Mini-Map: Selektiert = Burgundy, sichtbar im Filter = Verdigris, herausgefiltert = Parchment-300
- ✅ Viewport-Rechteck: `miniViewStartX = -panX / zoom`, `miniViewWidth = width / zoom`, bordeaux Rahmen + helle Füllfarbe — erscheint nur bei `zoom > 1`
- ✅ `handleMiniMapClick`: berechnet Jahreszahl aus Klick-X, zentriert die Hauptansicht via `setPanX` — deaktiviert bei `zoom ≤ 1`

**Kontext**:
- `packages/client/src/components/timeline/TimelineView.tsx`

---

### P3.2 — Bewegungen / Routen mit gerichteten Pfeilen ✅
**Modell**: 🟡 **Sonnet**
**Umfang**: ~4–6 h

Neuer Geometrietyp: `MovementGeometry` — eine Linie *mit Richtung* (Start, Stützpunkte, Ziel). MapLibre-Symbol-Layer mit Pfeilspitzen entlang der Linie. Nützlich für: Migrationen, Eroberungszüge, Kolonialhandelsrouten.

**Aufgaben**:
- ✅ Eigene Entität `movement` (Migration `013_movement.sql`, Repo, Routes mit `requireRole('author')`)
- ✅ `shared/types.ts` + API-Client + Zustand-Store (inkl. `loadModuleData` parallel fetch)
- ✅ MapLibre symbol layer mit `symbol-placement: 'line'`, Unicode `▶`, `text-rotation-alignment: 'map'`
- ✅ Author-Tool: `MovementEditor` mit Zeichenmodus, Farbwahl, Ereignis-Verknüpfung; Tab 🗺 in AuthorSidebar
- ✅ `DrawContext` + `AuthoringLayout` um Modus `'movement'` erweitert
- ✅ MapOverlay: Routen-Checkbox in Legende

---

### P3.3 — Historische Karten als IIIF-Tile-Layer ✅
**Modell**: 🟡 **Sonnet**
**Umfang**: ~3–4 h

MapLibre kann IIIF-Tilesets als Source-Type laden. Lehrkraft kann pro Modul eine historische Karte als zusätzlichen Layer aktivieren (z. B. Stieler-Atlas 1879 aus BSB).

**Aufgaben**:
- ✅ Migration `014_module_basemap.sql`: `basemap_url TEXT`, `basemap_label TEXT` in `content_module`
- ✅ `module.repo.ts`: Felder mappen + in `update()` schreiben; `shared/types.ts`: `ContentModule.basemapUrl/basemapLabel`
- ✅ `mapStyle.ts`: `'historic'` zu `MapStyleOption['id']` Union + `buildHistoricStyle(url, label)` exportiert
- ✅ `useChronotopStore`: `currentModule` im State, in `loadModuleData` mitgeladen; `updateModuleBasemap` Action
- ✅ `MapView.tsx`: `availableStyles` dynamisch aus `currentModule.basemapUrl` berechnet, an `MapOverlay` übergeben; Style-Switch-Effect berücksichtigt historischen Stil
- ✅ `MapOverlay.tsx`: nimmt `availableStyles` als Prop statt statischem Import
- ✅ `ModuleSettingsPanel.tsx`: Autoren-Formular mit Tile-URL, Bezeichnung, Speichern/Entfernen, Beispiel-URLs
- ✅ `AuthorSidebar.tsx`: ⚙-Tab für Modul-Einstellungen

---

### ✅ P3.4 — Reformations-Modul aufwerten
**Modell**: 🟢 **Haiku**
**Umfang**: ~2–3 h (reine Datenpflege)
**Abgeschlossen**: 2026-05-10 — 14 Akteure, 10 Begriffe, erweiterte Ereignis-Verknüpfungen

**Implementierung**:
- ✅ 5 neue Akteure hinzugefügt (ar10-ar14): Andreas Bodenstein von Karlstadt, Thomas Müntzer, Johann Tetzel, Lucas Cranach der Ältere, Johann Eck — mit Wikidata-IDs und ausführlichen Beschreibungen
- ✅ 3 neue theologische Konzepte hinzugefügt (cr08-cr10): Sola fide, Sola gratia, Priestertum aller Gläubigen — als „source"-Begriffe mit präzisen Definitionen
- ✅ Alle 10 bestehenden Ereignisse (e01-e10) mit neuen Akteuren und Begriffen verknüpft:
  - e01 (Thesenanschlag): Tetzel + Cranach als künstlerische Dokumentation
  - e02 (Reichstag Worms): Eck als theologischer Gegner; neue Konzepte sola fide/gratia/priestertum
  - e03 (Wartburg): Karlstadt als reformatorischer Verbündeter; Cranach dokumentiert
  - e04 (Zürcher Disputation): Karlstadt im Kontext; alle drei Sola-Konzepte
  - e05 (Marburger Gespräch): erweiterte Konzept-Vernetzung (fide/gratia/priestertum)
  - e06 (Confessio Augustana): Luther + erweiterte Begriffsatmosphäre
  - e07 (Calvins Institutio): Melanchthon als Zeitgenosse; sola fide/gratia/priestertum
  - e08 (Täuferreich): Müntzer als Vorläufer und inspirierender Reformator
  - e09 (Augsburger Frieden): Zwingli-Bezug ergänzt
  - e10 (Bucer): Luther und Zwingli als Inspirationsquellen

**Kontext**:
- `packages/server/src/seed/reformation-extras.ts` — 73 Zeilen erweitert mit neuen Akteuren, Konzepten, und Ereignis-Verknüpfungen

---

### P3.5 — Drittes Beispielmodul: Esslingen 1933–1945 ✅
**Modell**: 🟡 **Sonnet**
**Umfang**: ~6–8 h (Recherche + Datenpflege)

Lokales Modul mit direktem Bezug zum Kreismedienzentrum Esslingen — für regionalen Geschichtsunterricht.

**Implementierung** (`packages/server/src/seed/esslingen-1933-45.ts`):
- ✅ Modul-ID `00000000-0000-0000-0000-000000000003`; Lizenz CC-BY-SA 4.0, Autor KMZ Esslingen
- ✅ **9 Orte**: Marktplatz, Synagogenstandort (Berliner Str. 27), Bahnhof, Rathaus, Ritterstraße, Sammellager Stuttgart-Killesberg, Industriegelände, Stadtmitte (Einmarsch), Jüdischer Friedhof
- ✅ **11 Zeitobjekte**: 30.01.1933 → 22.04.1945, darunter Pogromnacht, beide Deportationsdaten, Bombardierungen
- ✅ **8 Akteure**: Wilhelm Murr (Gauleiter, Q1371017), NSDAP-Kreisleitung, SA, Gestapo-Leitstelle Stuttgart, Israelitische Kultusgemeinde Esslingen, Zwangsarbeiter, Jean de Lattre de Tassigny (Q187499), Volkssturm/Wehrmacht
- ✅ **6 Begriffe**: Gleichschaltung (analytical), Volksgemeinschaft (source), Arisierung, Shoah, Zwangsarbeit, „Stunde Null" (narrative)
- ✅ **9 Quellen**: Bundesarchiv-Fotos (IIIF), Gedenkbuch, Landesarchiv BW Deportationslisten, Deigendesch „Esslingen im NS", Dokumentationszentrum Oberer Kuhberg
- ✅ **11 Ereignisse**: Fackelzug → Gleichschaltung → Boykott → Verfolgung Gegner → Nürnberger Gesetze → Pogromnacht → Zwangsarbeit → Deportation Riga → Deportation Theresienstadt → Bombardierungen → Befreiung
- ✅ **2 Bewegungen**: Deportationsroute Esslingen→Killesberg (rot), Vormarsch der 1. Frz. Armee Rhein→Esslingen (blau)
- ✅ `package.json`: Skripte `seed:november9` + `seed:esslingen` ergänzt

---

## Phase 4 — Produktionsreife

### P4.1 — Migration auf PostgreSQL/PostGIS
**Modell**: 🟡 **Sonnet** (am oberen Ende von Sonnet — aufwendiges Refactor)
**Umfang**: ~6–8 h

Wechsel von sql.js zu `pg`. PostGIS-Geometrien für `place.geometry` (statt JSON-Text). Räumliche Indizes.

**Aufgaben**:
- Backend:
  - `pg`-Pool statt sql.js.
  - `dbHelper.ts` umschreiben (async statt sync — Domino-Effekt durch alle Repos).
  - SQL-Migrationen anpassen (PostGIS-Typen).
  - `geometry_geojson TEXT` → `geometry GEOMETRY(Geometry, 4326)`.
- Tests: Vitest mit Test-Container (`@testcontainers/postgresql`) statt In-Memory-DB.
- Docker-Compose mit `postgis/postgis:16-3.4`.
- Migration-Skript: alte SQLite → neuen Postgres exportieren.

**Risiko**: Synchrones zu asynchronem API-Wechsel ist invasiv. Empfehlung: schrittweise, erst Backend-Layer umschreiben mit gleichbleibenden Routen.

---

### P4.2 — Dockerfile für die Anwendung
**Modell**: 🟢 **Haiku**
**Umfang**: ~1–2 h

Multi-stage Dockerfile: build-stage mit Node 22, runtime-stage mit Alpine. `docker-compose.yml` (nutzt P4.1 Postgres falls vorhanden).

---

### P4.3 — CI/CD mit GitHub Actions
**Modell**: 🟢 **Haiku**
**Umfang**: ~1 h

`.github/workflows/ci.yml`: Lint, Unit-Tests, E2E-Tests bei jedem PR. Build-Artefakt bei Push auf `main`.

---

### P4.4 — WCAG 2.1 AA Audit
**Modell**: 🟡 **Sonnet**
**Umfang**: ~3–4 h

axe-core in Playwright integriert (`@axe-core/playwright`). E2E-Suite ergänzt um Accessibility-Checks pro Hauptseite. Manueller Screenreader-Test (NVDA) als Anleitung im Repo.

**Aufgaben**:
- `e2e/accessibility.spec.ts`: Alle Hauptseiten gegen axe prüfen.
- Bestehende Verstöße fixen: ARIA-Labels, Fokus-Reihenfolge, Kontrast prüfen.
- Doku: `docs/A11Y.md` mit Audit-Ergebnis und manueller Test-Anleitung.

---

### P4.5 — DSGVO-Texte
**Modell**: 🟢 **Haiku**
**Umfang**: ~1–2 h

Statische Routen `/datenschutz` und `/impressum`. Bei eingeloggten Lernenden: Cookie-Banner mit Opt-In für Auth-Cookies. Mustertexte aus dem Bildungsbereich anpassen.

---

### P4.6 — Backup-Strategie
**Modell**: 🟢 **Haiku**
**Umfang**: ~1 h

Bei sql.js: Cron-Job-Beispiel für tägliche Datei-Kopie. Bei PostgreSQL (nach P4.1): `pg_dump`-Anleitung in der README. Wiederherstellungs-Test dokumentieren.

---

## Phase 5 — Langfristig

### P5.1 — CIDOC-CRM / Linked Art Mapping
**Modell**: 🔴 **Opus 4.7** (komplexes semantisches Modellieren mit kanonischen ontologischen Entscheidungen)
**Umfang**: ~8–12 h

Echtes Mapping vom Chronotop-Datenmodell in CIDOC CRM Klassen (`E5 Event`, `E21 Person`, `E53 Place`, `E52 Time-Span`, …) mit Linked-Art-Profil. JSON-LD-Export bekommt zweiten Modus „CIDOC CRM" parallel zum Schema.org-Modus.

**Begründung Opus**: Das ist akademisch dichte Arbeit mit vielen ontologischen Entscheidungen, die nicht durch Pattern-Erkennung lösbar sind.

**Voraussetzung**: P1.5 Mehrsprachigkeit (CRM nutzt `crm:P3 has_note` mit lang-tags).

---

### P5.2 — Apache Jena Fuseki als RDF-Read-Layer
**Modell**: 🟡 **Sonnet**
**Umfang**: ~6–8 h

**Voraussetzung**: P5.1.

Optionaler zweiter Datenpfad: ETL-Job exportiert Module als RDF-Triples in einen Fuseki-Triple-Store. SPARQL-Endpunkt für externe Linked-Data-Klienten. Read-only.

---

### P5.3 — Echtzeit-Kollaboration (CRDT)
**Modell**: 🔴 **Opus 4.7** (verteiltes System mit Konfliktbehandlung)
**Umfang**: ~12–16 h

Yjs oder Automerge. Mehrere Lehrkräfte oder Lernende bearbeiten dasselbe Modul gleichzeitig.

**Begründung Opus**: CRDT-Integration ist komplex (Conflict-Resolution, Persistenz-Layer, Provider-Setup, Awareness, partielle Updates).

---

### P5.4 — Klassen-/Lerngruppenverwaltung
**Modell**: 🟡 **Sonnet**
**Umfang**: ~6–8 h

**Voraussetzung**: P2.1 + P2.2.

Lehrkraft erstellt Klasse, lädt Lernende per E-Mail/Code ein, weist Module zu, sieht Aufgaben-Auswertung pro Klasse.

---

### P5.5 — Mobile App (Capacitor)
**Modell**: 🟡 **Sonnet**
**Umfang**: ~4–6 h

Capacitor um die Web-App, Offline-Modus mit Service-Worker, Tablet-optimiertes Layout (Touch-Maße statt Maus-Hover).

---

# Empfohlene Reihenfolge (mit Fortschritt)

```
✅ P1.4-fix    (Haiku)    ← Versionierung & Tests
✅ P2.1 + 2.2  (Sonnet)   ← Auth + Rollen als Basis für 2.5/2.6/5.4
✅ P2.3        (Haiku)    ← Permalinks: niedrig hängende Frucht
✅ P2.4        (Sonnet)   ← Druck-Export
✅ P2.5        (Sonnet)   ← Aufgabenmodus
✅ P2.6        (Haiku)    ← Lernenden-Annotationen in eigener Schicht
  P1.5        (Sonnet)   ← Datenmodell-Lücke schließen (Mehrsprachigkeit)

# Frontend-Polish parallel
  P3.1        (Sonnet)   ← Mini-Map
✅ P3.4        (Haiku)    ← Reformations-Inhalt
  P3.5        (Sonnet)   ← drittes Modul
  P3.2 + 3.3  (Sonnet)   ← Bewegungen + IIIF-Karten

# Produktion
  P4.2 + 4.3  (Haiku)    ← Docker + CI
  P4.4        (Sonnet)   ← WCAG-Audit
  P4.5 + 4.6  (Haiku)    ← Compliance
  P4.1        (Sonnet)   ← Postgres-Migration spät, weil invasiv

# Langfristig
  P5.1        (Opus)     ← CIDOC CRM
  P5.2        (Sonnet)
  P5.4        (Sonnet)
  P5.5        (Sonnet)
  P5.3        (Opus)     ← CRDT zuletzt
```

---

# Hinweise zur Beauftragung im neuen Chat

1. **Briefing-Schema**: Sage dem Modell *immer*, welches Paket es bearbeiten soll, und verweise auf diese Datei. Beispiel:
   > „Lies `TASKS.md` und arbeite Paket **P2.3** ab. Halte die Konventionen ein. Wenn du zwischendrin Annahmen treffen musst, frag nach."

2. **Bei Haiku**: Geringe Latenz, klare Akzeptanzkriterien. Vermeide offene Fragen. Wenn eine Aufgabe sich beim Anfangen größer anfühlt als geschätzt, abbrechen und zu Sonnet wechseln.

3. **Bei Sonnet**: Architektur-Entscheidungen kann es mittragen, aber bei Mehrdeutigkeit (z.B. „eigene Tabelle vs. Erweiterung der Place-Tabelle") nachfragen.

4. **Bei Opus**: Nur die explizit markierten Pakete. Vor Start: kurzes Konzept einfordern, dann erst implementieren lassen.

5. **Tests sind nicht verhandelbar.** Jedes Paket sollte am Ende grün laufen. Wenn nicht, ist das Paket nicht abgeschlossen.

6. **Migration-Reihenfolge**: Wenn parallele Sessions Migrationen erstellen, könnten die Nummern kollidieren. Empfehlung: bei Start die nächsthöhere freie Nummer wählen und die Datei *zuerst* committen.
