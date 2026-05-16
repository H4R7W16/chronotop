import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';

interface RelationEditorProps {
  followsId: string | null;
  partOfId: string | null;
  currentEventId?: string;
  onFollowsChange: (id: string | null) => void;
  onPartOfChange: (id: string | null) => void;
}

export function RelationEditor({ followsId, partOfId, currentEventId, onFollowsChange, onPartOfChange }: RelationEditorProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const events = useChronotopStore(s => s.events);

  const otherEvents = events.filter(e => e.id !== currentEventId);

  return (
    <div className="space-y-2">
      <div>
        <label className="text-sm font-medium text-slate-700">{t('event.followsOn')}</label>
        <select
          value={followsId ?? ''}
          onChange={e => onFollowsChange(e.target.value || null)}
          className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">-- Keines --</option>
          {otherEvents.map(e => (
            <option key={e.id} value={e.id}>{loc(e.title)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-sm font-medium text-slate-700">{t('event.partOf')}</label>
        <select
          value={partOfId ?? ''}
          onChange={e => onPartOfChange(e.target.value || null)}
          className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">-- Keines --</option>
          {otherEvents.map(e => (
            <option key={e.id} value={e.id}>{loc(e.title)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
