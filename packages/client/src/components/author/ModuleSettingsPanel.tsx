import { useState, useEffect } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useAuthorMode } from './authorModeContext.js';

/**
 * Modul-Einstellungen für Autoren:
 * - Historische Karte (XYZ-Tile-URL + Anzeigename)
 */
export function ModuleSettingsPanel() {
  const { canPersist } = useAuthorMode();
  const currentModule = useChronotopStore(s => s.currentModule);
  const currentModuleId = useChronotopStore(s => s.currentModuleId);
  const updateModuleBasemap = useChronotopStore(s => s.updateModuleBasemap);

  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Felder aus Store befüllen
  useEffect(() => {
    setUrl(currentModule?.basemapUrl ?? '');
    setLabel(currentModule?.basemapLabel ?? '');
    setSaved(false);
    setError(null);
  }, [currentModule?.id]);

  if (!currentModuleId || !currentModule) {
    return (
      <div className="p-6 text-center text-sm text-ink-400">
        Kein Modul geladen.
      </div>
    );
  }

  const isDirty =
    url.trim() !== (currentModule.basemapUrl ?? '') ||
    label.trim() !== (currentModule.basemapLabel ?? '');

  async function handleSave() {
    if (!currentModuleId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateModuleBasemap(
        currentModuleId,
        url.trim() || null,
        label.trim() || null,
      );
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (!currentModuleId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await updateModuleBasemap(currentModuleId, null, null);
      setUrl('');
      setLabel('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      setError(e?.message ?? 'Fehler beim Entfernen');
    } finally {
      setSaving(false);
    }
  }

  const hasBasemap = !!(currentModule.basemapUrl);

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* Historische Karte */}
      <section>
        <h3 className="text-sm font-semibold text-ink-700 mb-1 font-serif">
          Historische Karte
        </h3>
        <p className="text-xs text-ink-500 mb-3 leading-relaxed">
          Gib eine XYZ-Tile-URL ein (z.&nbsp;B. von einem georeferenzierten
          IIIF-Kartenserver). Das Muster muss{' '}
          <code className="bg-parchment-100 px-0.5 rounded text-ink-600">{'{z}/{x}/{y}'}</code>{' '}
          enthalten. Die Karte erscheint dann als vierter Stil im Karten-Stil-Wechsler.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">
              Tile-URL{' '}
              <span className="font-normal text-ink-400">(XYZ-Format)</span>
            </label>
            <input
              type="url"
              value={url}
              onChange={e => { setUrl(e.target.value); setSaved(false); }}
              placeholder="https://example.com/tiles/{z}/{x}/{y}.png"
              className="w-full text-sm border border-parchment-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-burgundy-400 font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">
              Bezeichnung{' '}
              <span className="font-normal text-ink-400">(Anzeigename in der Legende)</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={e => { setLabel(e.target.value); setSaved(false); }}
              placeholder="z. B. Stieler-Atlas 1879 (BSB)"
              className="w-full text-sm border border-parchment-300 rounded px-2.5 py-1.5 focus:outline-none focus:border-burgundy-400"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving || !isDirty || !url.trim()}
              title={!canPersist ? 'Demo: lokal speichern' : undefined}
              className="flex-1 py-1.5 text-sm font-medium bg-burgundy-600 text-white rounded hover:bg-burgundy-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Speichern…' : saved ? '✓ Gespeichert' : canPersist ? 'Speichern' : 'In Demo-Entwurf speichern'}
            </button>
            {hasBasemap && (
              <button
                onClick={handleRemove}
                disabled={saving}
                title={!canPersist ? 'Demo: lokal entfernen' : 'Historische Karte entfernen'}
                className="py-1.5 px-3 text-sm border border-parchment-300 text-ink-500 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-300 disabled:opacity-40 transition-colors"
              >
                Entfernen
              </button>
            )}
          </div>
        </div>

        {/* Vorschau-Hinweis wenn aktiv */}
        {hasBasemap && (
          <div className="mt-4 p-3 bg-verdigris-50 border border-verdigris-200 rounded text-xs text-verdigris-700 space-y-1">
            <p className="font-medium">✓ Historische Karte konfiguriert</p>
            <p className="text-verdigris-600 break-all">{currentModule.basemapLabel || currentModule.basemapUrl}</p>
            <p className="text-verdigris-500">
              Der Stil „Hist. Karte" ist im Karten-Stil-Wechsler (oben links auf der Karte) verfügbar.
            </p>
          </div>
        )}

        {/* Beispiele */}
        <details className="mt-4 group">
          <summary className="text-xs text-ink-400 cursor-pointer hover:text-ink-600 list-none flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
            Beispiel-URLs (öffentlich lizenzierte Karten)
          </summary>
          <ul className="mt-2 space-y-2 text-xs text-ink-500">
            <ExampleUrl
              label="Stamen Watercolor (dekorativ)"
              url="https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg"
              onUse={(u, l) => { setUrl(u); setLabel(l); setSaved(false); }}
            />
            <ExampleUrl
              label="OpenHistoricalMap"
              url="https://tile.openhistoricalmap.org/map/{z}/{x}/{y}.png"
              onUse={(u, l) => { setUrl(u); setLabel(l); setSaved(false); }}
            />
            <ExampleUrl
              label="ESRI World Imagery (Satellit)"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              onUse={(u, l) => { setUrl(u); setLabel(l); setSaved(false); }}
            />
          </ul>
        </details>
      </section>
    </div>
  );
}

function ExampleUrl({ label, url, onUse }: {
  label: string;
  url: string;
  onUse: (url: string, label: string) => void;
}) {
  return (
    <li className="flex items-start gap-2 border border-parchment-200 rounded p-2">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-ink-600">{label}</p>
        <p className="font-mono text-[10px] text-ink-400 break-all mt-0.5">{url}</p>
      </div>
      <button
        onClick={() => onUse(url, label)}
        className="shrink-0 text-[10px] px-2 py-1 border border-parchment-300 rounded hover:bg-parchment-100 text-ink-500"
      >
        Übernehmen
      </button>
    </li>
  );
}
