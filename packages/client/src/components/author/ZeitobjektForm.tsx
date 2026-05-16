import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { CertaintyLevel } from '@chronotop/shared';

interface ZeitobjektFormProps {
  value: string | null;
  onChange: (timeObjectId: string) => void;
}

export function ZeitobjektForm({ value, onChange }: ZeitobjektFormProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const { canPersist } = useAuthorMode();
  const timeObjects = useChronotopStore(s => s.timeObjects);
  const createTimeObject = useChronotopStore(s => s.createTimeObject);

  const [type, setType] = useState<'instant' | 'span'>('instant');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [label, setLabel] = useState('');
  const [certainty, setCertainty] = useState<CertaintyLevel>('certain');
  const [showNew, setShowNew] = useState(false);

  const handleCreate = async () => {
    if (!label) return;
    const to = await createTimeObject({
      type,
      date: type === 'instant' ? date : undefined,
      startDate: type === 'span' ? startDate : undefined,
      endDate: type === 'span' ? endDate : undefined,
      certainty,
      label,
    });
    onChange(to.id);
    setShowNew(false);
    setDate('');
    setStartDate('');
    setEndDate('');
    setLabel('');
  };

  return (
    <div className="space-y-2">
      <label htmlFor="event-time-select" className="text-sm font-medium text-slate-700">{t('event.time')}</label>

      {/* Existing selector */}
      {timeObjects.length > 0 && (
        <select
          id="event-time-select"
          aria-label={t('event.time')}
          value={value ?? ''}
          onChange={e => onChange(e.target.value)}
          className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
        >
          <option value="">-- Zeitobjekt wählen --</option>
          {timeObjects.map(to => (
            <option key={to.id} value={to.id}>{loc(to.label)}</option>
          ))}
        </select>
      )}

      <button
        type="button"
        onClick={() => setShowNew(!showNew)}
        className="text-xs text-amber-600 hover:underline"
      >
        + Neues Zeitobjekt
      </button>

      {showNew && (
        <div className="space-y-2 bg-slate-50 p-3 rounded border border-slate-200">
          {/* Type toggle */}
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setType('instant')}
              className={`px-3 py-1 rounded ${type === 'instant' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-300'}`}
            >
              {t('time.instant')}
            </button>
            <button
              type="button"
              onClick={() => setType('span')}
              className={`px-3 py-1 rounded ${type === 'span' ? 'bg-amber-500 text-white' : 'bg-white border border-slate-300'}`}
            >
              {t('time.span')}
            </button>
          </div>

          {/* Date inputs */}
          {type === 'instant' ? (
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          ) : (
            <div className="flex gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                placeholder={t('time.startDate')}
                className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder={t('time.endDate')}
                className="flex-1 border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          )}

          {/* Label */}
          <input
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            placeholder={t('time.label') + ' (z.B. "um 1523", "Herbst 1989")'}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />

          {/* Certainty */}
          <select
            value={certainty}
            onChange={e => setCertainty(e.target.value as CertaintyLevel)}
            className="w-full border border-slate-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          >
            <option value="certain">{t('time.certain')}</option>
            <option value="probable">{t('time.probable')}</option>
            <option value="contested">{t('time.contested')}</option>
            <option value="reconstructed">{t('time.reconstructed')}</option>
          </select>

          <button
            type="button"
            onClick={handleCreate}
            disabled={!label || (type === 'instant' ? !date : !startDate || !endDate)}
            title={!canPersist ? 'Demo: lokal erstellen' : undefined}
            className="text-sm px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-700 disabled:opacity-50"
          >
            {canPersist ? 'Zeitobjekt erstellen' : 'In Demo-Entwurf erstellen'}
          </button>
        </div>
      )}
    </div>
  );
}
