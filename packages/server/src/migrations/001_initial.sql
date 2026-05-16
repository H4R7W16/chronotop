-- Chronotop MVP Schema

CREATE TABLE IF NOT EXISTS content_module (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL,
  version     TEXT NOT NULL DEFAULT '0.1.0',
  license     TEXT NOT NULL DEFAULT 'CC-BY-SA 4.0',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS place (
  id          TEXT PRIMARY KEY,
  module_id   TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  wikidata_id TEXT,
  lat         REAL NOT NULL,
  lng         REAL NOT NULL,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_object (
  id          TEXT PRIMARY KEY,
  module_id   TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('instant', 'span')),
  date        TEXT,
  start_date  TEXT,
  end_date    TEXT,
  certainty   TEXT NOT NULL DEFAULT 'certain'
                CHECK (certainty IN ('certain', 'probable', 'contested', 'reconstructed')),
  label       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (
    (type = 'instant' AND date IS NOT NULL) OR
    (type = 'span' AND start_date IS NOT NULL AND end_date IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS source (
  id                TEXT PRIMARY KEY,
  module_id         TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  type              TEXT NOT NULL,
  title             TEXT NOT NULL,
  iiif_manifest_url TEXT,
  iiif_image_url    TEXT,
  url               TEXT,
  license           TEXT NOT NULL DEFAULT 'CC-BY-SA 4.0',
  description       TEXT,
  created_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event (
  id              TEXT PRIMARY KEY,
  module_id       TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL DEFAULT '',
  place_id        TEXT NOT NULL REFERENCES place(id),
  time_object_id  TEXT NOT NULL REFERENCES time_object(id),
  follows_id      TEXT REFERENCES event(id),
  part_of_id      TEXT REFERENCES event(id),
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS event_source (
  event_id  TEXT NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  source_id TEXT NOT NULL REFERENCES source(id) ON DELETE CASCADE,
  PRIMARY KEY (event_id, source_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_place_module ON place(module_id);
CREATE INDEX IF NOT EXISTS idx_place_coords ON place(lat, lng);
CREATE INDEX IF NOT EXISTS idx_time_object_module ON time_object(module_id);
CREATE INDEX IF NOT EXISTS idx_source_module ON source(module_id);
CREATE INDEX IF NOT EXISTS idx_event_module ON event(module_id);
CREATE INDEX IF NOT EXISTS idx_event_place ON event(place_id);
CREATE INDEX IF NOT EXISTS idx_event_time ON event(time_object_id);
