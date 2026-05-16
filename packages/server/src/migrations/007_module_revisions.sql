-- Versionierung kuratierter Inhaltsmodule (Zielmodell §8: zitierfähige Versionen).
--
-- Idee: Eine Revision wird *explizit* erzeugt, wenn die Lehrkraft den Modul-Stand
-- zitierfähig festschreiben möchte. Der Snapshot enthält das vollständige Modul
-- in JSON-LD-Form. Frühere Revisionen bleiben über ihre ID zitier- und abrufbar.
--
-- Versionsstring folgt SemVer-light (z.B. „0.1.0", „1.0.0"). Beim Erzeugen einer
-- Revision wird optional eine Beschreibung („Was hat sich geändert?") mitgegeben.

CREATE TABLE IF NOT EXISTS module_revision (
  id           TEXT PRIMARY KEY,
  module_id    TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  version      TEXT NOT NULL,
  -- Vollständiger Snapshot des Moduls als JSON (genau das, was der JSON-LD-Export liefert).
  snapshot     TEXT NOT NULL,
  -- Optionale Notiz: was sich gegenüber der vorherigen Revision geändert hat.
  message      TEXT,
  -- Wer hat die Revision erstellt? (frei, später User-System)
  creator      TEXT,
  created_at   TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_module_revision_module ON module_revision(module_id, created_at DESC);

-- Pro (module_id, version) nur eine Revision: doppelte Versionsnummern verhindern
CREATE UNIQUE INDEX IF NOT EXISTS uq_module_revision_version ON module_revision(module_id, version);
