-- Migration 008: Mehrsprachigkeit pro Feld
--
-- Es werden KEINE Spalten geändert. Text-Spalten speichern ab jetzt entweder
-- einen Plain-String (Deutsch, rückwärts-kompatibel) oder ein JSON-Objekt
-- der Form {"de":"…","en":"…"}. Die Repos lesen/schreiben beide Formate.
-- Eine echte Spalten-Migration ist nicht nötig, weil SQLite TEXT beide Formen
-- ohne Schema-Änderung hält.

SELECT 1; -- Platzhalter, damit die Migration-Tabelle den Eintrag registriert
