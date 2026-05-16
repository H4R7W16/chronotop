-- Pro-Modul-Rollenmitgliedschaften.
-- Die globale Rolle in users.role gilt als Untergrenze; eine Mitgliedschaft kann
-- die Rolle für ein bestimmtes Modul erhöhen (aber nicht verringern).
CREATE TABLE IF NOT EXISTS module_membership (
  user_id   TEXT NOT NULL REFERENCES users(id)           ON DELETE CASCADE,
  module_id TEXT NOT NULL REFERENCES content_module(id)  ON DELETE CASCADE,
  role      TEXT NOT NULL DEFAULT 'viewer',
  granted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, module_id)
);
