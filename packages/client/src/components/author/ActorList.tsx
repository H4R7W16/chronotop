import { useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { api } from '../../api/client.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { Actor, ActorType } from '@chronotop/shared';

const typeIcons: Record<ActorType, string> = { person: '👤', group: '👥', institution: '🏛' };
const typeLabels: Record<ActorType, string> = { person: 'Person', group: 'Gruppe', institution: 'Institution' };

function kindToActorType(kind: string): ActorType {
  if (kind === 'person') return 'person';
  if (kind === 'organization' || kind === 'institution') return 'institution';
  if (kind === 'group') return 'group';
  return 'person';
}

export function ActorList() {
  const loc = useLocalized();
  const { canPersist } = useAuthorMode();
  const actors = useChronotopStore(s => s.actors);
  const events = useChronotopStore(s => s.events);
  const createActor = useChronotopStore(s => s.createActor);
  const deleteActor = useChronotopStore(s => s.deleteActor);

  const [showForm, setShowForm] = useState(false);
  const [formMode, setFormMode] = useState<'wikidata' | 'manual'>('wikidata');
  const [type, setType] = useState<ActorType>('person');
  const [name, setName] = useState('');
  const [wikidataId, setWikidataId] = useState('');
  const [description, setDescription] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [deathDate, setDeathDate] = useState('');
  // Wikidata-Suche
  const [wdQuery, setWdQuery] = useState('');
  const [wdResults, setWdResults] = useState<any[]>([]);
  const [wdSearching, setWdSearching] = useState(false);

  // Anzahl Ereignisse pro Akteur
  const eventCount = (actorId: string) =>
    events.filter(e => e.actors?.some(a => a.actor.id === actorId)).length;

  const reset = () => {
    setName(''); setWikidataId(''); setDescription(''); setBirthDate(''); setDeathDate('');
    setWdQuery(''); setWdResults([]);
    setShowForm(false);
  };

  const handleWdSearch = async () => {
    if (!wdQuery.trim()) return;
    setWdSearching(true);
    try {
      const res = await api.searchWikidata(wdQuery);
      setWdResults(res.filter((r: any) => ['person', 'organization', 'group'].includes(r.kind)));
    } catch { setWdResults([]); }
    setWdSearching(false);
  };

  const handlePickWd = async (r: any) => {
    if (actors.find(a => a.wikidataId === r.id)) return; // schon angelegt
    await createActor({
      type: kindToActorType(r.kind),
      name: r.label,
      wikidataId: r.id,
      description: r.description,
      birthDate: r.birthDate,
      deathDate: r.deathDate,
    });
    reset();
  };

  const handleCreate = async () => {
    if (!name) return;
    await createActor({
      type, name, wikidataId: wikidataId || undefined,
      description: description || undefined,
      birthDate: birthDate || undefined,
      deathDate: deathDate || undefined,
    });
    reset();
  };

  const handleDelete = async (actor: Actor) => {
    const usage = eventCount(actor.id);
    const actorName = loc(actor.name);
    const msg = usage > 0
      ? `„${actorName}" ist mit ${usage} Ereignis${usage === 1 ? '' : 'sen'} verknüpft. Wirklich löschen?`
      : `„${actorName}" wirklich löschen?`;
    if (confirm(msg)) {
      await deleteActor(actor.id);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b border-parchment-200 bg-parchment-50 shrink-0">
        <button onClick={() => setShowForm(!showForm)}
          className="w-full bg-burgundy-500 hover:bg-burgundy-600 text-white px-4 py-2.5 rounded-md font-medium transition-colors shadow-sm">
          + Neuer Akteur
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {showForm && (
          <div className="bg-parchment-50 p-3 rounded border border-parchment-200 space-y-2">
            {/* Mode-Tabs */}
            <div className="flex border border-parchment-300 rounded overflow-hidden text-xs">
              <button onClick={() => setFormMode('wikidata')}
                className={`flex-1 px-2 py-1 ${formMode === 'wikidata' ? 'bg-burgundy-500 text-white' : 'bg-white text-ink-600'}`}>
                Wikidata-Suche
              </button>
              <button onClick={() => setFormMode('manual')}
                className={`flex-1 px-2 py-1 ${formMode === 'manual' ? 'bg-burgundy-500 text-white' : 'bg-white text-ink-600'}`}>
                manuell anlegen
              </button>
            </div>

            {/* Wikidata-Suche */}
            {formMode === 'wikidata' && (
              <>
                <div className="flex gap-2">
                  <input type="text" value={wdQuery} onChange={e => setWdQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleWdSearch())}
                    placeholder="z.B. Martin Luther, NSDAP …" className="flex-1 input" autoFocus />
                  <button onClick={handleWdSearch} disabled={wdSearching}
                    className="px-3 py-1.5 bg-slate-600 text-white text-xs rounded hover:bg-slate-700 disabled:opacity-50">
                    {wdSearching ? '…' : 'Suchen'}
                  </button>
                </div>
                {wdResults.length > 0 && (
                  <div className="border border-parchment-200 bg-white rounded max-h-64 overflow-y-auto">
                    {wdResults.map(r => {
                      const exists = !!actors.find(a => a.wikidataId === r.id);
                      return (
                        <button key={r.id} onClick={() => handlePickWd(r)} disabled={exists}
                          className="w-full text-left px-2.5 py-2 text-sm hover:bg-parchment-50 border-b border-parchment-100 last:border-0 disabled:opacity-50">
                          <div className="flex items-center gap-2">
                            <span className="opacity-70">{typeIcons[kindToActorType(r.kind)]}</span>
                            <span className="font-medium">{r.label}</span>
                            <span className="text-[10px] text-ink-400 font-mono ml-auto">{r.id}</span>
                          </div>
                          {r.description && <div className="text-[11px] text-ink-500 mt-0.5">{r.description}</div>}
                          <div className="text-[10px] text-ink-400 mt-0.5 flex flex-wrap gap-x-2">
                            <span>{typeLabels[kindToActorType(r.kind)]}</span>
                            {r.birthDate && <span>* {r.birthDate}</span>}
                            {r.deathDate && <span>† {r.deathDate}</span>}
                            {exists && <span className="text-verdigris-600">✓ schon angelegt</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                <div className="flex justify-end">
                  <button onClick={reset}
                    className="px-3 py-1.5 border border-parchment-300 rounded text-xs text-ink-600 hover:bg-white">
                    Schließen
                  </button>
                </div>
              </>
            )}

            {/* Manuell */}
            {formMode === 'manual' && (
              <>
                <div className="flex gap-1 text-xs">
                  {(['person', 'group', 'institution'] as ActorType[]).map(t => (
                    <button key={t} onClick={() => setType(t)}
                      className={`px-2 py-1 rounded ${type === t ? 'bg-burgundy-500 text-white' : 'bg-white border border-parchment-300'}`}>
                      {typeIcons[t]} {typeLabels[t]}
                    </button>
                  ))}
                </div>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="Name" className="w-full input" autoFocus />
                <input type="text" value={wikidataId} onChange={e => setWikidataId(e.target.value)}
                  placeholder="Wikidata-ID (optional)" className="w-full input" />
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
                <div className="flex gap-2">
                  <button onClick={handleCreate} disabled={!name}
                    className="flex-1 bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-40 text-white px-3 py-1.5 rounded text-sm">
                    {canPersist ? 'Anlegen' : 'In Demo-Entwurf anlegen'}
                  </button>
                  <button onClick={reset}
                    className="px-3 py-1.5 border border-parchment-300 rounded text-sm text-ink-600 hover:bg-white">
                    Abbruch
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {actors.length === 0 && !showForm && (
          <div className="text-center py-12 text-ink-300">
            <div className="text-3xl mb-2 opacity-40">👤</div>
            <p className="text-sm italic">Noch keine Akteure angelegt.</p>
          </div>
        )}

        {actors.map(actor => {
          const count = eventCount(actor.id);
          return (
            <article key={actor.id}
              className="group border border-parchment-200 bg-white rounded-md p-3 hover:bg-parchment-50 transition-colors">
              <div className="flex items-start gap-2">
                <span className="text-xl shrink-0" aria-hidden>{typeIcons[actor.type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-serif font-semibold text-ink-700 leading-tight text-sm">
                    {loc(actor.name)}
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-ink-400">
                    <span>{typeLabels[actor.type]}</span>
                    {actor.birthDate && <span>* {actor.birthDate}{actor.deathDate ? ` † ${actor.deathDate}` : ''}</span>}
                    {actor.wikidataId && (
                      <a href={`https://www.wikidata.org/wiki/${actor.wikidataId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-burgundy-600 hover:underline">↗ Wikidata</a>
                    )}
                  </div>
                  {loc(actor.description) && (
                    <p className="text-xs text-ink-500 mt-1.5 leading-relaxed line-clamp-2">{loc(actor.description)}</p>
                  )}
                  <div className="text-[10px] text-verdigris-600 mt-1">
                    {count > 0 ? `${count} Ereignis${count === 1 ? '' : 'se'}` : 'noch keinen Ereignissen zugeordnet'}
                  </div>
                </div>
                <button onClick={() => handleDelete(actor)}
                  className="opacity-0 group-hover:opacity-100 text-[11px] px-1.5 py-0.5 text-ink-500 hover:text-burgundy-700 bg-white border border-parchment-200 rounded hover:bg-burgundy-50"
                  title={canPersist ? undefined : 'Demo: lokal loeschen'}
                  aria-label="Löschen">✕</button>
              </div>
            </article>
          );
        })}
      </div>

      {actors.length > 0 && (
        <div className="px-4 py-2 border-t border-parchment-200 bg-parchment-50 text-[11px] text-ink-400 italic shrink-0">
          {actors.length} Akteur{actors.length === 1 ? '' : 'e'}
        </div>
      )}
    </div>
  );
}
