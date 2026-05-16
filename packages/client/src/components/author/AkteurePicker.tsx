import { useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { api } from '../../api/client.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { ActorType } from '@chronotop/shared';

interface AkteurePickerProps {
  selected: { actorId: string; role?: string }[];
  onChange: (links: { actorId: string; role?: string }[]) => void;
}

const actorTypeLabels: Record<ActorType, string> = {
  person: 'Person',
  group: 'Gruppe',
  institution: 'Institution',
};

const actorTypeIcons: Record<ActorType, string> = {
  person: '👤',
  group: '👥',
  institution: '🏛',
};

// Wikidata-kind → unsere ActorType-Mapping
function kindToActorType(kind: string): ActorType {
  if (kind === 'person') return 'person';
  if (kind === 'organization' || kind === 'institution') return 'institution';
  if (kind === 'group') return 'group';
  return 'person';
}

export function AkteurePicker({ selected, onChange }: AkteurePickerProps) {
  const loc = useLocalized();
  const { canPersist } = useAuthorMode();
  const actors = useChronotopStore(s => s.actors);
  const createActor = useChronotopStore(s => s.createActor);

  const [mode, setMode] = useState<'select' | 'wikidata' | 'manual'>('select');

  // Wikidata-Suche
  const [wdQuery, setWdQuery] = useState('');
  const [wdResults, setWdResults] = useState<any[]>([]);
  const [wdSearching, setWdSearching] = useState(false);

  // Manuelles Anlegen
  const [type, setType] = useState<ActorType>('person');
  const [name, setName] = useState('');
  const [wikidataId, setWikidataId] = useState('');
  const [description, setDescription] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');

  const toggle = (actorId: string) => {
    if (selected.some(s => s.actorId === actorId)) {
      onChange(selected.filter(s => s.actorId !== actorId));
    } else {
      onChange([...selected, { actorId }]);
    }
  };

  const setRole = (actorId: string, role: string) => {
    onChange(selected.map(s => s.actorId === actorId ? { ...s, role } : s));
  };

  const handleWikidataSearch = async () => {
    if (!wdQuery.trim()) return;
    setWdSearching(true);
    try {
      const res = await api.searchWikidata(wdQuery);
      // Nur Personen / Organisationen / Gruppen anzeigen
      const filtered = res.filter((r: any) =>
        ['person', 'organization', 'group'].includes(r.kind),
      );
      setWdResults(filtered);
    } catch { setWdResults([]); }
    setWdSearching(false);
  };

  const handlePickWikidata = async (result: any) => {
    // Existierenden Akteur mit gleicher QID wiederverwenden
    const existing = actors.find(a => a.wikidataId === result.id);
    if (existing) {
      onChange([...selected, { actorId: existing.id }]);
      setMode('select');
      return;
    }
    const actor = await createActor({
      type: kindToActorType(result.kind),
      name: result.label,
      wikidataId: result.id,
      description: result.description,
      birthDate: result.birthDate,
      deathDate: result.deathDate,
    });
    onChange([...selected, { actorId: actor.id }]);
    setMode('select');
    setWdQuery('');
    setWdResults([]);
  };

  const handleCreateManual = async () => {
    if (!name) return;
    const actor = await createActor({
      type, name, wikidataId: wikidataId || undefined,
      description: description || undefined,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
    });
    onChange([...selected, { actorId: actor.id }]);
    setMode('select');
    setName(''); setWikidataId(''); setDescription(''); setBirthDate(''); setDeathDate('');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-ink-600">Akteure</label>

      {actors.length > 0 && (
        <div className="max-h-40 overflow-y-auto border border-parchment-200 rounded p-2 space-y-1.5 bg-white">
          {actors.map(a => {
            const isSelected = selected.some(s => s.actorId === a.id);
            const link = selected.find(s => s.actorId === a.id);
            return (
              <div key={a.id} className="text-sm">
                <label className="flex items-center gap-2 cursor-pointer hover:bg-parchment-50 px-1 py-0.5 rounded">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(a.id)}
                    className="rounded border-parchment-300 accent-burgundy-500"
                  />
                  <span className="opacity-70">{actorTypeIcons[a.type]}</span>
                  <span className="truncate flex-1">{loc(a.name)}</span>
                  <span className="text-[10px] text-ink-400">{actorTypeLabels[a.type]}</span>
                </label>
                {isSelected && (
                  <input
                    type="text"
                    value={link?.role ?? ''}
                    onChange={e => setRole(a.id, e.target.value)}
                    placeholder={'Rolle (z.B. „Initiator", „Beteiligter")'}
                    className="ml-7 mt-1 w-[calc(100%-2rem)] input text-xs py-1"
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {selected.length > 0 && (
        <div className="text-xs text-verdigris-600">{selected.length} Akteur(e) gewählt</div>
      )}

      {/* Mode-Tabs */}
      <div className="flex gap-1 text-xs">
        <button type="button" onClick={() => setMode('wikidata')}
          className={`px-2 py-1 rounded ${mode === 'wikidata' ? 'bg-burgundy-100 text-burgundy-700' : 'bg-parchment-100 text-ink-500 hover:bg-parchment-200'}`}>
          Wikidata-Suche
        </button>
        <button type="button" onClick={() => setMode('manual')}
          className={`px-2 py-1 rounded ${mode === 'manual' ? 'bg-burgundy-100 text-burgundy-700' : 'bg-parchment-100 text-ink-500 hover:bg-parchment-200'}`}>
          manuell anlegen
        </button>
      </div>

      {/* Wikidata */}
      {mode === 'wikidata' && (
        <div className="space-y-2 bg-parchment-50 p-3 rounded border border-parchment-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={wdQuery}
              onChange={e => setWdQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleWikidataSearch())}
              placeholder="z.B. Martin Luther, Berliner Senat …"
              className="flex-1 input"
            />
            <button type="button" onClick={handleWikidataSearch} disabled={wdSearching}
              className="px-3 py-1.5 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50">
              {wdSearching ? '…' : 'Suchen'}
            </button>
          </div>
          {wdResults.length > 0 && (
            <div className="border border-parchment-200 bg-white rounded max-h-56 overflow-y-auto">
              {wdResults.map(r => (
                <button key={r.id} type="button" onClick={() => handlePickWikidata(r)}
                  title={!canPersist && !actors.find(a => a.wikidataId === r.id) ? 'Demo: lokal anlegen' : undefined}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-parchment-50 border-b border-parchment-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="opacity-70">{actorTypeIcons[kindToActorType(r.kind)]}</span>
                    <span className="font-medium">{r.label}</span>
                    <span className="text-[10px] text-ink-400 font-mono ml-auto">{r.id}</span>
                  </div>
                  {r.description && <div className="text-[11px] text-ink-500 mt-0.5">{r.description}</div>}
                  <div className="text-[10px] text-ink-400 mt-0.5 flex flex-wrap gap-x-2">
                    <span>{actorTypeLabels[kindToActorType(r.kind)]}</span>
                    {r.birthDate && <span>* {r.birthDate}</span>}
                    {r.deathDate && <span>† {r.deathDate}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
          {wdResults.length === 0 && wdQuery && !wdSearching && (
            <p className="text-[11px] text-ink-400 italic">Keine Treffer — versuche es mit anderem Begriff oder lege den Akteur manuell an.</p>
          )}
        </div>
      )}

      {/* Manuell */}
      {mode === 'manual' && (
        <div className="space-y-2 bg-parchment-50 p-3 rounded border border-parchment-200">
          <div className="flex gap-1 text-xs">
            {(['person', 'group', 'institution'] as ActorType[]).map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`px-2 py-1 rounded ${type === t ? 'bg-burgundy-500 text-white' : 'bg-white border border-parchment-300'}`}>
                {actorTypeIcons[t]} {actorTypeLabels[t]}
              </button>
            ))}
          </div>
          <input type="text" value={name} onChange={e => setName(e.target.value)}
            placeholder="Name" className="w-full input" />
          <input type="text" value={wikidataId} onChange={e => setWikidataId(e.target.value)}
            placeholder="Wikidata-ID (z.B. Q9554) – optional" className="w-full input" />
          {type === 'person' && (
            <div className="flex gap-2">
              <input type="text" value={birthDate} onChange={e => setBirthDate(e.target.value)}
                placeholder="geb." className="flex-1 input" />
              <input type="text" value={deathDate} onChange={e => setDeathDate(e.target.value)}
                placeholder="gest." className="flex-1 input" />
            </div>
          )}
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Beschreibung (optional)" className="w-full input h-16 resize-none" />
          <button type="button" onClick={handleCreateManual} disabled={!name}
            title={!canPersist ? 'Demo: lokal anlegen' : undefined}
            className="text-sm px-3 py-1.5 bg-burgundy-500 text-white rounded hover:bg-burgundy-600 disabled:opacity-40">
            {canPersist ? 'Akteur anlegen' : 'In Demo-Entwurf anlegen'}
          </button>
        </div>
      )}
    </div>
  );
}
