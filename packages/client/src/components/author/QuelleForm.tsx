import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { SourceType } from '@chronotop/shared';

interface QuelleFormProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

const sourceTypes: SourceType[] = ['text', 'image', 'map', 'statistics', 'law', 'speech', 'object', 'audio', 'video'];

export function QuelleForm({ selectedIds, onChange }: QuelleFormProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const { canPersist } = useAuthorMode();
  const sources = useChronotopStore(s => s.sources);
  const createSource = useChronotopStore(s => s.createSource);

  const [showNew, setShowNew] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<SourceType>('text');
  const [url, setUrl] = useState('');
  const [iiifImageUrl, setIiifImageUrl] = useState('');
  const [license, setLicense] = useState('CC-BY-SA 4.0');
  const [description, setDescription] = useState('');

  const toggleSource = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(s => s !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const handleCreate = async () => {
    if (!title) return;
    const src = await createSource({
      type,
      title,
      url: url || undefined,
      iiifImageUrl: iiifImageUrl || undefined,
      license,
      description: description || undefined,
    });
    onChange([...selectedIds, src.id]);
    setShowNew(false);
    setTitle('');
    setUrl('');
    setIiifImageUrl('');
    setDescription('');
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{t('event.sources')}</label>

      {/* Existing sources as checkboxes */}
      {sources.length > 0 && (
        <div className="max-h-32 overflow-y-auto border border-slate-200 rounded p-2 space-y-1">
          {sources.map(s => (
            <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-1 rounded">
              <input
                type="checkbox"
                checked={selectedIds.includes(s.id)}
                onChange={() => toggleSource(s.id)}
                className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <span className="truncate">{loc(s.title)}</span>
              <span className="text-xs text-slate-400">{t(`source.types.${s.type}`)}</span>
            </label>
          ))}
        </div>
      )}

      {/* Selected count */}
      {selectedIds.length > 0 && (
        <div className="text-xs text-green-600">{selectedIds.length} Quelle(n) gewählt</div>
      )}

      <button
        type="button"
        onClick={() => setShowNew(!showNew)}
        className="text-xs text-amber-600 hover:underline"
      >
        + {t('source.add')}
      </button>

      {showNew && (
        <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={t('source.title')}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <select
            value={type}
            onChange={e => setType(e.target.value as SourceType)}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            {sourceTypes.map(st => (
              <option key={st} value={st}>{t(`source.types.${st}`)}</option>
            ))}
          </select>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder={t('source.url') + ' (optional)'}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="url"
            value={iiifImageUrl}
            onChange={e => setIiifImageUrl(e.target.value)}
            placeholder={t('source.iiifImage') + ' (optional)'}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="text"
            value={license}
            onChange={e => setLicense(e.target.value)}
            placeholder={t('source.license')}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t('source.description') + ' (optional)'}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm h-16 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!title}
            title={!canPersist ? 'Demo: lokal erstellen' : undefined}
            className="text-sm px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {canPersist ? 'Quelle erstellen' : 'In Demo-Entwurf erstellen'}
          </button>
        </div>
      )}
    </div>
  );
}
