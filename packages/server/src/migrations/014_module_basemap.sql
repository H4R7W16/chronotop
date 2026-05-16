-- P3.3: Historische Karte (IIIF / XYZ-Tile) pro Modul
ALTER TABLE content_module ADD COLUMN basemap_url   TEXT DEFAULT NULL;
ALTER TABLE content_module ADD COLUMN basemap_label TEXT DEFAULT NULL;
