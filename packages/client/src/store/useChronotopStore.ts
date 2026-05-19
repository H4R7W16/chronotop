import { create } from 'zustand';
import { api } from '../api/client.js';
import type { AnalysisFocus } from '../lib/analysisFocus.js';
import { DEFAULT_STYLE_ID, type MapStyleOption } from '../lib/mapStyle.js';
import type { ThemeFilter } from '../lib/themeFilters.js';
import type { ContentModule, Event, Place, TimeObject, Source, Actor, Concept, Movement, Task } from '@chronotop/shared';

export type SelectionOrigin = 'map' | 'timeline' | 'detail' | 'concept' | 'author' | 'url' | 'programmatic';
export type MapFollowMode = 'auto' | 'paused';
export interface MapLayerVisibility {
  markers: boolean;
  shapes: boolean;
  movements: boolean;
}

interface SelectEventOptions {
  origin?: SelectionOrigin;
}

function demoId(prefix: string): string {
  return `demo-${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

function withDemoStamp<T extends { createdAt?: string; updatedAt?: string }>(data: T, isNew = true): T {
  const stamp = nowIso();
  return {
    ...data,
    createdAt: isNew ? (data.createdAt ?? stamp) : data.createdAt,
    updatedAt: stamp,
  };
}

function linkEventRelations(event: Event, state: Pick<ChronotopState, 'places' | 'timeObjects' | 'sources' | 'actors' | 'concepts'>, links?: {
  sourceIds?: string[];
  actorIds?: { actorId: string; role?: string; certainty?: any; sourceOfClaim?: string }[];
  conceptIds?: string[];
}): Event {
  const sourceIds = links?.sourceIds ?? event.sources?.map(s => s.id) ?? [];
  const actorLinks = links?.actorIds ?? event.actors?.map(a => ({
    actorId: a.actor.id,
    role: a.role,
    certainty: a.certainty,
    sourceOfClaim: a.sourceOfClaim,
  })) ?? [];
  const conceptIds = links?.conceptIds ?? event.concepts?.map(c => c.id) ?? [];
  return {
    ...event,
    place: state.places.find(p => p.id === event.placeId),
    timeObject: state.timeObjects.find(t => t.id === event.timeObjectId),
    sources: state.sources.filter(s => sourceIds.includes(s.id)),
    actors: actorLinks
      .map(link => {
        const actor = state.actors.find(a => a.id === link.actorId);
        return actor ? {
          actor,
          role: link.role,
          certainty: link.certainty,
          sourceOfClaim: link.sourceOfClaim,
        } : null;
      })
      .filter(Boolean) as Event['actors'],
    concepts: state.concepts.filter(c => conceptIds.includes(c.id)),
  };
}

function relinkAllEvents(state: ChronotopState): Event[] {
  return state.events.map(event => linkEventRelations(event, state));
}

interface ChronotopState {
  // Data
  modules: ContentModule[];
  currentModuleId: string | null;
  currentModule: ContentModule | null;
  events: Event[];
  places: Place[];
  timeObjects: TimeObject[];
  sources: Source[];
  actors: Actor[];
  concepts: Concept[];
  movements: Movement[];
  tasks: Task[];
  demoDraftMode: boolean;
  demoDraftDirty: boolean;

  // Selection (drives view coupling)
  selectedEventId: string | null;
  selectionOrigin: SelectionOrigin | null;
  selectionRevision: number;
  hoveredEventId: string | null;
  mapFollowMode: MapFollowMode;
  mapFocusRequest: number;
  analysisFocus: AnalysisFocus | null;
  analysisFocusMapRequest: number;
  mapUserInteractionAt: number | null;

  // Time filter
  timeFilter: { from?: string; to?: string };
  themeFilter: ThemeFilter;

  // Volltextsuche
  searchQuery: string;

  // Kartenbuehne
  mapStyleId: MapStyleOption['id'];
  mapLayerVisibility: MapLayerVisibility;

  // Vollbild-Modus für Karte (blendet Header und Side-Panels aus)
  fullscreen: boolean;

  // Actions
  loadModules: () => Promise<void>;
  loadModuleData: (moduleId: string) => Promise<void>;
  updateModuleBasemap: (moduleId: string, basemapUrl: string | null, basemapLabel: string | null) => Promise<void>;
  selectEvent: (id: string | null, options?: SelectEventOptions) => void;
  hoverEvent: (id: string | null) => void;
  noteMapInteraction: () => void;
  requestMapFocus: () => void;
  setAnalysisFocus: (focus: AnalysisFocus | null) => void;
  requestAnalysisFocusMapFit: () => void;
  resumeMapFollow: () => void;
  setTimeFilter: (filter: { from?: string; to?: string }) => void;
  setThemeFilter: (filter: ThemeFilter | ((current: ThemeFilter) => ThemeFilter)) => void;
  setSearchQuery: (q: string) => void;
  setMapStyleId: (id: MapStyleOption['id']) => void;
  setMapLayerVisibility: (visibility: Partial<MapLayerVisibility> | ((current: MapLayerVisibility) => Partial<MapLayerVisibility>)) => void;
  setFullscreen: (v: boolean) => void;
  setDemoDraftMode: (v: boolean) => void;

  // Mutations
  createModule: (data: { title: string; description: string; authorName: string }) => Promise<ContentModule>;
  deleteModule: (id: string) => Promise<void>;
  createEvent: (data: any) => Promise<Event>;
  updateEvent: (id: string, data: any) => Promise<Event>;
  deleteEvent: (id: string) => Promise<void>;
  createPlace: (data: any) => Promise<Place>;
  updatePlace: (id: string, data: any) => Promise<Place>;
  createTimeObject: (data: any) => Promise<TimeObject>;
  createSource: (data: any) => Promise<Source>;
  createActor: (data: any) => Promise<Actor>;
  deleteActor: (id: string) => Promise<void>;
  createConcept: (data: any) => Promise<Concept>;
  deleteConcept: (id: string) => Promise<void>;
  createMovement: (data: any) => Promise<Movement>;
  deleteMovement: (id: string) => Promise<void>;
  createTask: (data: any) => Promise<Task>;
  updateTask: (id: string, data: any) => Promise<Task>;
  deleteTask: (id: string) => Promise<void>;
  reloadMovements: () => Promise<void>;
}

export const useChronotopStore = create<ChronotopState>((set, get) => ({
  modules: [],
  currentModuleId: null,
  currentModule: null,
  events: [],
  places: [],
  timeObjects: [],
  sources: [],
  actors: [],
  concepts: [],
  movements: [],
  tasks: [],
  demoDraftMode: false,
  demoDraftDirty: false,
  selectedEventId: null,
  selectionOrigin: null,
  selectionRevision: 0,
  hoveredEventId: null,
  mapFollowMode: 'auto',
  mapFocusRequest: 0,
  analysisFocus: null,
  analysisFocusMapRequest: 0,
  mapUserInteractionAt: null,
  timeFilter: {},
  themeFilter: [],
  searchQuery: '',
  mapStyleId: DEFAULT_STYLE_ID,
  mapLayerVisibility: { markers: true, shapes: true, movements: true },
  fullscreen: false,

  loadModules: async () => {
    const modules = await api.getModules();
    set({ modules });
  },

  loadModuleData: async (moduleId: string) => {
    const [moduleData, events, places, timeObjects, sources, actors, concepts, movements, tasks] = await Promise.all([
      api.getModule(moduleId),
      api.getEvents(moduleId),
      api.getPlaces(moduleId),
      api.getTimeObjects(moduleId),
      api.getSources(moduleId),
      api.getActors(moduleId),
      api.getConcepts(moduleId),
      api.getMovements(moduleId),
      api.getTasks(moduleId),
    ]);
    const previousSelectedEventId = get().selectedEventId;
    const selectedEventId = previousSelectedEventId && events.some(event => event.id === previousSelectedEventId)
      ? previousSelectedEventId
      : null;
    set(s => ({
      currentModuleId: moduleId,
      currentModule: moduleData,
      events,
      places,
      timeObjects,
      sources,
      actors,
      concepts,
      movements,
      tasks,
      selectedEventId,
      selectionOrigin: selectedEventId ? s.selectionOrigin : null,
      selectionRevision: selectedEventId === s.selectedEventId ? s.selectionRevision : s.selectionRevision + 1,
      mapFollowMode: 'auto',
      analysisFocus: null,
      analysisFocusMapRequest: 0,
      timeFilter: {},
      themeFilter: [],
      demoDraftDirty: false,
    }));
  },

  updateModuleBasemap: async (moduleId, basemapUrl, basemapLabel) => {
    if (get().demoDraftMode) {
      const existing = get().currentModule;
      if (!existing) throw new Error('Kein Modul geladen');
      const updated = withDemoStamp({ ...existing, basemapUrl, basemapLabel }, false);
      set(s => ({
        currentModule: s.currentModuleId === moduleId ? updated : s.currentModule,
        modules: s.modules.map(m => m.id === moduleId ? updated : m),
        demoDraftDirty: true,
      }));
      return;
    }
    const updated = await api.updateModule(moduleId, { basemapUrl, basemapLabel });
    set(s => ({
      currentModule: s.currentModuleId === moduleId ? updated : s.currentModule,
      modules: s.modules.map(m => m.id === moduleId ? updated : m),
    }));
  },

  selectEvent: (id, options) => set(s => ({
    selectedEventId: id,
    selectionOrigin: id ? (options?.origin ?? 'programmatic') : null,
    selectionRevision: s.selectionRevision + 1,
  })),
  hoverEvent: (id) => set({ hoveredEventId: id }),
  noteMapInteraction: () => set({ mapFollowMode: 'paused', mapUserInteractionAt: Date.now() }),
  requestMapFocus: () => set(s => ({ mapFollowMode: 'auto', mapFocusRequest: s.mapFocusRequest + 1 })),
  setAnalysisFocus: (focus) => set({ analysisFocus: focus }),
  requestAnalysisFocusMapFit: () => set(s => ({ analysisFocusMapRequest: s.analysisFocusMapRequest + 1 })),
  resumeMapFollow: () => set({ mapFollowMode: 'auto' }),
  setTimeFilter: (filter) => set({ timeFilter: filter }),
  setThemeFilter: (filter) => set(s => ({
    themeFilter: typeof filter === 'function' ? filter(s.themeFilter) : filter,
  })),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setMapStyleId: (id) => set({ mapStyleId: id }),
  setMapLayerVisibility: (visibility) => set(s => ({
    mapLayerVisibility: {
      ...s.mapLayerVisibility,
      ...(typeof visibility === 'function' ? visibility(s.mapLayerVisibility) : visibility),
    },
  })),
  setFullscreen: (v) => set({ fullscreen: v }),
  setDemoDraftMode: (v) => set({ demoDraftMode: v }),

  createModule: async (data) => {
    const mod = await api.createModule(data);
    await get().loadModules();
    return mod;
  },

  deleteModule: async (id) => {
    await api.deleteModule(id);
    await get().loadModules();
    if (get().currentModuleId === id) {
      set({ currentModuleId: null, events: [], places: [], timeObjects: [], sources: [] });
    }
  },

  createEvent: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const base = withDemoStamp({
        id: demoId('event'),
        moduleId: mid,
        title: data.title,
        description: data.description ?? '',
        placeId: data.placeId,
        timeObjectId: data.timeObjectId,
        followsId: data.followsId ?? null,
        partOfId: data.partOfId ?? null,
      } as Event);
      const event = linkEventRelations(base, get(), data);
      set(s => ({
        events: [...s.events, event],
        selectedEventId: event.id,
        selectionOrigin: 'author',
        selectionRevision: s.selectionRevision + 1,
        demoDraftDirty: true,
      }));
      return event;
    }
    const event = await api.createEvent(mid, data);
    await get().loadModuleData(mid);
    return event;
  },

  updateEvent: async (id, data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const existing = get().events.find(e => e.id === id);
      if (!existing) throw new Error('Ereignis nicht gefunden');
      const base = withDemoStamp({
        ...existing,
        title: data.title ?? existing.title,
        description: data.description ?? existing.description,
        placeId: data.placeId ?? existing.placeId,
        timeObjectId: data.timeObjectId ?? existing.timeObjectId,
        followsId: data.followsId ?? existing.followsId ?? null,
        partOfId: data.partOfId ?? existing.partOfId ?? null,
      }, false);
      const event = linkEventRelations(base, get(), data);
      set(s => ({ events: s.events.map(e => e.id === id ? event : e), demoDraftDirty: true }));
      return event;
    }
    const event = await api.updateEvent(mid, id, data);
    await get().loadModuleData(mid);
    return event;
  },

  deleteEvent: async (id) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      set(s => ({
        events: s.events.filter(e => e.id !== id),
        selectedEventId: s.selectedEventId === id ? null : s.selectedEventId,
        selectionOrigin: s.selectedEventId === id ? null : s.selectionOrigin,
        selectionRevision: s.selectedEventId === id ? s.selectionRevision + 1 : s.selectionRevision,
        demoDraftDirty: true,
      }));
      return;
    }
    await api.deleteEvent(mid, id);
    await get().loadModuleData(mid);
  },

  createPlace: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const place = withDemoStamp({
        id: demoId('place'),
        moduleId: mid,
        wikidataId: data.wikidataId,
        lat: Number(data.lat),
        lng: Number(data.lng),
        name: data.name,
        description: data.description,
        geometry: data.geometry,
        validFrom: data.validFrom,
        validTo: data.validTo,
        certainty: data.certainty ?? 'certain',
        sourceOfClaim: data.sourceOfClaim,
      } as Place);
      set(s => {
        const nextState = { ...s, places: [...s.places, place] } as ChronotopState;
        return { places: nextState.places, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return place;
    }
    const place = await api.createPlace(mid, data);
    set({ places: [...get().places, place] });
    return place;
  },

  updatePlace: async (id, data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const existing = get().places.find(p => p.id === id);
      if (!existing) throw new Error('Ort nicht gefunden');
      const place = withDemoStamp({
        ...existing,
        ...data,
        geometry: data.geometry !== undefined ? (data.geometry || undefined) : existing.geometry,
      }, false);
      set(s => {
        const nextState = { ...s, places: s.places.map(p => p.id === id ? place : p) } as ChronotopState;
        return { places: nextState.places, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return place;
    }
    const place = await api.updatePlace(mid, id, data);
    set(s => {
      const nextState = { ...s, places: s.places.map(p => p.id === id ? place : p) } as ChronotopState;
      return { places: nextState.places, events: relinkAllEvents(nextState) };
    });
    return place;
  },

  createTimeObject: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const to = withDemoStamp({
        id: demoId('time'),
        moduleId: mid,
        type: data.type,
        date: data.date,
        startDate: data.startDate,
        endDate: data.endDate,
        certainty: data.certainty ?? 'certain',
        label: data.label,
      } as TimeObject);
      set(s => {
        const nextState = { ...s, timeObjects: [...s.timeObjects, to] } as ChronotopState;
        return { timeObjects: nextState.timeObjects, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return to;
    }
    const to = await api.createTimeObject(mid, data);
    set({ timeObjects: [...get().timeObjects, to] });
    return to;
  },

  createSource: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const src = withDemoStamp({
        id: demoId('source'),
        moduleId: mid,
        type: data.type,
        title: data.title,
        url: data.url,
        iiifManifestUrl: data.iiifManifestUrl,
        iiifImageUrl: data.iiifImageUrl,
        license: data.license ?? 'Quelle pruefen',
        description: data.description,
      } as Source);
      set(s => {
        const nextState = { ...s, sources: [...s.sources, src] } as ChronotopState;
        return { sources: nextState.sources, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return src;
    }
    const src = await api.createSource(mid, data);
    set({ sources: [...get().sources, src] });
    return src;
  },

  createActor: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const actor = withDemoStamp({
        id: demoId('actor'),
        moduleId: mid,
        type: data.type,
        name: data.name,
        wikidataId: data.wikidataId,
        gndId: data.gndId,
        description: data.description,
        birthDate: data.birthDate,
        deathDate: data.deathDate,
        certainty: data.certainty,
        sourceOfClaim: data.sourceOfClaim,
      } as Actor);
      set(s => {
        const nextState = { ...s, actors: [...s.actors, actor] } as ChronotopState;
        return { actors: nextState.actors, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return actor;
    }
    const actor = await api.createActor(mid, data);
    set({ actors: [...get().actors, actor] });
    return actor;
  },

  deleteActor: async (id) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      set(s => {
        const nextState = { ...s, actors: s.actors.filter(a => a.id !== id) } as ChronotopState;
        return { actors: nextState.actors, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return;
    }
    await api.deleteActor(mid, id);
    await get().loadModuleData(mid);
  },

  createConcept: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const concept = withDemoStamp({
        id: demoId('concept'),
        moduleId: mid,
        kind: data.kind,
        label: data.label,
        description: data.description,
        wikidataId: data.wikidataId,
      } as Concept);
      set(s => {
        const nextState = { ...s, concepts: [...s.concepts, concept] } as ChronotopState;
        return { concepts: nextState.concepts, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return concept;
    }
    const concept = await api.createConcept(mid, data);
    set({ concepts: [...get().concepts, concept] });
    return concept;
  },

  deleteConcept: async (id) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      set(s => {
        const nextState = { ...s, concepts: s.concepts.filter(c => c.id !== id) } as ChronotopState;
        return { concepts: nextState.concepts, events: relinkAllEvents(nextState), demoDraftDirty: true };
      });
      return;
    }
    await api.deleteConcept(mid, id);
    await get().loadModuleData(mid);
  },

  createMovement: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const movement = withDemoStamp({
        id: demoId('movement'),
        moduleId: mid,
        eventId: data.eventId ?? null,
        name: data.name,
        description: data.description ?? '',
        coordinates: data.coordinates,
        color: data.color ?? '#7B2D42',
      } as Movement);
      set(s => ({ movements: [...s.movements, movement], demoDraftDirty: true }));
      return movement;
    }
    const movement = await api.createMovement(mid, data);
    set({ movements: [...get().movements, movement] });
    return movement;
  },

  deleteMovement: async (id) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      set({ movements: get().movements.filter(m => m.id !== id), demoDraftDirty: true });
      return;
    }
    await api.deleteMovement(mid, id);
    set({ movements: get().movements.filter(m => m.id !== id) });
  },

  createTask: async (data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const task = withDemoStamp({
        id: demoId('task'),
        moduleId: mid,
        title: data.title ?? '',
        prompt: data.prompt,
        type: data.type ?? 'text',
        options: data.options ?? [],
        answerKey: data.answerKey ?? null,
        targetEventId: data.targetEventId ?? null,
        position: data.position ?? get().tasks.length,
      } as Task);
      set(s => ({ tasks: [...s.tasks, task], demoDraftDirty: true }));
      return task;
    }
    const task = await api.createTask(mid, data);
    set({ tasks: [...get().tasks, task] });
    return task;
  },

  updateTask: async (id, data) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      const existing = get().tasks.find(t => t.id === id);
      if (!existing) throw new Error('Aufgabe nicht gefunden');
      const task = withDemoStamp({ ...existing, ...data }, false);
      set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t), demoDraftDirty: true }));
      return task;
    }
    const task = await api.updateTask(mid, id, data);
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? task : t) }));
    return task;
  },

  deleteTask: async (id) => {
    const mid = get().currentModuleId!;
    if (get().demoDraftMode) {
      set(s => ({ tasks: s.tasks.filter(t => t.id !== id), demoDraftDirty: true }));
      return;
    }
    await api.deleteTask(mid, id);
    set(s => ({ tasks: s.tasks.filter(t => t.id !== id) }));
  },

  reloadMovements: async () => {
    const mid = get().currentModuleId;
    if (!mid) return;
    const movements = await api.getMovements(mid);
    set({ movements });
  },
}));
