// === Value types ===

/**
 * Ein lokalisierbarer Text. Entweder ein einfacher String (historisch/DE-only)
 * oder ein Objekt `{ de: "…", en: "…" }` für mehrsprachige Inhalte.
 * Lesen immer über `localized(value, lang)`.
 */
export type LocalizedString = string | { [lang: string]: string };

/**
 * Löst einen lokalisierten String auf. Gibt den Wert in `lang` zurück,
 * fällt auf Deutsch zurück, dann auf irgendeinen vorhandenen Wert, dann auf `fallback`.
 */
export function localized(value: LocalizedString, lang: string, fallback = ''): string {
  if (typeof value === 'string') return value || fallback;
  const direct = value[lang];
  if (direct) return direct;
  const de = value['de'];
  if (de) return de;
  return Object.values(value).find(v => v) ?? fallback;
}

export type CertaintyLevel = 'certain' | 'probable' | 'contested' | 'reconstructed';

/**
 * Eine wissenschaftliche Aussage in Chronotop trägt grundsätzlich Sicherheits-Metadaten:
 * Wie gesichert ist sie, und worauf beruht sie? Das macht historische Kontroversen
 * im Datenmodell sichtbar.
 */
export interface UncertaintyMeta {
  certainty: CertaintyLevel;
  /** Optional: Source-ID, die die Aussage belegt. */
  sourceOfClaim?: string;
}

export type SourceType =
  | 'text'
  | 'image'
  | 'map'
  | 'statistics'
  | 'law'
  | 'speech'
  | 'object'
  | 'audio'
  | 'video';

// === Entities ===

export interface ContentModule {
  id: string;
  title: LocalizedString;
  description: LocalizedString;
  authorName: string;
  version: string;
  license: string;
  /** XYZ-Tile-URL für historische Karte, z.B. https://host/{z}/{x}/{y}.png */
  basemapUrl?: string | null;
  /** Anzeigename der historischen Karte (z.B. "Stieler-Atlas 1879") */
  basemapLabel?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// GeoJSON-Geometrie (vereinfacht; nur die für uns relevanten Typen)
export type PlaceGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] };

