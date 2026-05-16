import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { OrtPicker } from './OrtPicker.js';
import { ZeitobjektForm } from './ZeitobjektForm.js';
import { QuelleForm } from './QuelleForm.js';
import { RelationEditor } from './RelationEditor.js';
import { AkteurePicker } from './AkteurePicker.js';
import { BegriffePicker } from './BegriffePicker.js';
import { LocalizedInput } from '../shared/LocalizedInput.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import { useAuthorMode } from './authorModeContext.js';
import type { Event, LocalizedString } from '@chronotop/shared';

interface EreignisFormProps {
  editEvent?: Event | null;
  onSaved: () => void;
  onCancel: () => void;
  mapClickLngLat?: { lng: number; lat: number } | null;
}

export function EreignisForm({ editEvent, onSaved, onCancel, mapClickLngLat }: EreignisFormProps) {
  const { t } = useTranslation();
  const loc = useLocalized();
  const { canPersist } = useAuthorMode();
  const createEvent = useChronotopStore(s => s.createEvent);
  const updateEvent = useChronotopStore(s => s.updateEvent);

  const [title, setTitle] = useState<LocalizedString>('');
  const [description, setDescription] = useState<LocalizedString>('');
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [timeObjectId, setTimeObjectId] = useState<string | null>(null);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [actorIds, setActorIds] = useState<{ actorId: string; role?: string }[]>([]);
  const [conceptIds, setConceptIds] = useState<string[]>([]);
  const [followsId, setFollowsId] = useState<string | null>(null);
  const [partOfId, setPartOfId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Fill form if editing
  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description);
      setPlaceId(editEvent.placeId);
      setTimeObjectId(editEvent.timeObjectId);
      setSourceIds(editEvent.sources?.map(s => s.id) ?? []);
      setActorIds(editEvent.actors?.map(a => ({ actorId: a.actor.id, role: a.role })) ?? []);
      setConceptIds(editEvent.concepts?.map(c => c.id) ?? []);
      setFollowsId(editEvent.followsId ?? null);
      setPartOfId(editEvent.partOfId ?? null);
    }
  }, [editEvent]);

  const handleSave = async () => {
    const titleDe = loc(title);
    if (!titleDe || !placeId || !timeObjectId) return;
    setSaving(true);
    try {
      if (editEvent) {
        await updateEvent(editEvent.id, { title, description, placeId, timeObjectId, sourceIds, actorIds, conceptIds, followsId, partOfId });
      } else {
        await createEvent({ title, description, placeId, timeObjectId, sourceIds, actorIds, conceptIds, followsId, partOfId });
      }
      onSaved();
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const isValid = loc(title) && placeId && timeObjectId;

  return (
    <div className="space-y-4">
      <h3 className="font-serif text-xl font-semibold text-ink-700">
        {editEvent ? 'Ereignis bearbeiten' : t('event.create')}
      </h3>

      {/* Title */}
      <div>
        <label htmlFor="event-title" className="text-sm font-medium text-ink-600">{t('event.title')}</label>
        <div className="mt-1">
          <LocalizedInput
            id="event-title"
            value={title}
            onChange={setTitle}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="event-description" className="text-sm font-medium text-ink-600">{t('event.description')}</label>
        <div className="mt-1">
          <LocalizedInput
            id="event-description"
            value={description}
            onChange={setDescription}
            multiline
            rows={4}
          />
        </div>
      </div>

      {/* Place */}
      <OrtPicker value={placeId} onChange={setPlaceId} mapClickLngLat={mapClickLngLat} />

      {/* Time */}
      <ZeitobjektForm value={timeObjectId} onChange={setTimeObjectId} />

      {/* Sources */}
      <QuelleForm selectedIds={sourceIds} onChange={setSourceIds} />

      {/* Actors */}
      <AkteurePicker selected={actorIds} onChange={setActorIds} />

      {/* Concepts */}
      <BegriffePicker selected={conceptIds} onChange={setConceptIds} />

      {/* Relations */}
      <RelationEditor
        followsId={followsId}
        partOfId={partOfId}
        currentEventId={editEvent?.id}
        onFollowsChange={setFollowsId}
        onPartOfChange={setPartOfId}
      />

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-parchment-200">
        <button
          onClick={handleSave}
          disabled={!isValid || saving}
          className="flex-1 bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium text-sm transition-colors shadow-sm"
        >
          {saving ? '…' : canPersist ? t('event.save') : 'In Demo-Entwurf speichern'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border border-parchment-300 rounded-md text-ink-600 text-sm hover:bg-parchment-100 transition-colors"
        >
          {t('event.cancel')}
        </button>
      </div>
    </div>
  );
}
