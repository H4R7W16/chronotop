import { useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { EreignisForm } from './EreignisForm.js';
import { EventList } from './EventList.js';
import { ActorList } from './ActorList.js';
import { ConceptList } from './ConceptList.js';
import { TaskEditor } from '../tasks/TaskEditor.js';
import { MovementEditor } from './MovementEditor.js';
import { ModuleSettingsPanel } from './ModuleSettingsPanel.js';
import { GeodataImportPanel } from './GeodataImportPanel.js';
import type { Event } from '@chronotop/shared';

type Tab = 'events' | 'actors' | 'concepts' | 'tasks' | 'routes' | 'geodata' | 'settings';

interface AuthorSidebarProps {
  mapClickLngLat?: { lng: number; lat: number } | null;
}

export function AuthorSidebar({ mapClickLngLat }: AuthorSidebarProps) {
  const events = useChronotopStore(s => s.events);
  const places = useChronotopStore(s => s.places);
  const actors = useChronotopStore(s => s.actors);
  const concepts = useChronotopStore(s => s.concepts);
  const movements = useChronotopStore(s => s.movements);

  const [tab, setTab] = useState<Tab>('events');
  const [showForm, setShowForm] = useState(false);
  const [editEvent, setEditEvent] = useState<Event | null>(null);

  const handleNewEvent = () => { setEditEvent(null); setShowForm(true); };
  const handleEditEvent = (event: Event) => { setEditEvent(event); setShowForm(true); };
  const handleSaved = () => { setShowForm(false); setEditEvent(null); };

  return (
    <div className="h-full flex flex-col bg-white">
      {showForm ? (
        <div className="flex-1 overflow-y-auto p-4">
          <EreignisForm
            editEvent={editEvent}
            onSaved={handleSaved}
            onCancel={() => { setShowForm(false); setEditEvent(null); }}
            mapClickLngLat={mapClickLngLat}
          />
        </div>
      ) : (
        <>
          <div role="tablist" className="grid grid-cols-3 md:grid-cols-4 xl:grid-cols-3 border-b border-parchment-200 bg-parchment-50 shrink-0 text-xs">
            <TabButton active={tab === 'events'} onClick={() => setTab('events')} count={events.length}>
              Ereignisse
            </TabButton>
            <TabButton active={tab === 'actors'} onClick={() => setTab('actors')} count={actors.length}>
              Akteure
            </TabButton>
            <TabButton active={tab === 'concepts'} onClick={() => setTab('concepts')} count={concepts.length}>
              Begriffe
            </TabButton>
            <TabButton active={tab === 'tasks'} onClick={() => setTab('tasks')} count={0} hideCount>
              Aufgaben
            </TabButton>
            <TabButton active={tab === 'routes'} onClick={() => setTab('routes')} count={movements.length}>
              Routen
            </TabButton>
            <TabButton active={tab === 'geodata'} onClick={() => setTab('geodata')} count={places.filter(p => p.geometry).length}>
              Geodaten
            </TabButton>
            <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} count={0} hideCount>
              Setup
            </TabButton>
          </div>

          <div className="flex-1 min-h-0">
            {tab === 'events' && (
              <EventList onNewEvent={handleNewEvent} onEditEvent={handleEditEvent} />
            )}
            {tab === 'actors' && <ActorList />}
            {tab === 'concepts' && <ConceptList />}
            {tab === 'tasks' && <TaskEditor />}
            {tab === 'routes' && <MovementEditor />}
            {tab === 'geodata' && <GeodataImportPanel />}
            {tab === 'settings' && <ModuleSettingsPanel />}
          </div>
        </>
      )}
    </div>
  );
}

function TabButton({ active, onClick, count, hideCount, children }: {
  active: boolean; onClick: () => void; count: number; hideCount?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`min-w-0 px-2 py-2.5 font-medium border-b-2 transition-colors whitespace-nowrap text-center ${
        active
          ? 'text-burgundy-600 border-burgundy-500 bg-white'
          : 'text-ink-500 border-transparent hover:text-ink-700 hover:bg-white/50'
      }`}
    >
      {children}
      {!hideCount && count > 0 && (
        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
          active ? 'bg-burgundy-100 text-burgundy-600' : 'bg-parchment-200 text-ink-500'
        }`}>{count}</span>
      )}
    </button>
  );
}
