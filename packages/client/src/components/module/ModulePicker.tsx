import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useChronotopStore } from '../../store/useChronotopStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import { api } from '../../api/client.js';
import { useLocalized } from '../../i18n/useLocalized.js';

interface ModuleStats {
  events: number;
  places: number;
  sources: number;
}

export function ModulePicker() {
  const { t } = useTranslation();
  const loc = useLocalized();
  const navigate = useNavigate();
  const { modules, loadModules, createModule, deleteModule } = useChronotopStore();
  const user = useAuthStore(s => s.user);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [stats, setStats] = useState<Record<string, ModuleStats>>({});

  useEffect(() => { loadModules(); }, [loadModules]);

  useEffect(() => {
    if (modules.length === 0) return;
    Promise.all(
      modules.map(async m => {
        const [events, places, sources] = await Promise.all([
          api.getEvents(m.id), api.getPlaces(m.id), api.getSources(m.id),
        ]);
        return [m.id, { events: events.length, places: places.length, sources: sources.length }] as const;
      }),
    ).then(entries => setStats(Object.fromEntries(entries)));
  }, [modules]);

  const handleCreate = async () => {
    if (!title || !authorName) return;
    const mod = await createModule({ title, description, authorName });
    setShowForm(false);
    setTitle('');
    setDescription('');
    setAuthorName('');
    navigate(`/author/${mod.id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('module.confirmDelete'))) await deleteModule(id);
  };

  return (
    <div className="h-full overflow-y-auto bg-parchment-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-10">
        <section className="mb-8 md:mb-10">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-burgundy-600">
              Kuratierte Demo
            </p>
            <h1 className="mb-3 font-serif text-3xl md:text-5xl font-semibold leading-tight text-ink-800">
              Chronotop als Karten-, Quellen- und Autorentool
            </h1>
            <p className="text-base md:text-lg leading-relaxed text-ink-500">
              Drei Module zeigen den aktuellen Demo-Stand: lokale Stadtgeschichte, regionale Industrialisierung und NS-Geschichte im Stadtraum. Ebersbach ist als stärkstes MVP-Beispiel zum Vorführen gedacht.
            </p>
          </div>
        </section>

        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl text-ink-700">
              Module
              {modules.length > 0 && (
                <span className="ml-2 font-sans text-base text-ink-400">({modules.length})</span>
              )}
            </h2>
            <p className="mt-1 text-sm text-ink-400">
              Ohne Login erkunden, im Demo-Autorentool testen und anschließend exportieren.
            </p>
          </div>
          {user && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-burgundy-500 hover:bg-burgundy-600 text-white px-5 py-2 rounded-md font-medium transition-colors shadow-sm"
            >
              + {t('module.create')}
            </button>
          )}
        </div>

        {showForm && user && (
          <div className="bg-white rounded-md shadow-md border border-parchment-200 p-6 mb-6">
            <h3 className="font-serif text-xl text-ink-700 mb-4">{t('module.create')}</h3>
            <div className="space-y-3">
              <FormField label={t('module.title')}>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  className="w-full input" autoFocus />
              </FormField>
              <FormField label={t('module.description')}>
                <textarea value={description} onChange={e => setDescription(e.target.value)}
                  className="w-full input h-20 resize-none" />
              </FormField>
              <FormField label={t('module.authorName')}>
                <input type="text" value={authorName} onChange={e => setAuthorName(e.target.value)}
                  className="w-full input" />
              </FormField>
              <div className="flex gap-2 pt-2">
                <button onClick={handleCreate} disabled={!title || !authorName}
                  className="bg-burgundy-500 hover:bg-burgundy-600 disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-2 rounded font-medium transition-colors">
                  {t('common.save')}
                </button>
                <button onClick={() => setShowForm(false)}
                  className="border border-ink-200 px-5 py-2 rounded text-ink-500 hover:bg-parchment-100 transition-colors">
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {modules.length === 0 && !showForm ? (
          <div className="text-center py-20 text-ink-300">
            <div className="text-5xl mb-3 opacity-40">📜</div>
            <p>{t('module.noModules')}</p>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4">
            {modules.map(mod => {
              const s = stats[mod.id];
              const isMvp = mod.id === '00000000-0000-0000-0000-000000000005';
              return (
                <article key={mod.id}
                  className={`group bg-white rounded-md border transition-all overflow-hidden flex flex-col ${
                    isMvp
                      ? 'border-burgundy-200 shadow-md shadow-burgundy-100/60'
                      : 'border-parchment-200 hover:border-burgundy-200 hover:shadow-md'
                  }`}>
                  <div onClick={() => navigate(`/learn/${mod.id}`)}
                    className="p-5 cursor-pointer flex-1">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="font-serif text-xl font-semibold leading-tight text-ink-800 group-hover:text-burgundy-600 transition-colors">
                        {loc(mod.title)}
                      </h3>
                      {isMvp && (
                        <span className="shrink-0 rounded bg-burgundy-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-burgundy-700">
                          MVP
                        </span>
                      )}
                    </div>
                    {loc(mod.description) && (
                      <p className="text-ink-500 text-sm leading-relaxed line-clamp-4">
                        {loc(mod.description)}
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-3 bg-parchment-50 border-t border-parchment-200 text-xs">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-ink-400">
                      <span><strong className="text-ink-600">{s?.events ?? '—'}</strong> Ereignisse</span>
                      <span><strong className="text-ink-600">{s?.places ?? '—'}</strong> Orte</span>
                      <span><strong className="text-ink-600">{s?.sources ?? '—'}</strong> Quellen</span>
                    </div>
                  </div>
                  <div className="px-5 py-2.5 border-t border-parchment-200 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11px] text-ink-400 italic">
                      von {mod.authorName} · v{mod.version}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/learn/${mod.id}`)}
                        className="text-xs px-2 py-1 text-ink-500 hover:text-burgundy-600 hover:bg-burgundy-50 rounded">
                        Erkunden
                      </button>
                      <button onClick={() => navigate(`/author/${mod.id}`)}
                        className="text-xs px-2 py-1 text-ink-500 hover:text-burgundy-600 hover:bg-burgundy-50 rounded">
                        Erstellen
                      </button>
                      {user && (
                        <button onClick={() => handleDelete(mod.id)}
                          className="text-xs px-2 py-1 text-ink-500 hover:text-burgundy-700 hover:bg-burgundy-50 rounded">
                          {t('common.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      <footer className="border-t border-parchment-200 py-6 mt-10 text-center text-xs text-ink-400">
        <p>
          <strong className="text-ink-500">Chronotop</strong> · ein offenes Framework für historische Zusammenhänge
          <br />
          Code: AGPL-3.0 · Inhalte: CC-BY-SA 4.0
        </p>
      </footer>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-600 mb-1">{label}</span>
      {children}
    </label>
  );
}
