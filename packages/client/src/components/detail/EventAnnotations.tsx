import { useEffect, useState } from 'react';
import { api } from '../../api/client.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { toast } from '../system/toast.js';
import { useLocalized } from '../../i18n/useLocalized.js';
import type { Annotation, AnnotationMotivation } from '@chronotop/shared';

interface Props {
  eventId: string;
}

const motivationLabel: Record<AnnotationMotivation, string> = {
  commenting: 'Kommentar',
  classifying: 'Klassifikation',
  linking: 'Verbindung',
  tagging: 'Schlagwort',
  describing: 'Beschreibung',
  identifying: 'Identifikation',
};

const motivationColor: Record<AnnotationMotivation, string> = {
  commenting:   'bg-verdigris-50 text-verdigris-700 border-verdigris-200',
  classifying:  'bg-gold-50      text-gold-700      border-gold-200',
  linking:      'bg-burgundy-50  text-burgundy-700  border-burgundy-200',
  tagging:      'bg-parchment-100 text-ink-600      border-parchment-300',
  describing:   'bg-parchment-100 text-ink-600      border-parchment-300',
  identifying:  'bg-parchment-100 text-ink-600      border-parchment-300',
};

/**
 * Zeigt interpretative Annotationen zu einem Ereignis und erlaubt das Anlegen
 * neuer Kommentare. Wichtig: Die Annotation-Schicht ist klar getrennt von den
 * faktischen Eigenschaften des Ereignisses (Ort, Zeit, Akteure, Quellen).
 * Eine Annotation ist eine Aussage *über* das Ereignis — eine Deutung, ein
 * Vergleich, eine Einordnung.
 */
