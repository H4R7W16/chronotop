import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../api/client.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useDrawContext } from './drawContext.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { Place } from '@chronotop/shared';

interface OrtPickerProps {
  value: string | null;
  onChange: (placeId: string) => void;
  mapClickLngLat?: { lng: number; lat: number } | null;
}

export function OrtPicker({ value, onChange, mapClickLngLat }: OrtPickerProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const { canPersist } = useAuthorMode();
  const places = useChronotopStore(s => s.places);
  const createPlace = useChronotopStore(s => s.createPlace);
  const updatePlace = useChronotopStore(s => s.updatePlace);
  const { drawMode, setDrawMode, drawPoints, setDrawPoints } = useDrawContext();

  const [mode, setMode] = useState<'select' | 'search' | 'manual'>('select');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  // When map is clicked, switch to manual mode with coordinates
  useEffect(() => {
    if (mapClickLngLat) {
      setMode('manual');
      setManualLat(mapClickLngLat.lat.toFixed(5));
      setManualLng(mapClickLngLat.lng.toFixed(5));
    }
  }, [mapClickLngLat]);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await api.searchWikidata(query);
      setResults(res);
    } catch { setResults([]); }
    setSearching(false);
  };

  const handleSelectResult = async (result: any) => {
    // Check if place with this wikidata ID already exists
    const existing = places.find(p => p.wikidataId === result.id);
    if (existing) {
      onChange(existing.id);
      setMode('select');
      return;
    }

    if (result.lat != null && result.lng != null) {
      const place = await createPlace({
        name: result.label,
        lat: result.lat,
        lng: result.lng,
        wikidataId: result.id,
        description: result.description,
      });
      onChange(place.id);
      setMode('select');
    }
  };

  const handleCreateManual = async () => {
    if (!manualName || !manualLat || !manualLng) return;
    const place = await createPlace({
      name: manualName,
      lat: parseFloat(manualLat),
      lng: parseFloat(manualLng),
    });
    onChange(place.id);
    setMode('select');
    setManualName('');
    setManualLat('');
    setManualLng('');
  };

  const selectedPlace = places.find(p => p.id === value);

  return (
    <div className="space-y-2">
      <label htmlFor="event-place-select" className="text-sm font-medium text-slate-700">{t('event.place')}</label>

      {/* Existing place selector */}
      {places.length > 0 && (
        <select
          id="event-place-select"
          aria-label={t('event.place')}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">-- Ort wählen --</option>
          {places.map(p => (
            <option key={p.id} value={p.id}>{loc(p.name)}</option>
          ))}
        </select>
      )}

      {/* Mode tabs */}
      <div className="flex gap-1 text-xs">
        <button
          type="button"
          onClick={() => setMode('search')}
          className={`px-2 py-1 rounded ${mode === 'search' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {t('place.search')}
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`px-2 py-1 rounded ${mode === 'manual' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
        >
          {t('place.clickMap')}
        </button>
      </div>

      {/* Wikidata search */}
      {mode === 'search' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="z.B. Berlin, Wittenberg..."
              className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <button
              type="button"
              onClick={handleSearch}
              disabled={searching}
              className="px-3 py-1.5 bg-slate-600 text-white text-sm rounded hover:bg-slate-700 disabled:opacity-50"
            >
              {searching ? '...' : 'Suchen'}
            </button>
          </div>
          {results.length > 0 && (
            <div className="border border-slate-200 rounded max-h-40 overflow-y-auto">
              {results.map(r => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleSelectResult(r)}
                  disabled={r.lat == null}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-100 last:border-0 disabled:opacity-40"
                >
                  <div className="font-medium">{r.label} <span className="text-xs text-slate-400">{r.id}</span></div>
                  {r.description && <div className="text-xs text-slate-500">{r.description}</div>}
                  {r.lat == null && <div className="text-xs text-red-400">Keine Koordinaten</div>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual / map click entry */}
      {mode === 'manual' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">{t('place.clickMap')}</p>
          <input
            type="text"
            value={manualName}
            onChange={e => setManualName(e.target.value)}
            placeholder={t('place.name')}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <div className="flex gap-2">
            <input
              type="number"
              step="any"
              value={manualLat}
              onChange={e => setManualLat(e.target.value)}
              placeholder={t('place.lat')}
              className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <input
              type="number"
              step="any"
              value={manualLng}
              onChange={e => setManualLng(e.target.value)}
              placeholder={t('place.lng')}
              className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <button
            type="button"
            onClick={handleCreateManual}
            disabled={!manualName || !manualLat || !manualLng}
            title={!canPersist ? 'Demo: lokal erstellen' : undefined}
            className="text-sm px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {canPersist ? 'Ort erstellen' : 'In Demo-Entwurf erstellen'}
          </button>
        </div>
      )}

      {/* Show selected */}
      {selectedPlace && (
        <div className="text-xs text-verdigris-600 bg-verdigris-50 px-2 py-1 rounded">
          Gewählt: {loc(selectedPlace.name)} ({selectedPlace.lat.toFixed(2)}, {selectedPlace.lng.toFixed(2)})
          {selectedPlace.geometry && <span className="ml-2 text-burgundy-600">· Fläche markiert</span>}
        </div>
      )}

      {/* Historische Gültigkeit */}
      {selectedPlace && (
        <div className="border-t border-parchment-200 pt-2 mt-2">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
            Historische Gültigkeit (optional)
          </div>
          <ValidityEditor place={selectedPlace} />
        </div>
      )}

      {/* Geometrie-Werkzeug für gewählten Ort */}
      {selectedPlace && (
        <div className="border-t border-parchment-200 pt-2 mt-2">
          <div className="text-[11px] uppercase tracking-wider text-ink-400 mb-1.5">
            Fläche / Territorium
          </div>
          {drawMode !== 'polygon' && !selectedPlace.geometry && (
            <button
              type="button"
              onClick={() => { setDrawMode('polygon'); setDrawPoints([]); }}
              className="text-xs px-2.5 py-1.5 border border-parchment-300 rounded hover:bg-parchment-100 text-ink-600"
            >
              ✏ Fläche zeichnen
            </button>
          )}
          {drawMode !== 'polygon' && selectedPlace.geometry && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setDrawMode('polygon'); setDrawPoints([]); }}
                className="text-xs px-2.5 py-1.5 border border-parchment-300 rounded hover:bg-parchment-100 text-ink-600"
              >
                ✏ Neu zeichnen
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!confirm('Markierte Fläche entfernen?')) return;
                  await updatePlace(selectedPlace.id, { geometry: null });
                }}
                className="text-xs px-2.5 py-1.5 border border-parchment-300 rounded hover:bg-burgundy-50 text-burgundy-600"
              >
                ✕ Fläche entfernen
              </button>
            </div>
          )}
          {drawMode === 'polygon' && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-ink-500 italic">
                Klicke nacheinander auf die Karte, um Eckpunkte zu setzen (mind. 3).
                Die obere Werkzeugleiste auf der Karte zeigt den Fortschritt.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={drawPoints.length < 3}
                  title={!canPersist ? 'Demo: lokal speichern' : undefined}
                onClick={async () => {
                    if (drawPoints.length < 3) return;
                    const ring = [...drawPoints, drawPoints[0]];
                    const geometry = { type: 'Polygon' as const, coordinates: [ring] };
                    await updatePlace(selectedPlace.id, { geometry });
                    setDrawMode(null);
                    setDrawPoints([]);
                  }}
                  className="text-xs px-2.5 py-1.5 bg-burgundy-500 text-white rounded hover:bg-burgundy-600 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {canPersist ? `✓ Flaeche speichern (${drawPoints.length}/3)` : `In Demo-Entwurf speichern (${drawPoints.length}/3)`}
                </button>
                <button
                  type="button"
                  onClick={() => { setDrawMode(null); setDrawPoints([]); }}
                  className="text-xs px-2.5 py-1.5 border border-parchment-300 rounded hover:bg-parchment-100 text-ink-600"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Eingabefelder für `valid_from` / `valid_to` eines Place.
 * Speichert direkt per API beim Verlassen des Feldes (onBlur).
 */
function ValidityEditor({ place }: { place: Place }) {
  const updatePlace = useChronotopStore(s => s.updatePlace);
  const { canPersist } = useAuthorMode();
  const [from, setFrom] = useState<string>(place.validFrom ?? '');
  const [to,   setTo]   = useState<string>(place.validTo   ?? '');

  // Wenn der gewählte Ort sich ändert, Werte neu laden
  useEffect(() => {
    setFrom(place.validFrom ?? '');
    setTo(place.validTo ?? '');
  }, [place.id, place.validFrom, place.validTo]);

  const persist = async (next: { validFrom?: string; validTo?: string }) => {
    await updatePlace(place.id, next);
  };

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-ink-500 italic leading-snug">
        Wann existierte dieser Ort als historische Einheit? Beispiel: das
        Polygon „Deutsches Reich" ist nur 1933–1945 zu zeigen, die Berliner
        Mauer 1961–1989. Felder leer lassen, wenn der Ort durchgehend gilt.
      </p>
      <div className="flex gap-2">
        <label className="flex-1 text-[11px]">
          <span className="block text-ink-500">gültig ab</span>
          <input
            type="text"
            value={from}
            onChange={e => setFrom(e.target.value)}
            onBlur={() => from !== (place.validFrom ?? '') && persist({ validFrom: from || undefined })}
            title={!canPersist ? 'Demo: lokal speichern' : undefined}
            placeholder="JJJJ oder JJJJ-MM-TT"
            className="w-full input mt-0.5 text-xs"
          />
        </label>
        <label className="flex-1 text-[11px]">
          <span className="block text-ink-500">gültig bis</span>
          <input
            type="text"
            value={to}
            onChange={e => setTo(e.target.value)}
            onBlur={() => to !== (place.validTo ?? '') && persist({ validTo: to || undefined })}
            title={!canPersist ? 'Demo: lokal speichern' : undefined}
            placeholder="JJJJ oder JJJJ-MM-TT"
            className="w-full input mt-0.5 text-xs"
          />
        </label>
      </div>
    </div>
  );
}
