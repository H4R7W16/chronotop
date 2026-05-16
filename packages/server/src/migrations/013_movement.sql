-- Bewegungen / Routen mit gerichteten Pfeilen
--
-- Eine Bewegung ist eine georeferenzierte Route (Folge von [lng, lat]-Punkten)
-- die einer historischen Bewegung entspricht: Migration, Feldzug, Handelsroute …
-- Sie ist optional mit einem Ereignis verknüpft, braucht aber keinen Punkt-Marker.
--
-- coordinates: JSON-Array [[lng1,lat1],[lng2,lat2],…] (mind. 2 Punkte)
-- color:       CSS-Farbe (Hex) für Linie + Pfeile

CREATE TABLE IF NOT EXISTS movement (
  id          TEXT PRIMARY KEY,
  module_id   TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  event_id    TEXT REFERENCES event(id) ON DELETE SET NULL,
  name        TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  coordinates TEXT NOT NULL,   -- JSON: [[lng,lat],…]
  color       TEXT NOT NULL DEFAULT '#7B2D42',
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_movement_module ON movement(module_id);
CREATE INDEX IF NOT EXISTS idx_movement_event  ON movement(event_id);
