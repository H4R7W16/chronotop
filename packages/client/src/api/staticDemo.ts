import type {
  Actor,
  Annotation,
  Concept,
  ContentModule,
  Event,
  ModuleRevision,
  Movement,
  Place,
  Source,
  Task,
  TimeObject,
} from '@chronotop/shared';

interface StaticModuleData {
  module: ContentModule;
  events: Event[];
  places: Place[];
  timeObjects: TimeObject[];
  sources: Source[];
  actors: Actor[];
  concepts: Concept[];
  movements: Movement[];
  tasks: Task[];
  annotations: Annotation[];
  revisions: ModuleRevision[];
  jsonLd: unknown;
}

interface StaticDemoPayload {
  schema: 'chronotop.static-demo.v1';
  generatedAt: string;
  modules: ContentModule[];
  moduleData: Record<string, StaticModuleData>;
}

let payloadPromise: Promise<StaticDemoPayload> | null = null;

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;

async function loadPayload(): Promise<StaticDemoPayload> {
  if (!payloadPromise) {
    const url = `${import.meta.env.BASE_URL}demo/demo-data.json`;
    payloadPromise = fetch(url, { cache: 'no-cache' }).then(async res => {
      if (!res.ok) {
        throw new Error(`Statische Demo-Daten konnten nicht geladen werden (${res.status}).`);
      }
      return res.json() as Promise<StaticDemoPayload>;
    });
  }
  return payloadPromise;
}

async function getModuleData(moduleId: string): Promise<StaticModuleData> {
  const payload = await loadPayload();
  const data = payload.moduleData[moduleId];
  if (!data) throw new Error('Modul nicht gefunden.');
  return data;
}

function readonlyMutation(..._args: unknown[]): Promise<never> {
  return Promise.reject(new Error('Die GitHub-Pages-Demo ist nur lokal bearbeitbar. Bitte den Demo-Entwurf exportieren.'));
}

function noLogin(..._args: unknown[]): Promise<never> {
  return Promise.reject(new Error('Die GitHub-Pages-Demo läuft ohne Login.'));
}

export const staticDemoApi = {
  getModules: async () => clone((await loadPayload()).modules),
  getModule: async (id: string) => clone((await getModuleData(id)).module),
  createModule: readonlyMutation,
  updateModule: readonlyMutation,
  deleteModule: readonlyMutation,

  getPlaces: async (mid: string) => clone((await getModuleData(mid)).places),
  createPlace: readonlyMutation,
  updatePlace: readonlyMutation,
  deletePlace: readonlyMutation,

  getTimeObjects: async (mid: string) => clone((await getModuleData(mid)).timeObjects),
  createTimeObject: readonlyMutation,
  updateTimeObject: readonlyMutation,
  deleteTimeObject: readonlyMutation,

  getSources: async (mid: string) => clone((await getModuleData(mid)).sources),
  createSource: readonlyMutation,
  updateSource: readonlyMutation,
  deleteSource: readonlyMutation,

  getActors: async (mid: string) => clone((await getModuleData(mid)).actors),
  createActor: readonlyMutation,
  updateActor: readonlyMutation,
  deleteActor: readonlyMutation,

  getRevisions: async (mid: string) => clone((await getModuleData(mid)).revisions),
  getRevision: async (mid: string, rid: string) => {
    const revision = (await getModuleData(mid)).revisions.find(r => r.id === rid);
    if (!revision) throw new Error('Revision nicht gefunden.');
    return clone(revision);
  },
  createRevision: readonlyMutation,
  deleteRevision: readonlyMutation,

  getAnnotations: async (mid: string) => clone((await getModuleData(mid)).annotations),
  getAnnotationsForTarget: async (mid: string, kind: string, targetId: string) =>
    clone((await getModuleData(mid)).annotations.filter(annotation =>
      annotation.target.some(target => target.kind === kind && target.id === targetId),
    )),
  createAnnotation: readonlyMutation,
  updateAnnotation: readonlyMutation,
  deleteAnnotation: readonlyMutation,

  getConcepts: async (mid: string) => clone((await getModuleData(mid)).concepts),
  createConcept: readonlyMutation,
  updateConcept: readonlyMutation,
  deleteConcept: readonlyMutation,

  getEvents: async (mid: string) => clone((await getModuleData(mid)).events),
  getEvent: async (mid: string, id: string) => {
    const event = (await getModuleData(mid)).events.find(e => e.id === id);
    if (!event) throw new Error('Ereignis nicht gefunden.');
    return clone(event);
  },
  createEvent: readonlyMutation,
  updateEvent: readonlyMutation,
  deleteEvent: readonlyMutation,

  getJsonLd: async (mid: string) => clone((await getModuleData(mid)).jsonLd),

  searchWikidata: async (_q: string, _lang = 'de') => [],

  getMovements: async (mid: string) => clone((await getModuleData(mid)).movements),
  createMovement: readonlyMutation,
  updateMovement: readonlyMutation,
  deleteMovement: readonlyMutation,

  getTasks: async (mid: string) => clone((await getModuleData(mid)).tasks),
  createTask: readonlyMutation,
  updateTask: readonlyMutation,
  deleteTask: readonlyMutation,
  submitAnswer: async (_mid: string, tid: string, value: string) => ({
    id: `demo-answer-${tid}`,
    taskId: tid,
    userId: 'static-demo',
    value,
    submittedAt: new Date().toISOString(),
  }),
  deleteAnswer: async (_mid: string, _tid: string) => undefined,
  getMyAnswers: async (_mid: string) => [],
  getTaskResults: async (_mid: string) => [],

  myModuleRole: async (_mid: string) => ({ role: 'viewer' }),

  authMe: noLogin,
  authRegister: noLogin,
  authLogin: noLogin,
  authLogout: async () => undefined,
};
