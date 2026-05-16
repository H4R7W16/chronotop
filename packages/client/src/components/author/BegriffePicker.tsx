import { useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { ConceptKind } from '@chronotop/shared';

interface BegriffePickerProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

const conceptKindMeta: Record<ConceptKind, { label: string; tooltip: string; color: string }> = {
  analytical: {
    label: 'Analyse',
    tooltip: 'Moderne, historiografische Kategorie (z. B. „soziale Mobilität")',
    color: 'bg-verdigris-50 text-verdigris-600 border-verdigris-200',
  },
  source: {
    label: 'Quelle',
    tooltip: 'Zeitgenössisch in den Quellen verwendeter Begriff (z. B. „Untertan")',
    color: 'bg-gold-50 text-gold-600 border-gold-200',
  },
  narrative: {
    label: 'Narrativ',
    tooltip: 'Spätere Deutung oder Erinnerungskultur (z. B. „Stunde Null")',
    color: 'bg-burgundy-50 text-burgundy-600 border-burgundy-200',
  },
};

export function BegriffePicker({ selected, onChange }: BegriffePickerProps) {
  const loc = useLocalized();
  const concepts = useChronotopStore(s => s.concepts);
  const createConcept = useChronotopStore(s => s.createConcept);

  const [showNew, setShowNew] = useState(false);
  const [kind, setKind] = useState<ConceptKind>('analytical');
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter(s => s !== id));
    else onChange([...selected, id]);
  };

  const handleCreate = async () => {
    if (!label) return;
    const concept = await createConcept({
      kind, label,
      description: description || undefined,
    });
    onChange([...selected, concept.id]);
    setShowNew(false);
    setLabel(''); setDescription('');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-600">Begriffe</label>

      {concepts.length > 0 && (
        <div className="max-h-40 overflow-y-auto border border-parchment-200 rounded p-2 space-y-1 bg-white">
          {concepts.map(c => {
            const m = conceptKindMeta[c.kind];
            return (
              <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-parchment-50 px-1 py-0.5 rounded text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(c.id)}
                  onChange={() => toggle(c.id)}
                  className="rounded border-parchment-300 accent-burgundy-500"
                />
                <span className="truncate flex-1">{loc(c.label)}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded border ${m.color}`}>{m.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="text-xs text-verdigris-600">{selected.length} Begriff(e) gewählt</div>
      )}

      <button
        type="button"
        onClick={() => setShowNew(!showNew)}
        className="text-xs text-burgundy-600 hover:underline"
      >
        + Neuer Begriff
      </button>

      {showNew && (
        <div className="space-y-2 bg-parchment-50 p-3 rounded border border-parchment-200">
          <div className="flex gap-1 text-xs">
            {(['analytical', 'source', 'narrative'] as ConceptKind[]).map(k => {
              const m = conceptKindMeta[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  title={m.tooltip}
                  className={`px-2 py-1 rounded ${kind === k ? 'bg-burgundy-500 text-white' : 'bg-white border border-parchment-300'}`}
                >
                  {m.label}
                </button>
              );
            })}
          </div>
          <input type="text" value={label} onChange={e => setLabel(e.target.value)}
            placeholder={'Bezeichnung (z.B. „Revolution")'} className="w-full input" />
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Definition / Erläuterung (optional)" className="w-full input h-16 resize-none" />
          <p className="text-[10px] text-ink-400 italic">
            {conceptKindMeta[kind].tooltip}
          </p>
          <button
            type="button"
            onClick={handleCreate}
            disabled={!label}
            className="text-sm px-3 py-1.5 bg-burgundy-500 text-white rounded hover:bg-burgundy-600 disabled:opacity-40"
          >
            Begriff anlegen
          </button>
        </div>
      )}
    </div>
  );
}
