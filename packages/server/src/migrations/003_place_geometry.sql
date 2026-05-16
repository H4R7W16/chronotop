-- Optionale GeoJSON-Geometrie zusätzlich zum Punkt:
-- Wenn gesetzt, wird die Fläche/Linie zusätzlich zum Punkt-Marker dargestellt.
-- Erlaubte Typen: 'Polygon', 'MultiPolygon', 'LineString', 'MultiLineString'.
-- Speicherung als kompakter GeoJSON-String (TEXT) zur Wahrung der Einfachheit.
ALTER TABLE place ADD COLUMN geometry_geojson TEXT;
