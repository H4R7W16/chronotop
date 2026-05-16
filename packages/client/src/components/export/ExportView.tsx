import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModuleData } from '../../hooks/useModuleData.js';
import { api } from '../../api/client.js';
import { toast } from '../system/toast.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';

interface RevisionListItem {
  id: string;
  version: string;
  message?: string;
  creator?: string;
  createdAt?: string;
}

export function ExportView() {
  const { t } = useTranslation();
  const moduleId = useModuleData();
  const currentModule = useChronotopStore(s => s.currentModule);
  const places = useChronotopStore(s => s.places);
  const timeObjects = useChronotopStore(s => s.timeObjects);
  const sources = useChronotopStore(s => s.sources);
  const actors = useChronotopStore(s => s.actors);
  const concepts = useChronotopStore(s => s.concepts);
  const events = useChronotopStore(s => s.events);
  const movements = useChronotopStore(s => s.movements);
  const tasks = useChronotopStore(s => s.tasks);
  const demoDraftMode = useChronotopStore(s => s.demoDraftMode);
  const demoDraftDirty = useChronotopStore(s => s.demoDraftDirty);
  const [jsonLd, setJsonLd] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Revisionen
  const [revisions, setRevisions] = useState<RevisionListItem[]>([]);
  const [selectedRevId, setSelectedRevId] = useState<string | null>(null);
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [versionInput, setVersionInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [creatorInput, setCreatorInput] = useState('');
  const [publishing, setPublishing] = useState(false);

  const moduleDraft = useMemo(() => {
    if (!currentModule) return null;
    return {
      schema: 'chronotop.module-draft.v1',
      exportedAt: new Date().toISOString(),
      source: demoDraftMode ? 'demo-local-browser-draft' : 'server-loaded-state',
      note: demoDraftMode
        ? 'Dieser Entwurf stammt aus dem Demo-Autorentool. Bearbeitungen wurden lokal im Browserzustand vorgenommen und nicht auf dem Server gespeichert.'
        : 'Snapshot des aktuell geladenen Modulzustands.',
      demoDraftDirty,
      module: currentModule,
      places,
      timeObjects,
      sources,
      actors,
      concepts,
      events,
      movements,
      tasks,
    };
  }, [currentModule, demoDraftDirty, demoDraftMode, places, timeObjects, sources, actors, concepts, events, movements, tasks]);

  // Aktuellen JSON-LD-Stand laden
  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    api.getJsonLd(moduleId).then(data => {
      setJsonLd(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [moduleId]);

  // Revisionen laden
  useEffect(() => {
    if (!moduleId) return;
    api.getRevisions(moduleId).then(setRevisions).catch(() => setRevisions([]));
  }, [moduleId]);

  const handleDownload = () => {
    if (!jsonLd) return;
    const filename = selectedRevId
      ? `chronotop-${moduleId}-${revisions.find(r => r.id === selectedRevId)?.version}.jsonld`
      : `chronotop-${moduleId}.jsonld`;
    downloadJson(jsonLd, filename, 'application/ld+json');
  };

  const handleDownloadDraft = () => {
    if (!moduleDraft || !currentModule || !moduleId) return;
    const title = localizedTitle(currentModule.title, moduleId);
    const suffix = demoDraftMode ? 'demo-entwurf' : 'snapshot';
    downloadJson(moduleDraft, `chronotop-modul-${filenameSafe(title)}-${suffix}.json`);
    toast.success(demoDraftMode ? 'Demo-Entwurf exportiert' : 'Modul-Snapshot exportiert');
  };

  const handlePublish = async () => {
    if (!moduleId || !versionInput.trim()) return;
    if (demoDraftMode) {
      toast.info('Demo-Entwuerfe koennen heruntergeladen, aber nicht als Server-Revision veroeffentlicht werden.');
      return;
    }
    setPublishing(true);
    try {
      const created = await api.createRevision(moduleId, {
        version: versionInput.trim(),
        message: messageInput.trim() || undefined,
        creator: creatorInput.trim() || undefined,
      });
      setRevisions(prev => [
        {
          id: created.id, version: created.version,
          message: created.message, creator: created.creator,
          createdAt: created.createdAt,
        },
        ...prev,
      ]);
      setShowPublishForm(false);
      setVersionInput(''); setMessageInput(''); setCreatorInput('');
      toast.success(`Version ${created.version} festgeschrieben`);
    } finally {
      setPublishing(false);
    }
  };

  const handleSelectRevision = async (rid: string | null) => {
    if (!moduleId) return;
    setSelectedRevId(rid);
    if (!rid) {
      // Aktuellen Stand laden
      const data = await api.getJsonLd(moduleId);
      setJsonLd(data);
      return;
    }
    const rev = await api.getRevision(moduleId, rid);
    setJsonLd(rev.snapshot);
  };

  const handleDelete = async (rid: string) => {
    if (!moduleId) return;
    if (demoDraftMode) {
      toast.info('Revisionen koennen im Demo-Modus nicht geloescht werden.');
      return;
    }
    if (!confirm('Diese Revision löschen? Der Zitier-Link wird ungültig.')) return;
    await api.deleteRevision(moduleId, rid);
    setRevisions(prev => prev.filter(r => r.id !== rid));
    if (selectedRevId === rid) handleSelectRevision(null);
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold text-ink-800">{t('export.title')}</h1>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            disabled={!jsonLd}
            className="bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-40 text-white px-5 py-2 rounded-md font-medium"
          >
            {t('export.download')}
          </button>
        </div>
      </div>

      {/* Modul-Entwurf */}
      <section className="bg-white border border-parchment-200 rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink-700">Modul-Entwurf exportieren</h2>
            <p className="text-xs text-ink-500 mt-1 leading-relaxed max-w-2xl">
              Das ist der wichtigste Demo-Export: Er enthaelt Modul, Ereignisse, Orte, Flaechen, Routen,
              Quellen, Akteure, Begriffe und Aufgaben aus dem aktuell geladenen Browserzustand.
              Ein Import in die Demo ist absichtlich noch nicht aktiviert.
            </p>
            {demoDraftMode && (
              <p className="text-xs text-burgundy-600 mt-2">
                Demo-Modus: Bearbeitungen bleiben lokal bis zum Neuladen der Seite und koennen hier als Entwurf gesichert werden.
              </p>
            )}
          </div>
          <button
            onClick={handleDownloadDraft}
            disabled={!moduleDraft}
            className="shrink-0 bg-verdigris-600 hover:bg-verdigris-700 disabled:opacity-40 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Bearbeiteten Modulstand herunterladen
          </button>
        </div>
      </section>

      {/* Revisionen */}
      <section className="bg-white border border-parchment-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-serif text-lg font-semibold text-ink-700">Versionen</h2>
            <p className="text-xs text-ink-400 mt-0.5">
              Eine Version friert den aktuellen Modul-Stand zitierfähig ein.
              Frühere Versionen bleiben über ihren Permalink erreichbar.
            </p>
          </div>
          {!showPublishForm && (
            <button
              onClick={() => setShowPublishForm(true)}
              disabled={demoDraftMode}
              title={demoDraftMode ? 'Demo-Entwuerfe koennen nur heruntergeladen werden' : undefined}
              className="text-sm border border-parchment-300 hover:bg-parchment-100 px-3 py-1.5 rounded-md text-ink-600 disabled:opacity-40 disabled:hover:bg-white">
              + Aktuellen Stand veröffentlichen
            </button>
          )}
        </div>

        {demoDraftMode && (
          <p className="mb-3 text-xs text-ink-500 bg-parchment-50 border border-parchment-200 rounded px-3 py-2">
            Server-Revisionen sind in der Demo gesperrt. Fuer Tests bitte den Modul-Entwurf oben herunterladen.
          </p>
        )}

        {showPublishForm && !demoDraftMode && (
          <div className="mb-4 bg-parchment-50 border border-parchment-200 rounded p-4 space-y-2">
            <div className="grid sm:grid-cols-3 gap-2">
              <input value={versionInput} onChange={e => setVersionInput(e.target.value)}
                placeholder="Version (z.B. 1.0.0)"
                className="input text-sm" autoFocus />
              <input value={creatorInput} onChange={e => setCreatorInput(e.target.value)}
                placeholder="Verfasser:in (optional)"
                className="input text-sm" />
              <input value={messageInput} onChange={e => setMessageInput(e.target.value)}
                placeholder="Notiz: Was hat sich geändert?"
                className="input text-sm sm:col-span-1" />
            </div>
            <div className="flex gap-2">
              <button onClick={handlePublish} disabled={!versionInput.trim() || publishing}
                className="text-sm bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-md">
                {publishing ? '…' : 'Veröffentlichen'}
              </button>
              <button onClick={() => setShowPublishForm(false)}
                className="text-sm border border-parchment-300 hover:bg-white px-3 py-1.5 rounded-md text-ink-600">
                Abbrechen
              </button>
            </div>
          </div>
        )}

        <div className="space-y-1.5">
          <RevisionRow
            isSelected={selectedRevId === null}
            label="Aktueller Stand (live)"
            sublabel="unveröffentlicht — verändert sich mit jeder Bearbeitung"
            onClick={() => handleSelectRevision(null)}
          />
          {revisions.map(r => (
            <RevisionRow
              key={r.id}
              isSelected={selectedRevId === r.id}
              label={`v${r.version}`}
              sublabel={[
                r.message,
                r.creator,
                r.createdAt ? new Date(r.createdAt).toLocaleString('de-DE') : null,
              ].filter(Boolean).join(' · ')}
              onClick={() => handleSelectRevision(r.id)}
              onDelete={demoDraftMode ? undefined : () => handleDelete(r.id)}
              permalink={moduleId ? `${window.location.origin}/api/v1/modules/${moduleId}/revisions/${r.id}` : undefined}
            />
          ))}
        </div>
      </section>

      {/* JSON-LD-Anzeige */}
      <section>
        <h2 className="font-serif text-lg font-semibold text-ink-700 mb-2">
          JSON-LD {selectedRevId ? '(Revision)' : '(aktueller Stand)'}
        </h2>
        {loading ? (
          <p className="text-ink-400">{t('common.loading')}</p>
        ) : jsonLd ? (
          <div className="bg-ink-700 rounded-lg p-5 overflow-auto max-h-[60vh]">
            <pre className="text-parchment-100 text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(jsonLd, null, 2)}
            </pre>
          </div>
        ) : (
          <p className="text-ink-400">Kein Modul gefunden.</p>
        )}
      </section>
    </div>
  );
}

function downloadJson(data: unknown, filename: string, type = 'application/json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function localizedTitle(value: any, fallback: string): string {
  if (typeof value === 'string' && value.trim()) return value;
  if (value && typeof value === 'object') {
    const first = Object.values(value).find(v => typeof v === 'string' && v);
    return typeof value.de === 'string' && value.de ? value.de : (first as string | undefined) ?? fallback;
  }
  return fallback;
}

function filenameSafe(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'modul';
}

function RevisionRow({
  isSelected, label, sublabel, onClick, onDelete, permalink,
}: {
  isSelected: boolean; label: string; sublabel?: string;
  onClick: () => void; onDelete?: () => void; permalink?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 rounded border cursor-pointer transition-colors ${
      isSelected
        ? 'border-burgundy-300 bg-burgundy-50'
        : 'border-parchment-200 hover:bg-parchment-50'
    }`} onClick={onClick}>
      <div className="min-w-0">
        <div className="font-medium text-ink-700 text-sm">{label}</div>
        {sublabel && <div className="text-[11px] text-ink-400 truncate">{sublabel}</div>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {permalink && (
          <button
            onClick={e => {
              e.stopPropagation();
              navigator.clipboard?.writeText(permalink);
              toast.success('Zitierlink kopiert');
            }}
            className="text-[11px] text-burgundy-600 hover:underline"
            title={permalink}
          >
            Zitierlink kopieren
          </button>
        )}
        {onDelete && (
          <button onClick={e => { e.stopPropagation(); onDelete(); }}
            className="text-[11px] text-ink-400 hover:text-burgundy-700">
            ×
          </button>
        )}
      </div>
    </div>
  );
}
