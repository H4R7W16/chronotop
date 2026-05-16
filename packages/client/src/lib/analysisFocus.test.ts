import { describe, expect, it } from 'vitest';
import { eventMatchesAnalysisFocus, movementMatchesAnalysisFocus } from './analysisFocus.js';
import type { Event as ChronotopEvent, Movement } from '@chronotop/shared';

const baseEvent: ChronotopEvent = {
  id: 'event-1',
  moduleId: 'module-1',
  title: 'Bahnhof',
  description: 'Eisenbahn und Industrialisierung',
  placeId: 'place-1',
  timeObjectId: 'time-1',
  place: {
    id: 'place-1',
    moduleId: 'module-1',
    lat: 48.7,
    lng: 9.5,
    name: 'Bahnhof',
    sourceOfClaim: 'source-geo',
  },
  timeObject: {
    id: 'time-1',
    moduleId: 'module-1',
    type: 'instant',
    date: '1847',
    certainty: 'certain',
    label: '1847',
  },
  sources: [{
    id: 'source-1',
    moduleId: 'module-1',
    type: 'map',
    title: 'Historische Karte',
    license: 'public domain',
  }],
  actors: [{
    actor: {
      id: 'actor-1',
      moduleId: 'module-1',
      type: 'institution',
      name: 'Eisenbahnverwaltung',
      sourceOfClaim: 'source-actor',
    },
    role: 'Betrieb',
    sourceOfClaim: 'source-role',
  }],
  concepts: [{
    id: 'concept-1',
    moduleId: 'module-1',
    kind: 'analytical',
    label: 'Industrialisierung',
  }],
};

describe('analysis focus matching', () => {
  it('matches events by linked concept, actor, source, place and time', () => {
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'concept', id: 'concept-1', label: 'Industrialisierung' })).toBe(true);
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'actor', id: 'actor-1', label: 'Eisenbahnverwaltung' })).toBe(true);
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'source', id: 'source-1', label: 'Historische Karte' })).toBe(true);
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'source', id: 'source-geo', label: 'Geometriequelle' })).toBe(true);
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'place', id: 'place-1', label: 'Bahnhof' })).toBe(true);
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'time', id: 'time-1', label: '1847' })).toBe(true);
  });

  it('does not match unrelated focus values', () => {
    expect(eventMatchesAnalysisFocus(baseEvent, { kind: 'concept', id: 'other', label: 'Andere' })).toBe(false);
    expect(eventMatchesAnalysisFocus(baseEvent, null)).toBe(false);
  });

  it('matches movements through their linked event', () => {
    const movement: Movement = {
      id: 'movement-1',
      moduleId: 'module-1',
      eventId: 'event-1',
      name: 'Filstalbahn',
      description: '',
      coordinates: [[9.5, 48.7], [9.6, 48.7]],
      color: '#5f3a2e',
    };
    expect(movementMatchesAnalysisFocus(movement, baseEvent, { kind: 'concept', id: 'concept-1', label: 'Industrialisierung' })).toBe(true);
  });
});