export interface Place {
  id: string;
  moduleId: string;
  wikidataId?: string;
  lat: number;
  lng: number;
  name: LocalizedString;
  description?: LocalizedString;
  /** Optionale Fläche/Linie. Wenn gesetzt, ergänzt sie den Punkt-Marker. */
  geometry?: PlaceGeometry;
  /**
   * Beginn der historischen Gültigkeit (ISO-Datum YYYY oder YYYY-MM-DD).
   * Beispiel: für „Deutsches Reich (1933–1945)" wäre validFrom = '1933-01-30'.
   * NULL/undefined bedeutet "unbestimmt früh" (immer-existent).
   */
  validFrom?: string;
  /**
   * Ende der historischen Gültigkeit. NULL/undefined = "noch existent" oder
   * "Ende unbekannt".
   */
  validTo?: string;
  /** Sicherheit der Aussage (wie sicher ist diese Verortung/Datierung?). */
  certainty?: CertaintyLevel;
  /** Optional: Source-ID, die die Aussage belegt. */
  sourceOfClaim?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeObject {
  id: string;
  moduleId: string;
  type: 'instant' | 'span';
  date?: string;
  startDate?: string;
  endDate?: string;
  certainty: CertaintyLevel;
  label: LocalizedString;
  createdAt?: string;
  updatedAt?: string;
}

export interface Source {
  id: string;
  moduleId: string;
  type: SourceType;
  title: LocalizedString;
  iiifManifestUrl?: string;
  iiifImageUrl?: string;
  url?: string;
  license: string;
  description?: LocalizedString;
  createdAt?: string;
  updatedAt?: string;
}

export type ActorType = 'person' | 'group' | 'institution';

export interface Actor {
  id: string;
  moduleId: string;
  type: ActorType;
  name: LocalizedString;
  wikidataId?: string;
  gndId?: string;
  description?: LocalizedString;
  birthDate?: string;
  deathDate?: string;
  /** Sicherheit der Aussage (z.B. ob die Identifikation eines anonymen Autors stimmt). */
  certainty?: CertaintyLevel;
  /** Optional: Source-ID, die die Aussage belegt. */
  sourceOfClaim?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type ConceptKind = 'analytical' | 'source' | 'narrative';

export interface Concept {
  id: string;
  moduleId: string;
  kind: ConceptKind;
  label: LocalizedString;
  description?: LocalizedString;
  wikidataId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventActorLink {
  actor: Actor;
  role?: string;
  /** Sicherheit der Rolle (z.B. ob „X war Anstifter" gesichert ist). */
  certainty?: CertaintyLevel;
  /** Optional: Source-ID, die die Rollen-Aussage belegt. */
  sourceOfClaim?: string;
}

export interface Event {
  id: string;
  moduleId: string;
  title: LocalizedString;
  description: LocalizedString;
  placeId: string;
  timeObjectId: string;
  followsId?: string | null;
  partOfId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  // Joined relations (populated on read)
  place?: Place;
  timeObject?: TimeObject;
  sources?: Source[];
  actors?: EventActorLink[];
  concepts?: Concept[];
}

// === API payloads ===

export interface CreateEventPayload {
  title: LocalizedString;
  description: LocalizedString;
  placeId: string;
  timeObjectId: string;
  sourceIds: string[];
  actorIds?: { actorId: string; role?: string; certainty?: CertaintyLevel; sourceOfClaim?: string }[];
  conceptIds?: string[];
  followsId?: string;
  partOfId?: string;
}

// === Annotation (W3C Web Annotation Data Model) ===

export type AnnotationMotivation =
  | 'commenting'
  | 'classifying'
  | 'linking'
  | 'tagging'
  | 'describing'
  | 'identifying';

/**
 * Ein Annotation-Target identifiziert die Entität(en), auf die sich die
 * Annotation bezieht. Wir nutzen ein vereinfachtes Schema: Typ + ID.
 *
 * Beispiele:
 *   { kind: 'event', id: 'e01' }
 *   { kind: 'place', id: 'p9-05' }
 */
export type AnnotationTargetKind = 'event' | 'place' | 'actor' | 'concept' | 'source' | 'time-object';

export interface AnnotationTarget {
  kind: AnnotationTargetKind;
  id: string;
}

/**
 * Annotations-Body. Vereinfachte Darstellung des W3C-Modells:
 * - 'text' für Text-Kommentare (z.B. "Dieses Ereignis wird interpretiert als …")
 * - 'concept' für Klassifikations-Verweise auf Begriff-IDs
 * - 'tag' für freie Schlagworte
 */
export type AnnotationBody =
  | { type: 'text'; value: LocalizedString; format?: 'text/plain' | 'text/markdown' }
  | { type: 'concept'; conceptId: string }
  | { type: 'tag'; value: string };

export interface Annotation {
  id: string;
  moduleId: string;
  motivation: AnnotationMotivation;
  body: AnnotationBody;
  target: AnnotationTarget[];
  creator?: string;
  createdAt?: string;
  updatedAt?: string;
  certainty?: CertaintyLevel;
  sourceOfClaim?: string;
  /** Rolle des Erstellers: 'author' (Lehrkraft), 'learner' (Schüler). Default: 'author'. */
  creatorRole?: 'author' | 'learner';
}

export type CreateAnnotationPayload =
  Pick<Annotation, 'motivation' | 'body' | 'target' | 'creator' | 'certainty' | 'sourceOfClaim' | 'creatorRole'>;

// === Versionierung ===

/**
 * Eine zitierfähige Revision eines Inhaltsmoduls. Wird *explizit* erzeugt,
 * wenn die Lehrkraft eine bestimmte Stand-Version festschreiben möchte
 * (typisch beim Veröffentlichen oder vor einer Aufgabenstellung).
 */
export interface ModuleRevision {
  id: string;
  moduleId: string;
  version: string;
  /** Vollständiger Modul-Snapshot als JSON-LD (genau das, was der Export liefert). */
  snapshot: object;
  message?: string;
  creator?: string;
  createdAt?: string;
}

export type CreateModuleRevisionPayload = Pick<ModuleRevision, 'version' | 'message' | 'creator'>;

export type CreateActorPayload = Pick<Actor,
  'type' | 'name' | 'wikidataId' | 'gndId' | 'description' |
  'birthDate' | 'deathDate' | 'certainty' | 'sourceOfClaim'
>;
export type CreateConceptPayload = Pick<Concept, 'kind' | 'label' | 'description' | 'wikidataId'>;

export interface UpdateEventPayload extends Partial<CreateEventPayload> {}

export type CreateModulePayload = Pick<ContentModule, 'title' | 'description' | 'authorName'>;
export type CreatePlacePayload = Pick<Place,
  'wikidataId' | 'lat' | 'lng' | 'name' | 'description' | 'geometry' |
  'validFrom' | 'validTo' | 'certainty' | 'sourceOfClaim'
>;
export type CreateTimeObjectPayload = Pick<TimeObject, 'type' | 'date' | 'startDate' | 'endDate' | 'certainty' | 'label'>;
export type CreateSourcePayload = Pick<Source, 'type' | 'title' | 'iiifManifestUrl' | 'iiifImageUrl' | 'url' | 'license' | 'description'>;

// === Aufgabenmodus ===

/** Aufgabentyp: Freitext oder Mehrfachauswahl */
export type TaskType = 'text' | 'choice';

/**
 * Eine Aufgabe, die eine Lehrkraft pro Modul definiert.
 * Lernende bearbeiten sie im Lern-Modus; Antworten werden gespeichert.
 */
export interface Task {
  id: string;
  moduleId: string;
  title: string;
  prompt: string;
  type: TaskType;
  /** Auswahloptionen (nur bei type='choice') */
  options: string[];
  /** Musterlösung / Hinweis für die Lehrkraft */
  answerKey: string | null;
  /** Optionaler Bezug zu einem konkreten Ereignis */
  targetEventId: string | null;
  position: number;
  createdAt?: string;
}

/** Antwort eines Lernenden auf eine Aufgabe */
export interface TaskAnswer {
  id: string;
  taskId: string;
  userId: string;
  value: string;
  submittedAt: string;
}

/** Aufgabe mit allen eingesammelten Antworten (Lehrer-Auswertung) */
export interface TaskWithAnswers extends Task {
  answers: TaskAnswer[];
}

export type CreateTaskPayload = Pick<Task, 'title' | 'prompt' | 'type' | 'options' | 'answerKey' | 'targetEventId' | 'position'>;
export type UpdateTaskPayload = Partial<CreateTaskPayload>;

// === Bewegungen / Routen ===

/**
 * Eine historische Bewegung: Migration, Feldzug, Handelsroute …
 * Wird als gerichtete Linie auf der Karte dargestellt (Pfeile entlang der Route).
 * Ist optional mit einem Ereignis verknüpft, braucht aber keinen Punkt-Marker.
 */
export interface Movement {
  id: string;
  moduleId: string;
  /** Optionale Verknüpfung mit einem Ereignis */
  eventId: string | null;
  name: string;
  description: string;
  /** GeoJSON-Koordinaten [[lng, lat], …] — mindestens 2 Punkte */
  coordinates: [number, number][];
  /** CSS-Hex-Farbe für Linie + Pfeile */
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CreateMovementPayload = Pick<Movement, 'coordinates' | 'name' | 'description' | 'color' | 'eventId'>;
export type UpdateMovementPayload = Partial<CreateMovementPayload>;
