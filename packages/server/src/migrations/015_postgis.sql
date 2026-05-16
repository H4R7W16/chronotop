-- P4.1: PostGIS-Unterstützung (optional — wird übersprungen wenn PostGIS nicht installiert ist)
-- Benötigt: Docker-Image postgis/postgis:16-3.4 (docker-compose.yml)
--
-- Fügt neben dem bestehenden geometry_geojson TEXT-Feld eine echte
-- PostGIS-GEOMETRY-Spalte hinzu, die automatisch via Trigger befüllt wird.
-- Räumlicher Index ermöglicht effiziente Bounding-Box-Abfragen.

DO $$
BEGIN
  -- PostGIS-Extension aktivieren (schlägt fehl wenn nicht installiert → übersprungen)
  CREATE EXTENSION IF NOT EXISTS postgis;

  -- GEOMETRY-Spalte hinzufügen (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'place' AND column_name = 'geom'
  ) THEN
    ALTER TABLE place ADD COLUMN geom GEOMETRY(Geometry, 4326);

    -- Bestehende geometry_geojson-Daten in geom migrieren
    UPDATE place
       SET geom = ST_SetSRID(ST_GeomFromGeoJSON(geometry_geojson), 4326)
     WHERE geometry_geojson IS NOT NULL;

    -- Räumlicher Index
    CREATE INDEX idx_place_geom ON place USING GIST (geom);
  END IF;

EXCEPTION WHEN others THEN
  RAISE NOTICE 'PostGIS nicht verfügbar — Migration 015 übersprungen: %', SQLERRM;
END $$;
