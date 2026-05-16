-- Zeitliche Gültigkeit eines Ortes als eigenständige Eigenschaft.
-- Beispiel: das Polygon „Deutsches Reich" gilt 1933–1945, die Berliner Mauer
-- als Linie nur 1961–1989. Beide gehören zu Berlin als Punkt-Marker, aber
-- ihre Geometrie ist nur in ihrer historischen Gültigkeit zu zeigen.
--
-- Format: ISO-8601 (YYYY oder YYYY-MM-DD). NULL bedeutet "unbestimmt offen"
-- (z. B. ein Ort, der heute noch existiert hat kein valid_to).
ALTER TABLE place ADD COLUMN valid_from TEXT;
ALTER TABLE place ADD COLUMN valid_to   TEXT;
