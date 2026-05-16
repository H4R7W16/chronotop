-- Unsicherheit als integraler Bestandteil jeder Aussage (Zielmodell §3.1).
-- certainty: sicher / wahrscheinlich / umstritten / rekonstruiert
-- source_of_claim: optional FK auf eine Quelle, die die Aussage belegt

-- Place (Ort)
ALTER TABLE place ADD COLUMN certainty TEXT NOT NULL DEFAULT 'certain'
  CHECK (certainty IN ('certain','probable','contested','reconstructed'));
ALTER TABLE place ADD COLUMN source_of_claim TEXT REFERENCES source(id);

-- Actor (Akteur)
ALTER TABLE actor ADD COLUMN certainty TEXT NOT NULL DEFAULT 'certain'
  CHECK (certainty IN ('certain','probable','contested','reconstructed'));
ALTER TABLE actor ADD COLUMN source_of_claim TEXT REFERENCES source(id);

-- Verknüpfung Ereignis ↔ Akteur (z.B. „X war Anstifter" — die Rolle selbst kann umstritten sein)
ALTER TABLE event_actor ADD COLUMN certainty TEXT NOT NULL DEFAULT 'certain'
  CHECK (certainty IN ('certain','probable','contested','reconstructed'));
ALTER TABLE event_actor ADD COLUMN source_of_claim TEXT REFERENCES source(id);
