-- Akteure (Personen, Gruppen, Institutionen)
CREATE TABLE IF NOT EXISTS actor (
  id          TEXT PRIMARY KEY,
  module_id   TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('person', 'group', 'institution')),
  name        TEXT NOT NULL,
  wikidata_id TEXT,
  gnd_id      TEXT,
  description TEXT,
  birth_date  TEXT,
  death_date  TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_actor_module ON actor(module_id);

-- Begriffe (Analytisch, Quelle, Narrativ)
CREATE TABLE IF NOT EXISTS concept (
  id          TEXT PRIMARY KEY,
  module_id   TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('analytical', 'source', 'narrative')),
  label       TEXT NOT NULL,
  description TEXT,
  wikidata_id TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_concept_module ON concept(module_id);

-- Junction: Ereignis ↔ Akteur (mit Rolle)
CREATE TABLE IF NOT EXISTS event_actor (
  event_id TEXT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  actor_id TEXT NOT NULL REFERENCES actor(id) ON DELETE CASCADE,
  role     TEXT,
  PRIMARY KEY (event_id, actor_id)
);

-- Junction: Ereignis ↔ Begriff
CREATE TABLE IF NOT EXISTS event_concept (
  event_id   TEXT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL REFERENCES concept(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, concept_id)
);
