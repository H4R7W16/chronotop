import { useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useDrawContext } from './drawContext.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { Movement } from '@chronotop/shared';

const PRESET_COLORS = [
  '#7B2D42', // Burgundy (default)
  '#3e6e62', // Verdigris
  '#1a4a7a', // Blue
  '#5a3a1a', // Brown
  '#2a6a2a', // Green
  '#6a1a6a', // Purple
  '#8a4a1a', // Orange-brown
];

export function MovementEditor() {
  const { canPersist } = useAuthorMode();
  const movements = useChronotopStore(s => s.movements);
  const events = useChronotopStore(s => s.events);
  const createMovement = useChronotopStore(s => s.createMovement);
  const deleteMovement = useChronotopStore(s => s.deleteMovement);
  const loc = useLocalized();

  const { drawMode, setDrawMode, drawPoints, setDrawPoints } = useDrawContext();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#7B2D42');
  const [eventId, setEventId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isDrawing = drawMode === 'movement';
  const canSave = isDrawing && drawPoints.length >= 2 && name.trim().length > 0;

  function startDrawing() {
    setDrawMode('movement');
    setDrawPoints([]);
    setError(null);
  }

  function cancelDrawing() {
    setDrawMode(null);
    setDrawPoints([]);
    setError(null);
  }

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await createMovement({
        name: name.trim(),
        description: description.trim(),
        color,
        eventId: eventId || null,
        coordinates: drawPoints as [number, number][],
      });
      // Reset
      setName('');
      setDescription('');
      setColor('#7B2D42');
      setEventId('');
      setDrawMode(null);
      setDrawPoints([]);
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteMovement(id);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      {/* Draw mode banner / controls */}
      {isDrawing ? (
        <div className="p-4 space-y-4 border-b border-parchment-200 bg-parchment-50">
          <div className="flex items-center gap-2 text-sm text-ink-700">
            <span className="text-burgundy-600 text-base">→</span>
            <span className="font-medium">Route zeichnen</span>
            <span className="text-ink-400">({drawPoints.length} {drawPoints.length === 1 ? 'Punkt' : 'Punkte'})</span>
          </div>
          <p className="text-xs text-ink-500">
            Klicke auf die Karte, um Wegpunkte zu setzen. Mindestens 2 Punkte erforderlich.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setDrawPoints(prev => prev.slice(0, -1))}
              disabled={drawPoints.length === 0}
              className="text-xs px-2 py-1 border border-parchment-300 rounded hover:bg-parchment-100 disabled:opacity-40"
            >
              Letzten Punkt löschen
            </button>
            <button
              onClick={cancelDrawing}
              className="text-xs px-2 py-1 border border-parchment-300 rounded hover:bg-parchment-100 text-ink-500"
            >
              Abbrechen
            </button>
          </div>

          {/* Save form — shown when enough points */}
          {drawPoints.length >= 2 && (
            <div className="space-y-3 pt-2 border-t border-parchment-200">
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">
                  Name <span className="text-burgundy-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="z.B. Völkerwanderung, Handelsroute…"
                  className="w-full text-sm border border-parchment-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-burgundy-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Beschreibung</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Kurze Beschreibung der Route…"
                  className="w-full text-sm border border-parchment-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-burgundy-400 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Farbe</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      title={c}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        color === c ? 'border-ink-700 scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ background: c }}
                    />
                  ))}
                  <input
                    type="color"
                    value={color}
                    onChange={e => setColor(e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border border-parchment-300"
                    title="Eigene Farbe"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-600 mb-1">Verknüpftes Ereignis (optional)</label>
                <select
                  value={eventId}
                  onChange={e => setEventId(e.target.value)}
                  className="w-full text-sm border border-parchment-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-burgundy-400 bg-white"
                >
                  <option value="">— kein Ereignis —</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{loc(ev.title)}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <button
                onClick={handleSave}
                disabled={!canSave || saving}
                title={!canPersist ? 'Demo: lokal speichern' : undefined}
                className="w-full py-2 text-sm font-medium bg-burgundy-600 text-white rounded hover:bg-burgundy-700 disabled:opacity-40 transition-colors"
              >
                {saving ? 'Speichern…' : canPersist ? 'Route speichern' : 'In Demo-Entwurf speichern'}
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-parchment-200">
          <button
            onClick={startDrawing}
            className="w-full py-2 text-sm font-medium border-2 border-dashed border-burgundy-300 text-burgundy-600 rounded hover:bg-burgundy-50 transition-colors flex items-center justify-center gap-2"
          >
            <span>→</span>
            Route zeichnen
          </button>
        </div>
      )}

      {/* Movement list */}
      <div className="flex-1 overflow-y-auto">
        {movements.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-400">
            <div className="text-2xl mb-2">🗺</div>
            <p>Noch keine Routen vorhanden.</p>
            <p className="text-xs mt-1">Zeichne eine Route auf der Karte.</p>
          </div>
        ) : (
          <ul className="divide-y divide-parchment-100">
            {movements.map(m => (
              <MovementItem
                key={m.id}
                movement={m}
                events={events}
                isDeleting={deletingId === m.id}
                canPersist={canPersist}
                onDelete={() => handleDelete(m.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function MovementItem({
  movement,
  events,
  isDeleting,
  canPersist,
  onDelete,
}: {
  movement: Movement;
  events: any[];
  isDeleting: boolean;
  canPersist: boolean;
  onDelete: () => void;
}) {
  const loc = useLocalized();
  const linkedEvent = movement.eventId ? events.find(e => e.id === movement.eventId) : null;

  return (
    <li className="px-4 py-3 hover:bg-parchment-50 group">
      <div className="flex items-start gap-2">
        <span
          className="mt-0.5 shrink-0 inline-block w-3 h-3 rounded-full"
          style={{ background: movement.color }}
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink-800 truncate">{movement.name}</p>
          {movement.description && (
            <p className="text-xs text-ink-500 truncate mt-0.5">{movement.description}</p>
          )}
          <p className="text-[10px] text-ink-400 mt-1">
            {movement.coordinates.length} Punkte
            {linkedEvent && (
              <span className="ml-2 text-verdigris-600">↗ {loc(linkedEvent.title)}</span>
            )}
          </p>
        </div>
        <button
          onClick={onDelete}
          disabled={isDeleting}
          title={canPersist ? 'Route loeschen' : 'Demo: lokal loeschen'}
          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity disabled:opacity-40 text-xs px-1 py-0.5 rounded shrink-0"
          aria-label={`Route "${movement.name}" löschen`}
        >
          {isDeleting ? '…' : '✕'}
        </button>
      </div>
    </li>
  );
}
