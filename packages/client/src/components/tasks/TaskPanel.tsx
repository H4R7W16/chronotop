/**
 * TaskPanel — Lern-Modus-Panel für Aufgaben
 *
 * Zeigt alle Aufgaben eines Moduls, ermöglicht das Beantworten und
 * markiert bereits beantwortete Aufgaben.
 */
import { useEffect, useState, useCallback } from 'react';
import { api } from '../../api/client.js';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { toast } from '../system/toast.js';

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
  value: string;
  submittedAt: string;
}

export function TaskPanel() {
  const moduleId = useChronotopStore(s => s.currentModuleId);
  const user = useAuthStore(s => s.user);

  const [tasks, setTasks]     = useState<Task[]>([]);
  const [answers, setAnswers] = useState<Record<string, TaskAnswer>>({});  // taskId → answer
  const [loading, setLoading] = useState(false);
  const [drafts, setDrafts]   = useState<Record<string, string>>({});      // taskId → draft value
  const [saving, setSaving]   = useState<Record<string, boolean>>({});

  const loadData = useCallback(async () => {
    if (!moduleId) return;
    setLoading(true);
    try {
      const [taskList, myAnswers] = await Promise.all([
        api.getTasks(moduleId),
        user ? api.getMyAnswers(moduleId) : Promise.resolve([]),
      ]);
      setTasks(taskList);
      const answerMap: Record<string, TaskAnswer> = {};
      for (const ans of myAnswers) answerMap[ans.taskId] = ans;
      setAnswers(answerMap);
      // Drafts mit vorhandenen Antworten vorbelegen
      const draftMap: Record<string, string> = {};
      for (const ans of myAnswers) draftMap[ans.taskId] = ans.value;
      setDrafts(prev => ({ ...draftMap, ...prev })); // bereits getippte Drafts nicht überschreiben
    } finally {
      setLoading(false);
    }
  }, [moduleId, user]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSubmit(taskId: string) {
    const value = drafts[taskId]?.trim();
    if (!value) { toast.error('Bitte eine Antwort eingeben.'); return; }
    setSaving(s => ({ ...s, [taskId]: true }));
    try {
      const answer = await api.submitAnswer(moduleId!, taskId, value);
      setAnswers(prev => ({ ...prev, [taskId]: answer }));
      toast.success('Antwort gespeichert.');
    } finally {
      setSaving(s => ({ ...s, [taskId]: false }));
    }
  }

  async function handleRetract(taskId: string) {
    setSaving(s => ({ ...s, [taskId]: true }));
    try {
      await api.deleteAnswer(moduleId!, taskId);
      setAnswers(prev => { const n = { ...prev }; delete n[taskId]; return n; });
      toast.success('Antwort zurückgezogen.');
    } finally {
      setSaving(s => ({ ...s, [taskId]: false }));
    }
  }

  if (!moduleId) return null;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-ink-400 text-sm">
        Aufgaben werden geladen …
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-2 text-ink-400 p-6 text-center">
        <p className="text-sm">Für dieses Modul sind noch keine Aufgaben angelegt.</p>
      </div>
    );
  }

  const answered = Object.keys(answers).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Kopfzeile */}
      <div className="shrink-0 px-4 py-2.5 border-b border-parchment-200 bg-parchment-50">
        <div className="flex items-center justify-between">
          <h2 className="font-serif font-semibold text-ink-800 text-sm">
            Aufgaben
          </h2>
          <span className="text-xs text-ink-400">
            {answered} / {tasks.length} beantwortet
          </span>
        </div>
        {/* Fortschrittsbalken */}
        <div className="mt-1.5 h-1.5 bg-parchment-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-burgundy-500 rounded-full transition-all"
            style={{ width: tasks.length > 0 ? `${(answered / tasks.length) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Aufgaben-Liste */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {!user && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-3 py-2 text-xs text-amber-800">
            Melde dich an, um Aufgaben zu beantworten.
          </div>
        )}
        {tasks.map((task, idx) => (
          <TaskItem
            key={task.id}
            task={task}
            index={idx}
            answer={answers[task.id] ?? null}
            draft={drafts[task.id] ?? ''}
            onDraftChange={v => setDrafts(prev => ({ ...prev, [task.id]: v }))}
            onSubmit={() => handleSubmit(task.id)}
            onRetract={() => handleRetract(task.id)}
            isSaving={saving[task.id] ?? false}
            disabled={!user}
          />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
//  Einzelne Aufgabe                                                    //
// ------------------------------------------------------------------ //

interface TaskItemProps {
  task: Task;
  index: number;
  answer: TaskAnswer | null;
  draft: string;
  onDraftChange: (v: string) => void;
  onSubmit: () => void;
  onRetract: () => void;
  isSaving: boolean;
  disabled: boolean;
}

function TaskItem({
  task, index, answer, draft, onDraftChange, onSubmit, onRetract, isSaving, disabled,
}: TaskItemProps) {
  const isAnswered = !!answer;

  return (
    <div className={`rounded-lg border ${isAnswered ? 'border-verdigris-300 bg-verdigris-50/40' : 'border-parchment-200 bg-white'} overflow-hidden`}>
      {/* Aufgaben-Kopf */}
      <div className="px-4 py-3 flex items-start gap-3">
        <span
          className={`shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
            isAnswered ? 'bg-verdigris-500 text-white' : 'bg-parchment-200 text-ink-600'
          }`}
        >
          {isAnswered ? '✓' : index + 1}
        </span>
        <div className="flex-1 min-w-0">
          {task.title && (
            <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-0.5">{task.title}</p>
          )}
          <p className="text-sm text-ink-800 leading-relaxed">{task.prompt}</p>
        </div>
      </div>

      {/* Antwortbereich */}
      <div className="px-4 pb-3">
        {task.type === 'text' ? (
          <TextAnswer
            value={draft}
            onChange={onDraftChange}
            disabled={disabled}
            isAnswered={isAnswered}
          />
        ) : (
          <ChoiceAnswer
            options={task.options}
            value={draft}
            onChange={onDraftChange}
            answerKey={task.answerKey}
            disabled={disabled}
            isAnswered={isAnswered}
          />
        )}

        {/* Bereits abgeschickte Antwort anzeigen */}
        {isAnswered && answer.value !== draft && (
          <p className="text-xs text-ink-400 mt-1 italic">
            Gespeichert: „{answer.value}"
          </p>
        )}

        {/* Aktions-Buttons */}
        {!disabled && (
          <div className="flex gap-2 mt-2.5">
            <button
              onClick={onSubmit}
              disabled={isSaving || !draft.trim()}
              className="flex-1 py-1.5 text-xs font-medium rounded bg-burgundy-600 text-white hover:bg-burgundy-700 disabled:opacity-40 transition-colors"
              style={{ backgroundColor: draft.trim() && !isSaving ? '#7B2D42' : undefined }}
            >
              {isSaving ? '…' : isAnswered ? 'Aktualisieren' : 'Abschicken'}
            </button>
            {isAnswered && (
              <button
                onClick={onRetract}
                disabled={isSaving}
                className="px-3 py-1.5 text-xs rounded border border-parchment-300 text-ink-500 hover:bg-parchment-100 disabled:opacity-40 transition-colors"
              >
                Zurückziehen
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function TextAnswer({ value, onChange, disabled, isAnswered }: {
  value: string; onChange: (v: string) => void; disabled: boolean; isAnswered: boolean;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      disabled={disabled}
      rows={3}
      placeholder={disabled ? 'Anmelden, um zu antworten …' : 'Deine Antwort …'}
      className={`w-full text-sm rounded border px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-burgundy-400 disabled:bg-parchment-50 disabled:text-ink-400 ${
        isAnswered ? 'border-verdigris-300 bg-verdigris-50/30' : 'border-parchment-300 bg-white'
      }`}
    />
  );
}

function ChoiceAnswer({ options, value, onChange, answerKey, disabled, isAnswered }: {
  options: string[]; value: string; onChange: (v: string) => void;
  answerKey: string | null; disabled: boolean; isAnswered: boolean;
}) {
  return (
    <div className="space-y-1.5">
      {options.map(opt => {
        const isSelected = value === opt;
        const isCorrect  = isAnswered && answerKey && opt === answerKey;
        const isWrong    = isAnswered && isSelected && answerKey && opt !== answerKey;
        return (
          <label
            key={opt}
            className={`flex items-center gap-2.5 px-3 py-2 rounded border cursor-pointer transition-colors text-sm ${
              disabled        ? 'cursor-default opacity-70 border-parchment-200 bg-parchment-50' :
              isCorrect       ? 'border-verdigris-400 bg-verdigris-50 text-verdigris-800' :
              isWrong         ? 'border-red-300 bg-red-50 text-red-800' :
              isSelected      ? 'border-burgundy-400 bg-burgundy-50 text-burgundy-800' :
                                'border-parchment-200 bg-white hover:bg-parchment-50'
            }`}
          >
            <input
              type="radio"
              name={`choice-${opt}`}
              checked={isSelected}
              onChange={() => !disabled && onChange(opt)}
              disabled={disabled}
              className="accent-burgundy-600"
            />
            <span className="flex-1">{opt}</span>
            {isCorrect && <span className="text-verdigris-600 text-xs">✓ Richtig</span>}
            {isWrong   && <span className="text-red-500 text-xs">✗</span>}
          </label>
        );
      })}
    </div>
  );
}