export function EventAnnotations({ eventId }: Props) {
  const loc = useLocalized();
  const moduleId = useChronotopStore(s => s.currentModuleId);
  const [annotations, setAnnotations] = useState<Annotation[] | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [motivation, setMotivation] = useState<AnnotationMotivation>('commenting');
  const [creator, setCreator] = useState('');
  const [saving, setSaving] = useState(false);

  // Laden, wann Event gewechselt wird
  useEffect(() => {
    if (!moduleId) return;
    let active = true;
    api.getAnnotationsForTarget(moduleId, 'event', eventId)
      .then(list => { if (active) setAnnotations(list); })
      .catch(() => { if (active) setAnnotations([]); });
    return () => { active = false; };
  }, [moduleId, eventId]);

  const handleSave = async () => {
    if (!moduleId || !text.trim()) return;
    setSaving(true);
    try {
      const created = await api.createAnnotation(moduleId, {
        motivation,
        body: { type: 'text', value: text.trim() },
        target: [{ kind: 'event', id: eventId }],
        creator: creator.trim() || undefined,
      });
      setAnnotations(prev => [created, ...(prev ?? [])]);
      setText(''); setCreator(''); setShowForm(false);
      toast.success('Annotation gespeichert');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!moduleId) return;
    if (!confirm('Annotation löschen?')) return;
    await api.deleteAnnotation(moduleId, id);
    setAnnotations(prev => (prev ?? []).filter(a => a.id !== id));
  };

  // Trenne Lehrer- und Lernenden-Annotationen
  const authorAnnotations = (annotations ?? []).filter(a => a.creatorRole === 'author' || !a.creatorRole);
  const learnerAnnotations = (annotations ?? []).filter(a => a.creatorRole === 'learner');

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-serif text-ink-500 text-xs uppercase tracking-wider">
          Interpretationen
          {annotations && <span className="ml-1.5 text-ink-400 normal-case font-sans">({annotations.length})</span>}
        </h3>
        {!showForm && (
          <button onClick={() => setShowForm(true)}
            className="text-[11px] px-2 py-0.5 border border-parchment-300 rounded hover:bg-parchment-100 text-ink-600">
            + neu
          </button>
        )}
      </div>

      {showForm && (
        <div className="mb-3 bg-parchment-50 border border-parchment-200 rounded p-3 space-y-2">
          <div className="flex flex-wrap gap-1">
            {(['commenting', 'classifying', 'linking', 'tagging'] as AnnotationMotivation[]).map(m => (
              <button key={m} onClick={() => setMotivation(m)}
                className={`text-[10px] px-2 py-0.5 rounded border ${motivation === m ? motivationColor[m] + ' ring-1 ring-current' : 'bg-white border-parchment-300 text-ink-500'}`}>
                {motivationLabel[m]}
              </button>
            ))}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Deutung, Einordnung, Vergleich, Beleg-Notiz …"
            className="w-full input h-20 text-xs"
            autoFocus
          />
          <input
            type="text"
            value={creator}
            onChange={e => setCreator(e.target.value)}
            placeholder="Verfasser:in (optional)"
            className="w-full input text-xs"
          />
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={!text.trim() || saving}
              className="text-xs px-3 py-1 bg-burgundy-500 text-white rounded hover:bg-burgundy-600 disabled:opacity-40">
              {saving ? '…' : 'Speichern'}
            </button>
            <button onClick={() => { setShowForm(false); setText(''); }}
              className="text-xs px-3 py-1 border border-parchment-300 rounded text-ink-600 hover:bg-white">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {annotations && annotations.length === 0 && !showForm && (
        <p className="text-[11px] text-ink-400 italic">
          Noch keine Interpretationen. Lehrerdeutungen und Klassen-Hypothesen zeigen
          kontextualisierte Aussagen, strukturell getrennt von den faktischen Eigenschaften.
        </p>
      )}

      {annotations === null && (
        <p className="text-[11px] text-ink-400 italic">Lade Interpretationen …</p>
      )}

      {/* Lehrer-Annotationen */}
      {authorAnnotations.length > 0 && (
        <div className="mb-3">
          <div className="text-[10px] font-semibold text-ink-600 uppercase tracking-wider mb-1.5">
            Lehrerdeutungen
          </div>
          <ul className="space-y-1.5">
            {authorAnnotations.map(a => {
              const text = a.body.type === 'text' ? loc(a.body.value) : `[${a.body.type}]`;
              return (
                <li key={a.id} className="group bg-parchment-50 border border-parchment-200 rounded p-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap ${motivationColor[a.motivation]}`}>
                      {motivationLabel[a.motivation]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink-700 leading-snug whitespace-pre-wrap">{text}</p>
                      <p className="text-[10px] text-ink-400 mt-1">
                        {a.creator && <span>{a.creator} · </span>}
                        {a.createdAt && new Date(a.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-burgundy-700 text-sm leading-none"
                      aria-label="Annotation löschen"
                    >×</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Lernenden-Annotationen: "Hypothesen der Klasse" */}
      {learnerAnnotations.length > 0 && (
        <div className="border-t border-parchment-200 pt-3 mt-3">
          <div className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider mb-1.5 opacity-75">
            Hypothesen der Klasse
          </div>
          <ul className="space-y-1.5 opacity-85">
            {learnerAnnotations.map(a => {
              const text = a.body.type === 'text' ? loc(a.body.value) : `[${a.body.type}]`;
              return (
                <li key={a.id} className="group bg-ink-50 border border-ink-200 rounded p-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded border whitespace-nowrap bg-ink-100 text-ink-600 border-ink-300">
                      {motivationLabel[a.motivation]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-ink-700 leading-snug whitespace-pre-wrap">{text}</p>
                      <p className="text-[10px] text-ink-400 mt-1">
                        {a.creator && <span>{a.creator} · </span>}
                        {a.createdAt && new Date(a.createdAt).toLocaleString('de-DE')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="opacity-0 group-hover:opacity-100 text-ink-400 hover:text-burgundy-700 text-sm leading-none"
                      aria-label="Annotation löschen"
                    >×</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
