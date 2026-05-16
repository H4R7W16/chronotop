/**
 * TaskEditor — Author-Sidebar-Tab für Aufgabenverwaltung
 *
 * - Aufgaben anlegen, bearbeiten, löschen, sortieren
 * - Inline-Ergebnisansicht: alle Schüler-Antworten pro Aufgabe
 */
import { useState } from 'react';
import { api } from '../../api/client.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { toast } from '../system/toast.js';
import { useAuthorMode } from '../author/authorModeContext.js';

interface Task {
  id: string;
  title: string;
  prompt: string;
  type: 'text' | 'choice';
  options: string[];
  answerKey: string | null;
  targetEventId: string | null;
  position: number;
}

interface TaskAnswer {
  id: string;
  taskId: string;
  userId: string;
  value: string;
  submittedAt: string;
}

interface TaskWithAnswers extends Task {
  answers: TaskAnswer[];
}

type EditorView = 'list' | 'form' | 'results';

export function TaskEditor() {
  const moduleId = useChronotopStore(s => s.currentModuleId);
  const tasks = useChronotopStore(s => s.tasks);
  const deleteTask = useChronotopStore(s => s.deleteTask);
  const { canPersist, blockPersist } = useAuthorMode();
  const [view, setView]         = useState<EditorView>('list');
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [results, setResults]   = useState<TaskWithAnswers[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  async function openResults() {
    if (!moduleId) return;
    if (blockPersist('Ergebnisse laden')) return;
    setLoadingResults(true);
    setView('results');
    try {
      const data = await api.getTaskResults(moduleId);
      setResults(data);
    } finally {
      setLoadingResults(false);
    }
  }

  async function handleDelete(tid: string) {
    if (!moduleId) return;
    if (!confirm('Aufgabe wirklich löschen? Alle Antworten gehen verloren.')) return;
    await deleteTask(tid);
    toast.success('Aufgabe gelöscht.');
  }

  // ---- Render ----

  if (view === 'form') {
    return (
      <TaskForm
        initial={editTask}
        onSaved={() => { setView('list'); setEditTask(null); }}
        onCancel={() => { setView('list'); setEditTask(null); }}
      />
    );
  }

  if (view === 'results') {
    return (
      <ResultsView
        results={results}
        loading={loadingResults}
        onBack={() => setView('list')}
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="shrink-0 px-3 py-2 border-b border-parchment-200 flex items-center gap-2">
        <button
          onClick={() => { setEditTask(null); setView('form'); }}
          className="flex-1 py-1.5 text-xs font-medium rounded bg-burgundy-600 text-white hover:bg-burgundy-700 transition-colors"
          style={{ backgroundColor: '#7B2D42' }}
        >
          + Aufgabe anlegen
        </button>
        <button
          onClick={openResults}
          disabled={!canPersist}
          title={canPersist ? 'Schueler-Antworten ansehen' : 'Demo: Ergebnisse deaktiviert'}
          className="px-2.5 py-1.5 text-xs rounded border border-parchment-300 text-ink-600 hover:bg-parchment-100 transition-colors"
        >
          📊 Ergebnisse
        </button>
      </div>

      {/* Aufgaben-Liste */}
      <div className="flex-1 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-ink-400 p-6 text-center">
            <span className="text-3xl">📋</span>
            <p className="text-sm">Noch keine Aufgaben. Leg jetzt die erste an!</p>
          </div>
        ) : (
          <ul className="divide-y divide-parchment-100">
            {tasks.map((task, idx) => (
              <li key={task.id} className="px-4 py-3 hover:bg-parchment-50 group">
                <div className="flex items-start gap-2">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-parchment-200 text-ink-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    {task.title && (
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-400 mb-0.5">{task.title}</p>
                    )}
                    <p className="text-sm text-ink-800 leading-snug truncate">{task.prompt}</p>
                    <div className="flex gap-2 mt-0.5">
                      <span className="text-[10px] text-ink-400 capitalize">
                        {task.type === 'text' ? '📝 Freitext' : `🔘 Auswahl (${task.options.length})`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => { setEditTask(task); setView('form'); }}
                      className="p-1 rounded text-ink-400 hover:text-ink-700 hover:bg-parchment-200 text-xs"
                      title="Bearbeiten"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="p-1 rounded text-ink-400 hover:text-red-600 hover:bg-red-50 text-xs"
                      title={canPersist ? 'Loeschen' : 'Demo: lokal loeschen'}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Aufgaben-Formular                                                   //
// ------------------------------------------------------------------ //

interface TaskFormProps {
  initial: Task | null;
  onSaved: () => void;
  onCancel: () => void;
}

function TaskForm({ initial, onSaved, onCancel }: TaskFormProps) {
  const { canPersist } = useAuthorMode();
  const createTask = useChronotopStore(s => s.createTask);
  const updateTask = useChronotopStore(s => s.updateTask);
  const [title, setTitle]         = useState(initial?.title ?? '');
  const [prompt, setPrompt]       = useState(initial?.prompt ?? '');
  const [type, setType]           = useState<'text' | 'choice'>(initial?.type ?? 'text');
  const [options, setOptions]     = useState<string[]>(initial?.options ?? ['', '']);
  const [answerKey, setAnswerKey] = useState(initial?.answerKey ?? '');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  function setOption(idx: number, val: string) {
    setOptions(prev => prev.map((o, i) => i === idx ? val : o));
  }
  function addOption()             { setOptions(prev => [...prev, '']); }
  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions(prev => prev.filter((_, i) => i !== idx));
    if (answerKey === options[idx]) setAnswerKey('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!prompt.trim()) { setError('Aufgabentext ist erforderlich.'); return; }
    if (type === 'choice') {
      const filled = options.filter(o => o.trim());
      if (filled.length < 2) { setError('Mindestens 2 Optionen sind erforderlich.'); return; }
    }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        prompt: prompt.trim(),
        type,
        options: type === 'choice' ? options.filter(o => o.trim()) : [],
        answerKey: answerKey.trim() || null,
        position: initial?.position ?? 0,
      };
      if (initial) {
        await updateTask(initial.id, payload);
        toast.success('Aufgabe aktualisiert.');
      } else {
        await createTask(payload);
        toast.success('Aufgabe angelegt.');
      }
      onSaved();
    } catch {
      setError('Speichern fehlgeschlagen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-parchment-200 bg-parchment-50">
        <button onClick={onCancel} className="text-ink-400 hover:text-ink-700 text-sm">←</button>
        <h3 className="font-serif font-semibold text-ink-800 text-sm">
          {initial ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
        </h3>
      </div>

      {/* Formular */}
      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Titel (optional) */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">
            Titel <span className="text-ink-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="z.B. Aufgabe 1 — Ursachen"
            className="w-full text-sm rounded border border-parchment-300 px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-burgundy-400"
          />
        </div>

        {/* Aufgabentext */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-1">
            Aufgabenstellung <span className="text-red-500">*</span>
          </label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={4}
            placeholder="Was sollen die Lernenden herausfinden oder erklären?"
            className="w-full text-sm rounded border border-parchment-300 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-burgundy-400"
          />
        </div>

        {/* Typ */}
        <div>
          <label className="block text-xs font-medium text-ink-600 mb-2">Aufgabentyp</label>
          <div className="flex gap-3">
            {(['text', 'choice'] as const).map(t => (
              <label key={t} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  checked={type === t}
                  onChange={() => setType(t)}
                  className="accent-burgundy-600"
                />
                <span className="text-sm text-ink-700">
                  {t === 'text' ? '📝 Freitext' : '🔘 Mehrfachauswahl'}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Optionen für choice */}
        {type === 'choice' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-ink-600">Auswahloptionen</label>
            {options.map((opt, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="radio"
                  checked={answerKey === opt && !!opt.trim()}
                  onChange={() => setAnswerKey(opt)}
                  title="Als korrekte Antwort markieren"
                  className="shrink-0 accent-verdigris-600"
                  disabled={!opt.trim()}
                />
                <input
                  type="text"
                  value={opt}
                  onChange={e => setOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="flex-1 text-sm rounded border border-parchment-300 px-2 py-1 focus:outline-none focus:ring-1 focus:ring-burgundy-400"
                />
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  disabled={options.length <= 2}
                  className="text-ink-300 hover:text-red-500 disabled:opacity-30 text-xs px-1"
                  title="Option entfernen"
                >
                  ✕
                </button>
              </div>
            ))}
            <p className="text-[10px] text-ink-400">☑ = korrekte Antwort (optional, für Selbstkontrolle)</p>
            <button
              type="button"
              onClick={addOption}
              className="text-xs text-burgundy-600 hover:underline"
            >
              + Option hinzufügen
            </button>
          </div>
        )}

        {/* Musterlösung / Hinweis (für text-Aufgaben) */}
        {type === 'text' && (
          <div>
            <label className="block text-xs font-medium text-ink-600 mb-1">
              Erwartungshorizont <span className="text-ink-400 font-normal">(optional, nur für Lehrkraft)</span>
            </label>
            <textarea
              value={answerKey}
              onChange={e => setAnswerKey(e.target.value)}
              rows={2}
              placeholder="Stichpunkte zur Musterlösung …"
              className="w-full text-sm rounded border border-parchment-300 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-burgundy-400"
            />
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            disabled={saving}
            title={!canPersist ? 'Demo: lokal speichern' : undefined}
            className="flex-1 py-2 text-sm font-medium rounded text-white disabled:opacity-40 transition-colors"
            style={{ backgroundColor: '#7B2D42' }}
          >
            {saving ? 'Speichert …' : canPersist ? (initial ? 'Speichern' : 'Anlegen') : 'In Demo-Entwurf speichern'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded border border-parchment-300 text-ink-600 hover:bg-parchment-100 transition-colors"
          >
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Ergebnisansicht                                                     //
// ------------------------------------------------------------------ //

function ResultsView({ results, loading, onBack }: {
  results: TaskWithAnswers[]; loading: boolean; onBack: () => void;
}) {
  const [openTask, setOpenTask] = useState<string | null>(null);

  const totalAnswers = results.reduce((s, t) => s + t.answers.length, 0);

  return (
    <div className="h-full flex flex-col">
      <div className="shrink-0 flex items-center gap-2 px-4 py-2.5 border-b border-parchment-200 bg-parchment-50">
        <button onClick={onBack} className="text-ink-400 hover:text-ink-700 text-sm">←</button>
        <h3 className="font-serif font-semibold text-ink-800 text-sm flex-1">📊 Schüler-Ergebnisse</h3>
        <span className="text-xs text-ink-400">{totalAnswers} Antworten</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {loading && (
          <p className="text-center text-ink-400 text-sm py-8">Lade Ergebnisse …</p>
        )}
        {!loading && results.length === 0 && (
          <p className="text-center text-ink-400 text-sm py-8">Keine Aufgaben vorhanden.</p>
        )}
        {!loading && results.map((task, idx) => (
          <div key={task.id} className="border border-parchment-200 rounded-lg overflow-hidden">
            {/* Aufgaben-Kopf */}
            <button
              className="w-full px-4 py-3 flex items-start gap-2 text-left hover:bg-parchment-50 transition-colors"
              onClick={() => setOpenTask(openTask === task.id ? null : task.id)}
            >
              <span className="shrink-0 w-5 h-5 rounded-full bg-parchment-200 text-ink-500 text-[10px] font-bold flex items-center justify-center mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink-800 truncate leading-snug">{task.prompt}</p>
                <p className="text-xs text-ink-400 mt-0.5">{task.answers.length} Antworten</p>
              </div>
              <span className="text-ink-300 text-xs shrink-0">
                {openTask === task.id ? '▲' : '▼'}
              </span>
            </button>

            {/* Antworten (expandierbar) */}
            {openTask === task.id && (
              <div className="border-t border-parchment-100">
                {task.answers.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-ink-400 italic">Noch keine Antworten.</p>
                ) : (
                  <ul className="divide-y divide-parchment-100">
                    {task.answers.map((ans, aIdx) => (
                      <li key={ans.id} className="px-4 py-2.5">
                        <div className="flex items-start gap-2">
                          <span className="text-xs text-ink-300 shrink-0 mt-0.5">#{aIdx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-ink-800 leading-snug">{ans.value}</p>
                            <p className="text-[10px] text-ink-300 mt-0.5">
                              {new Date(ans.submittedAt).toLocaleString('de-DE')}
                            </p>
                          </div>
                          {/* Antwort korrekt? (bei choice) */}
                          {task.type === 'choice' && task.answerKey && (
                            <span className={`text-xs shrink-0 ${ans.value === task.answerKey ? 'text-verdigris-600' : 'text-red-400'}`}>
                              {ans.value === task.answerKey ? '✓' : '✗'}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Erwartungshorizont */}
                {task.answerKey && task.type === 'text' && (
                  <div className="px-4 py-2.5 bg-parchment-50 border-t border-parchment-100">
                    <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wide mb-1">Erwartungshorizont</p>
                    <p className="text-xs text-ink-600 italic">{task.answerKey}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
