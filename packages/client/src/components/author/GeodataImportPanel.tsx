import { useMemo, useState } from 'react';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { parseGeoJsonImport, geometryTypeLabel, countGeometryPoints, type GeoJsonImportItem } from '../../lib/geojsonImport.js';
import { toast } from '../system/toast.js';
import { useAuthorMode } from './authorModeContext.js';
import type { CertaintyLevel } from '@chronotop/shared';

const SAMPLE_URL = '/geodata/neckar-fils-industrial-corridor.geojson';
const EBERSBACH_SAMPLE_URL = '/geodata/ebersbach-geschichtspfad.geojson';

const certaintyOptions: { value: CertaintyLevel; label: string }[] = [
  { value: 'certain', label: 'gesichert' },
  { value: 'probable', label: 'wahrscheinlich' },
  { value: 'reconstructed', label: 'rekonstruiert' },
  { value: 'contested', label: 'umstritten' },
];

export function GeodataImportPanel() {
  const { canPersist } = useAuthorMode();
  const currentModuleId = useChronotopStore(s => s.currentModuleId);
  const createSource = useChronotopStore(s => s.createSource);
  const createPlace = useChronotopStore(s => s.createPlace);

  const [rawText, setRawText] = useState('');
  const [sourceTitle, setSourceTitle] = useState('GeoJSON-Import');
  const [sourceUrl, setSourceUrl] = useState('');
  const [license, setLicense] = useState('Quelle pruefen / nur intern verwenden');
  const [validFrom, setValidFrom] = useState('');
  const [validTo, setValidTo] = useState('');
  const [certainty, setCertainty] = useState<CertaintyLevel>('reconstructed');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [url, setUrl] = useState('');
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [importing, setImporting] = useState(false);

  const parsed = useMemo(() => {
    if (!rawText.trim()) return { items: [] as GeoJsonImportItem[], warnings: [] as string[], error: null as string | null };
    try {
      const result = parseGeoJsonImport(rawText, {
        defaultCertainty: certainty,
        defaultValidFrom: validFrom || undefined,
        defaultValidTo: validTo || undefined,
      });
      return { ...result, error: null };
    } catch (err) {
      return { items: [] as GeoJsonImportItem[], warnings: [] as string[], error: (err as Error).message };
    }
  }, [rawText, certainty, validFrom, validTo]);

  const selectedItems = parsed.items.filter(item => selectedIds.has(item.id));

  function replaceText(next: string, title?: string, srcUrl?: string) {
    setRawText(next);
    if (title) setSourceTitle(title);
    if (srcUrl) setSourceUrl(srcUrl);
    try {
      const result = parseGeoJsonImport(next, {
        defaultCertainty: certainty,
        defaultValidFrom: validFrom || undefined,
        defaultValidTo: validTo || undefined,
      });
      setSelectedIds(new Set(result.items.map(item => item.id)));
    } catch {
      setSelectedIds(new Set());
    }
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    replaceText(text, file.name);
  }

  async function loadSample() {
    setLoadingUrl(true);
    try {
      const res = await fetch(SAMPLE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      replaceText(text, 'Chronotop Demo-Geodaten: Neckar-Fils', SAMPLE_URL);
      setLicense('CC BY 4.0 / Quellenhinweise im GeoJSON');
      toast.success('Kuratierte Neckar-Fils-Geodaten geladen');
    } catch (err) {
      toast.error(`Demo-Geodaten konnten nicht geladen werden: ${(err as Error).message}`);
    } finally {
      setLoadingUrl(false);
    }
  }

  async function loadEbersbachSample() {
    setLoadingUrl(true);
    try {
      const res = await fetch(EBERSBACH_SAMPLE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      replaceText(text, 'Chronotop Demo-Geodaten: Ebersbach Geschichtspfad', EBERSBACH_SAMPLE_URL);
      setLicense('CC BY-SA 4.0 / OSM ODbL fuer Referenzgeometrien / Quellenhinweise im GeoJSON');
      toast.success('Kuratierte Ebersbach-Geodaten geladen');
    } catch (err) {
      toast.error(`Ebersbach-Geodaten konnten nicht geladen werden: ${(err as Error).message}`);
    } finally {
      setLoadingUrl(false);
    }
  }

  async function loadFromUrl() {
    if (!url.trim()) return;
    setLoadingUrl(true);
    try {
      const res = await fetch(url.trim());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      replaceText(text, 'GeoJSON-URL-Import', url.trim());
      toast.success('GeoJSON von URL geladen');
    } catch (err) {
      toast.error(`URL-Import nicht moeglich: ${(err as Error).message}. Wenn die Quelle CORS sperrt, zuerst lokal herunterladen und als Datei importieren.`);
    } finally {
      setLoadingUrl(false);
    }
  }

  function toggleAll() {
    if (selectedIds.size === parsed.items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(parsed.items.map(item => item.id)));
  }

  function toggleItem(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function importSelected() {
    if (!currentModuleId || selectedItems.length === 0) return;
    setImporting(true);
    try {
      const source = await createSource({
        type: 'map',
        title: sourceTitle.trim() || 'GeoJSON-Import',
        url: sourceUrl.trim() || undefined,
        license: license.trim() || 'Quelle pruefen',
        description: [
          'Importierte GeoJSON-Geometrien fuer historische Kartenarbeit.',
          'Sicherheit, Datierung und Lizenz muessen vor Veroeffentlichung geprueft werden.',
        ].join(' '),
      });

      for (const item of selectedItems) {
        await createPlace({
          name: item.name,
          description: buildPlaceDescription(item),
          lat: item.lat,
          lng: item.lng,
          geometry: item.geometry,
          validFrom: item.validFrom || validFrom || undefined,
          validTo: item.validTo || validTo || undefined,
          certainty: item.certainty || certainty,
          sourceOfClaim: source.id,
        });
      }
      toast.success(`${selectedItems.length} Geodaten-Objekte importiert`);
    } catch (err) {
      toast.error(`Import fehlgeschlagen: ${(err as Error).message}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="p-4 border-b border-parchment-200 bg-white">
        <h2 className="text-sm font-semibold text-ink-800">Geodaten importieren</h2>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          GeoJSON als Datei, Text oder URL laden, pruefen und als eigenstaendige Kartenobjekte ins Modul uebernehmen.
        </p>
      </div>

      <div className="p-4 space-y-4">
        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadSample}
              disabled={loadingUrl}
              className="px-3 py-1.5 text-xs font-medium rounded border border-verdigris-200 bg-verdigris-50 text-verdigris-600 hover:bg-verdigris-100 disabled:opacity-50"
            >
              Neckar-Fils Demo laden
            </button>
            <button
              type="button"
              onClick={loadEbersbachSample}
              disabled={loadingUrl}
              className="px-3 py-1.5 text-xs font-medium rounded border border-verdigris-200 bg-verdigris-50 text-verdigris-600 hover:bg-verdigris-100 disabled:opacity-50"
            >
              Ebersbach Demo laden
            </button>
            <label className="px-3 py-1.5 text-xs font-medium rounded border border-parchment-300 text-ink-600 hover:bg-parchment-50 cursor-pointer">
              Datei waehlen
              <input
                type="file"
                accept=".geojson,application/geo+json,application/json"
                className="sr-only"
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              placeholder="https://.../daten.geojson"
              className="input flex-1 text-xs"
            />
            <button
              type="button"
              onClick={loadFromUrl}
              disabled={!url.trim() || loadingUrl}
              className="px-3 py-1.5 text-xs font-medium rounded bg-ink-700 text-white hover:bg-ink-800 disabled:opacity-40"
            >
              URL laden
            </button>
          </div>

          <textarea
            value={rawText}
            onChange={e => replaceText(e.target.value)}
            rows={7}
            placeholder="GeoJSON hier einfuegen..."
            className="input w-full font-mono text-xs leading-relaxed resize-y"
          />
        </section>

        <section className="grid grid-cols-2 gap-3">
          <label className="text-xs text-ink-500 col-span-2">
            Quellentitel
            <input value={sourceTitle} onChange={e => setSourceTitle(e.target.value)} className="input mt-1 w-full text-xs" />
          </label>
          <label className="text-xs text-ink-500 col-span-2">
            Quellen-URL
            <input value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} className="input mt-1 w-full text-xs" />
          </label>
          <label className="text-xs text-ink-500 col-span-2">
            Lizenz
            <input value={license} onChange={e => setLicense(e.target.value)} className="input mt-1 w-full text-xs" />
          </label>
          <label className="text-xs text-ink-500">
            gueltig ab
            <input value={validFrom} onChange={e => setValidFrom(e.target.value)} placeholder="1845" className="input mt-1 w-full text-xs" />
          </label>
          <label className="text-xs text-ink-500">
            gueltig bis
            <input value={validTo} onChange={e => setValidTo(e.target.value)} placeholder="1914" className="input mt-1 w-full text-xs" />
          </label>
          <label className="text-xs text-ink-500 col-span-2">
            Standardsicherheit
            <select
              value={certainty}
              onChange={e => setCertainty(e.target.value as CertaintyLevel)}
              className="input mt-1 w-full text-xs bg-white"
            >
              {certaintyOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </section>

        {parsed.error && (
          <div className="rounded border border-burgundy-200 bg-burgundy-50 px-3 py-2 text-xs text-burgundy-700">
            {parsed.error}
          </div>
        )}

        {parsed.warnings.length > 0 && (
          <div className="rounded border border-gold-200 bg-gold-50 px-3 py-2 text-xs text-gold-600 space-y-1">
            {parsed.warnings.slice(0, 4).map((warning, index) => <p key={index}>{warning}</p>)}
            {parsed.warnings.length > 4 && <p>{parsed.warnings.length - 4} weitere Warnungen.</p>}
          </div>
        )}

        {parsed.items.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">Preview</h3>
                <p className="text-[11px] text-ink-400">{selectedItems.length} von {parsed.items.length} Objekten ausgewaehlt</p>
              </div>
              <button type="button" onClick={toggleAll} className="text-xs text-burgundy-600 hover:underline">
                {selectedIds.size === parsed.items.length ? 'alle abwaehlen' : 'alle waehlen'}
              </button>
            </div>
            <div className="max-h-72 overflow-y-auto border border-parchment-200 rounded divide-y divide-parchment-100">
              {parsed.items.map(item => (
                <label key={item.id} className="flex items-start gap-3 px-3 py-2 hover:bg-parchment-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => toggleItem(item.id)}
                    className="mt-1 accent-burgundy-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-800 truncate">{item.name}</span>
                    <span className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-verdigris-50 text-verdigris-600 border border-verdigris-100">
                        {geometryTypeLabel(item.geometryType)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-parchment-100 text-ink-500 border border-parchment-200">
                        {countGeometryPoints(item)} Punkte
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-parchment-100 text-ink-500 border border-parchment-200">
                        {certaintyOptions.find(option => option.value === item.certainty)?.label ?? item.certainty}
                      </span>
                      {(item.validFrom || item.validTo || validFrom || validTo) && (
                        <span className="px-1.5 py-0.5 rounded bg-gold-50 text-gold-600 border border-gold-100">
                          {item.validFrom || validFrom || 'offen'}-{item.validTo || validTo || 'offen'}
                        </span>
                      )}
                    </span>
                    {sourceSummary(item) && (
                      <span className="mt-1 block text-[11px] leading-snug text-ink-500">
                        Quelle: {sourceSummary(item)}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={importSelected}
              disabled={selectedItems.length === 0 || importing}
              title={!canPersist ? 'Demo: lokal importieren' : undefined}
              className="w-full py-2 rounded bg-burgundy-600 text-white text-sm font-medium hover:bg-burgundy-700 disabled:opacity-40"
            >
              {importing ? 'Importiere...' : canPersist ? `${selectedItems.length} Objekte ins Modul uebernehmen` : `${selectedItems.length} Objekte in Demo-Entwurf uebernehmen`}
            </button>
          </section>
        )}

        <section className="rounded border border-parchment-200 bg-parchment-50 px-3 py-2.5 text-xs leading-relaxed text-ink-500">
          <p className="font-medium text-ink-700">Live-Quellen</p>
          <p className="mt-1">
            OpenHistoricalMap, Wikidata-Geoshapes oder LGL/LEO-BW-Ausleitungen koennen ueber GeoJSON-URL oder als heruntergeladene Datei importiert werden. Quellen ohne CORS bleiben ueber Dateiimport nutzbar.
          </p>
        </section>
      </div>
    </div>
  );
}

function buildPlaceDescription(item: GeoJsonImportItem): string | undefined {
  const lines = [
    item.description,
    `Geometrie: ${geometryTypeLabel(item.geometryType)} mit ${countGeometryPoints(item)} Koordinatenpunkten.`,
    item.qualityStatus ? `Quellenstatus: ${item.qualityStatus}` : undefined,
    item.sourceTitle ? `Quellentitel aus GeoJSON: ${item.sourceTitle}` : undefined,
    item.sourceDetail ? `Fundstelle aus GeoJSON: ${item.sourceDetail}` : undefined,
    item.sourceUrl ? `Quellenhinweis aus GeoJSON: ${item.sourceUrl}` : undefined,
    item.license ? `Lizenzhinweis aus GeoJSON: ${item.license}` : undefined,
  ].filter(Boolean);
  return lines.length > 0 ? lines.join('\n\n') : undefined;
}

function sourceSummary(item: GeoJsonImportItem): string {
  return [
    item.sourceTitle,
    item.sourceDetail,
    item.qualityStatus,
    !item.sourceTitle && !item.sourceDetail ? item.sourceUrl : undefined,
    item.license,
  ].filter(Boolean).join(' · ');
}
