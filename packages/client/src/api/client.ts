import { toast } from '../components/system/toast.js';
import { isStaticDemo } from '../config.js';
import { staticDemoApi } from './staticDemo.js';

const BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    });
  } catch (err) {
    // Netzwerk-Fehler (Server nicht erreichbar, DNS, etc.)
    const message = `Server nicht erreichbar: ${(err as Error).message}`;
    toast.error(message);
    throw new Error(message);
  }
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ error: res.statusText }));
    const message = errorBody.error || res.statusText || `HTTP ${res.status}`;
    // 4xx und 5xx als Fehler-Toast melden (außer 404 bei GET — oft erwartet)
    const isExpected404 = res.status === 404 && (!options?.method || options.method === 'GET');
    const isExpectedDemoAuth =
      res.status === 401
      && (!options?.method || options.method === 'GET')
      && (path === '/auth/me' || path.endsWith('/my-role'));
    if (!isExpected404 && !isExpectedDemoAuth) {
      toast.error(`API-Fehler (${res.status}): ${message}`);
    }
    throw new Error(message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const serverApi = {
  // Modules
  getModules: () => request<any[]>('/modules'),
  getModule: (id: string) => request<any>(`/modules/${id}`),
  createModule: (data: any) => request<any>('/modules', { method: 'POST', body: JSON.stringify(data) }),
  updateModule: (id: string, data: any) => request<any>(`/modules/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteModule: (id: string) => request<void>(`/modules/${id}`, { method: 'DELETE' }),

  // Places
  getPlaces: (mid: string) => request<any[]>(`/modules/${mid}/places`),
  createPlace: (mid: string, data: any) => request<any>(`/modules/${mid}/places`, { method: 'POST', body: JSON.stringify(data) }),
  updatePlace: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/places/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePlace: (mid: string, id: string) => request<void>(`/modules/${mid}/places/${id}`, { method: 'DELETE' }),

  // Time Objects
  getTimeObjects: (mid: string) => request<any[]>(`/modules/${mid}/time-objects`),
  createTimeObject: (mid: string, data: any) => request<any>(`/modules/${mid}/time-objects`, { method: 'POST', body: JSON.stringify(data) }),
  updateTimeObject: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/time-objects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTimeObject: (mid: string, id: string) => request<void>(`/modules/${mid}/time-objects/${id}`, { method: 'DELETE' }),

  // Sources
  getSources: (mid: string) => request<any[]>(`/modules/${mid}/sources`),
  createSource: (mid: string, data: any) => request<any>(`/modules/${mid}/sources`, { method: 'POST', body: JSON.stringify(data) }),
  updateSource: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/sources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSource: (mid: string, id: string) => request<void>(`/modules/${mid}/sources/${id}`, { method: 'DELETE' }),

  // Actors
  getActors: (mid: string) => request<any[]>(`/modules/${mid}/actors`),
  createActor: (mid: string, data: any) => request<any>(`/modules/${mid}/actors`, { method: 'POST', body: JSON.stringify(data) }),
  updateActor: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/actors/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteActor: (mid: string, id: string) => request<void>(`/modules/${mid}/actors/${id}`, { method: 'DELETE' }),

  // Revisionen
  getRevisions: (mid: string) => request<any[]>(`/modules/${mid}/revisions`),
  getRevision: (mid: string, rid: string) => request<any>(`/modules/${mid}/revisions/${rid}`),
  createRevision: (mid: string, data: { version: string; message?: string; creator?: string }) =>
    request<any>(`/modules/${mid}/revisions`, { method: 'POST', body: JSON.stringify(data) }),
  deleteRevision: (mid: string, rid: string) => request<void>(`/modules/${mid}/revisions/${rid}`, { method: 'DELETE' }),

  // Annotations
  getAnnotations: (mid: string) => request<any[]>(`/modules/${mid}/annotations`),
  getAnnotationsForTarget: (mid: string, kind: string, targetId: string) =>
    request<any[]>(`/modules/${mid}/annotations?kind=${encodeURIComponent(kind)}&target=${encodeURIComponent(targetId)}`),
  createAnnotation: (mid: string, data: any) => request<any>(`/modules/${mid}/annotations`, { method: 'POST', body: JSON.stringify(data) }),
  updateAnnotation: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/annotations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteAnnotation: (mid: string, id: string) => request<void>(`/modules/${mid}/annotations/${id}`, { method: 'DELETE' }),

  // Concepts
  getConcepts: (mid: string) => request<any[]>(`/modules/${mid}/concepts`),
  createConcept: (mid: string, data: any) => request<any>(`/modules/${mid}/concepts`, { method: 'POST', body: JSON.stringify(data) }),
  updateConcept: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/concepts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteConcept: (mid: string, id: string) => request<void>(`/modules/${mid}/concepts/${id}`, { method: 'DELETE' }),

  // Events
  getEvents: (mid: string) => request<any[]>(`/modules/${mid}/events`),
  getEvent: (mid: string, id: string) => request<any>(`/modules/${mid}/events/${id}`),
  createEvent: (mid: string, data: any) => request<any>(`/modules/${mid}/events`, { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteEvent: (mid: string, id: string) => request<void>(`/modules/${mid}/events/${id}`, { method: 'DELETE' }),

  // Export
  getJsonLd: (mid: string) => request<any>(`/modules/${mid}/export/jsonld`),

  // Wikidata
  searchWikidata: (q: string, lang = 'de') => request<any[]>(`/wikidata/search?q=${encodeURIComponent(q)}&lang=${lang}`),

  // Bewegungen (Routen)
  getMovements: (mid: string) => request<any[]>(`/modules/${mid}/movements`),
  createMovement: (mid: string, data: any) => request<any>(`/modules/${mid}/movements`, { method: 'POST', body: JSON.stringify(data) }),
  updateMovement: (mid: string, id: string, data: any) => request<any>(`/modules/${mid}/movements/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteMovement: (mid: string, id: string) => request<void>(`/modules/${mid}/movements/${id}`, { method: 'DELETE' }),

  // Aufgaben (Tasks)
  getTasks: (mid: string) => request<any[]>(`/modules/${mid}/tasks`),
  createTask: (mid: string, data: any) => request<any>(`/modules/${mid}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (mid: string, tid: string, data: any) => request<any>(`/modules/${mid}/tasks/${tid}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (mid: string, tid: string) => request<void>(`/modules/${mid}/tasks/${tid}`, { method: 'DELETE' }),
  submitAnswer: (mid: string, tid: string, value: string) =>
    request<any>(`/modules/${mid}/tasks/${tid}/answer`, { method: 'POST', body: JSON.stringify({ value }) }),
  deleteAnswer: (mid: string, tid: string) =>
    request<void>(`/modules/${mid}/tasks/${tid}/answer`, { method: 'DELETE' }),
  getMyAnswers: (mid: string) => request<any[]>(`/modules/${mid}/tasks/my-answers`),
  getTaskResults: (mid: string) => request<any[]>(`/modules/${mid}/tasks-results`),

  // Modul-Rolle des aktuellen Users
  myModuleRole: (mid: string) => request<{ role: string }>(`/modules/${mid}/my-role`),

  // Auth
  authMe: () => request<any>('/auth/me'),
  authRegister: (data: { email: string; password: string; displayName: string }) =>
    request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  authLogin: (data: { email: string; password: string }) =>
    request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  authLogout: () => request<void>('/auth/logout', { method: 'POST' }),
};

export const api = isStaticDemo ? staticDemoApi : serverApi;
