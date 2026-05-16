import { useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { Concept, ConceptKind } from '@chronotop/shared';

const kindMeta: Record<ConceptKind, { label: string; color: string; tooltip: string }> = {
  analytical: { label: 'Analyse', color: 'bg-verdigris-50 text-verdigris-600 border-verdigris-200',
    tooltip: 'Moderne, historiografische Kategorie' },
  source: { label: 'Quelle', color: 'bg-gold-50 text-gold-600 border-gold-200',
    tooltip: 'Zeitgenössisch in den Quellen verwendeter Begriff' },
  narrative: { label: 'Narrativ', color: 'bg-burgundy-50 text-burgundy-600 border-burgundy-200',
    tooltip: 'Spätere Deutung oder Erinnerungskultur' },
};

export function ConceptList() {
  const loc = useLocalized();
  const concepts = useChronotopStore(s => s.concepts);
  const events = useChronotopStore(s => s.events);
  const createConcept = useChronotopStore(s => s.createConcept);
  const deleteConcept = useChronotopStore(s => s.deleteConcept);

  const [showForm, setShowForm] = useState(false);
  const [kind, setKind] = useState<ConceptKind>('analytical');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const eventCount = (cid: string) =>
    events.filter(e => e.concepts?.some(c => c.id === cid)).length;

  const reset = () => { setLabel(''); setDescription(''); setShowForm(false); };

  const handleCreate = async () => {
    if (!label) return;
    await createConcept({ kind, label, description: description || undefined });
    reset();
  };

  const handleDelete = async (concept: Concept) => {
    const usage = eventCount(concept.id);
    const conceptLabel = loc(concept.label);
    const msg = usage > 0
      ? `„${conceptLabel}" ist mit ${usage} Ereignis${usage === 1 ? '' : 'sen'} verknüpft. Wirklich löschen?`
      : `„${conceptLabel}" wirklich löschen?`;
    if (confirm(msg)) {
      await deleteConcept(concept.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-parchment-200 bg-parchment-50 shrink-0">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full bg-burgundy-500 hover:bg-burgundy-600 text-white px-4 py-2.5 rounded-md font-medium transition-colors shadow-sm">
          + Neuer Begriff
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {showForm && (
          <div className="bg-parchment-50 p-3 rounded border border-parchment-200 space-y-2">
            <div className="flex gap-1 text-xs">
              {(['analytical', 'source', 'narrative'] as ConceptKind[]).map(k => {
                const m = kindMeta[k];
                return (
                  <button key={k} onClick={() => setKind(k)} title={m.tooltip}
                    className={`px-2 py-1 rounded ${kind === k ? 'bg-burgundy-500 text-white' : 'bg-white border border-parchment-300'}`}>
                    {m.label}
                  </button>
                );
              })}
            </div>
            <input type="text" value={label} onChange={e => setLabel(e.target.value)}
              placeholder="Bezeichnung" className="w-full input" autoFocus />
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Definition / Erläuterung (optional)" className="w-full input h-16 resize-none" />
            <p className="text-[10px] text-ink-400 italic">{kindMeta[kind].tooltip}</p>
            <div className="flex gap-2">
              <button onClick={handleCreate} disabled={!label}
                className="flex-1 bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-40 text-white px-3 py-1.5 rounded text-sm">
                Anlegen
              </button>
              <button onClick={reset}
                className="px-3 py-1.5 border border-parchment-300 rounded text-sm text-ink-600 hover:bg-white">
                Abbruch
              </button>
            </div>
          </div>
        )}

        {concepts.length === 0 && !showForm && (
          <div className="text-center py-12 text-ink-300">
            <div className="text-3xl mb-2 opacity-40">🕸</div>
            <p className="text-sm italic">Noch keine Begriffe angelegt.</p>
          </div>
        )}

        {concepts.map(concept => {
          const m = kindMeta[concept.kind];
          const count = eventCount(concept.id);
          return (
            <article key={concept.id}
              className="group border border-parchment-200 bg-white rounded-md p-3 hover:bg-parchment-50 transition-colors">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-serif font-semibold text-ink-700 leading-tight text-sm">
                      {loc(concept.label)}
                    </h4>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${m.color}`}>
                      {m.label}
                    </span>
                  </div>
                  {loc(concept.description) && (
                    <p className="text-xs text-ink-500 mt-1.5 leading-relaxed line-clamp-3">
                      {loc(concept.description)}
                    </p>
                  )}
                  <div className="text-[10px] text-verdigris-600 mt-1">
                    {count > 0 ? `${count} Ereignis${count === 1 ? '' : 'se'}` : 'noch keinen Ereignissen zugeordnet'}
                  </div>
                </div>
                <button onClick={() => handleDelete(concept)}
                  className="opacity-0 group-hover:opacity-100 text-[11px] px-1.5 py-0.5 text-ink-500 hover:text-burgundy-700 bg-white border border-parchment-200 rounded hover:bg-burgundy-50"
                  aria-label="Löschen">✕</button>
              </div>
            </article>
          );
        })}
      </div>

      {concepts.length > 0 && (
        <div className="px-4 py-2 border-t border-parchment-200 bg-parchment-50 text-[11px] text-ink-400 italic shrink-0">
          {concepts.length} Begriff{concepts.length === 1 ? '' : 'e'}
        </div>
      )}
    </div>
  );
}
