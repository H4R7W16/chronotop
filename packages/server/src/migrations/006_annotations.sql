-- W3C Web Annotation Data Model (https://www.w3.org/TR/annotation-model/)
-- Trennung Fakt vs. Deutung: faktische Relationen sind Spalten/Junction-Tabellen
-- (z.B. event.follows_id), interpretative Annotationen leben hier.
--
-- Eine Annotation ist eine Aussage über eine oder mehrere Entitäten.
-- Beispiele:
--   - "Dieses Ereignis wird in der heutigen Forschung als Beginn der Reformation gedeutet"
--     motivation: commenting, target: [event/e01], body: { type: 'TextualBody', value: '...' }
--   - "Diese beiden Ereignisse werden kontrastiert"
--     motivation: linking, target: [event/e02, event/e03], body: { type: 'TextualBody', value: 'Vergleich…' }

CREATE TABLE IF NOT EXISTS annotation (
  id              TEXT PRIMARY KEY,
  module_id       TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  motivation      TEXT NOT NULL CHECK (motivation IN (
                    'commenting',     -- erläutern, einordnen
                    'classifying',    -- als Begriff zuordnen
                    'linking',        -- in Verbindung setzen (Kontrast, Fortwirkung, Interpretation)
                    'tagging',        -- mit Schlagwort versehen
                    'describing',     -- weiter beschreiben
                    'identifying'     -- als bestimmte Sache identifizieren
                  )),
  -- W3C Web Annotation: body kann TextualBody sein (Text), eine Klassifikation (URL),
  -- eine andere Annotation, etc. Wir speichern als JSON.
  body            TEXT NOT NULL,
  -- target: Liste von Selektoren (Event-IDs, Place-IDs, etc.) im JSON-Format
  target          TEXT NOT NULL,
  creator         TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Auch Annotationen sind Aussagen — sie tragen ihre eigene Sicherheit
  certainty       TEXT NOT NULL DEFAULT 'certain'
                  CHECK (certainty IN ('certain','probable','contested','reconstructed')),
  source_of_claim TEXT REFERENCES source(id)
);

CREATE INDEX IF NOT EXISTS idx_annotation_module ON annotation(module_id);
CREATE INDEX IF NOT EXISTS idx_annotation_motivation ON annotation(motivation);
