-- Aufgabenmodus: Aufgaben pro Modul + Schüler-Antworten
--
-- task.type: 'text'   = Freitextantwort
--            'choice' = Mehrfachauswahl (options als JSON-Array)
-- task.answer_key: optionale Musterlösung (für 'choice' die korrekte Option,
--                  für 'text' ein Hinweistext für die Lehrkraft)
-- task.target_event_id: optionale Verlinkung auf ein Ereignis (Aufgaben-Kontext)
-- task.position: Sortierreihenfolge innerhalb des Moduls

CREATE TABLE IF NOT EXISTS task (
  id              TEXT PRIMARY KEY,
  module_id       TEXT NOT NULL REFERENCES content_module(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  prompt          TEXT NOT NULL,
  type            TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text', 'choice')),
  options         TEXT,            -- JSON-Array von Strings (nur bei type='choice')
  answer_key      TEXT,            -- Musterlösung / Hinweis
  target_event_id TEXT REFERENCES event(id) ON DELETE SET NULL,
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Eine Antwort pro User pro Aufgabe (ON CONFLICT → neueste überschreibt)
CREATE TABLE IF NOT EXISTS task_answer (
  id           TEXT PRIMARY KEY,
  task_id      TEXT NOT NULL REFERENCES task(id) ON DELETE CASCADE,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  value        TEXT NOT NULL,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, user_id)
);
