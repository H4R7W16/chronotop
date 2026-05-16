import type { Event as ChronotopEvent, Movement } from '@chronotop/shared';

export type AnalysisFocusKind = 'concept' | 'actor' | 'source' | 'place' | 'time';

export interface AnalysisFocus {
  kind: AnalysisFocusKind;
  id: string;
  label: string;
  originEventId?: string;
}

export function analysisFocusEquals(a: AnalysisFocus | null, b: AnalysisFocus | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.kind === b.kind && a.id === b.id;
}

export function eventMatchesAnalysisFocus(event: ChronotopEvent, focus: AnalysisFocus | null): boolean {
  if (!focus) return false;
  switch (focus.kind) {
    case 'concept':
      return !!event.concepts?.some(concept => concept.id === focus.id);
    case 'actor':
      return !!event.actors?.some(link => link.actor.id === focus.id);
    case 'source':
      return !!event.sources?.some(source => source.id === focus.id)
        || event.place?.sourceOfClaim === focus.id
        || !!event.actors?.some(link => link.sourceOfClaim === focus.id || link.actor.sourceOfClaim === focus.id);
    case 'place':
      return event.placeId === focus.id || event.place?.id === focus.id;
    case 'time':
      return event.timeObjectId === focus.id || event.timeObject?.id === focus.id;
    default:
      return false;
  }
}

export function movementMatchesAnalysisFocus(
  movement: Movement,
  linkedEvent: ChronotopEvent | undefined,
  focus: AnalysisFocus | null,
): boolean {
  if (!focus) return false;
  if (linkedEvent && eventMatchesAnalysisFocus(linkedEvent, focus)) return true;
  return focus.kind === 'place' && movement.eventId === focus.originEventId;
}

export function analysisFocusSummary(kind: AnalysisFocusKind): string {
  switch (kind) {
    case 'concept':
      return 'Begriff';
    case 'actor':
      return 'Akteur';
    case 'source':
      return 'Quelle';
    case 'place':
      return 'Ort';
    case 'time':
      return 'Zeit';
    default:
      return 'Fokus';
  }
}
