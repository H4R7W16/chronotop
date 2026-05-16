-- P2.6: Lernenden-Annotationen in eigener Schicht
-- Annotationen erhalten die Rolle des Erstellers (author oder learner),
-- damit sie visuell und inhaltlich getrennt werden können.

ALTER TABLE annotation ADD COLUMN creator_role TEXT NOT NULL DEFAULT 'author'
  CHECK (creator_role IN ('author', 'learner'));

-- Index für schnelle Filterung nach Rolle
CREATE INDEX IF NOT EXISTS idx_annotation_creator_role ON annotation(creator_role);
