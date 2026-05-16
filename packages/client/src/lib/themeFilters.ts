import { localized } from '@chronotop/shared';
import type { CertaintyLevel, Concept, Event as ChronotopEvent, Movement, Place } from '@chronotop/shared';

export type ThemeKey = 'water' | 'rail' | 'civic' | 'industry' | 'ns';
export type ThemeFilterId = ThemeKey | `concept:${string}`;
export type ThemeFilter = ThemeFilterId[];

export interface ThemeOption {
  id: ThemeFilterId;
  label: string;
  color: string;
  tint: string;
  kind: 'system' | 'concept';
}

export type VisualKind =
  | 'rail'
  | 'water'
  | 'energy'
  | 'area'
  | 'route'
  | 'persecution'
  | 'medicalCrime'
  | 'forcedLabor'
  | 'liberation'
  | 'civic';

export type MovementVisualKind = 'schematic' | 'route' | 'deportation' | 'deportationSchematic' | 'liberation' | 'persecution';

export interface VisualPalette {
  stroke: string;
  strong: string;
  soft: string;
  tint: string;
  halo: string;
}

const SYSTEM_THEME_ORDER: ThemeKey[] = ['water', 'rail', 'civic', 'industry', 'ns'];

const SYSTEM_THEME_OPTIONS: Record<ThemeKey, Omit<ThemeOption, 'id' | 'kind'>> = {
  water: { label: 'Wasser', color: '#236f8f', tint: '#d8edf5' },
  rail: { label: 'Bahn', color: '#5f3a2e', tint: '#f3e4c5' },
  civic: { label: 'Markt/Ort', color: '#7a6d58', tint: '#ebe3d4' },
  industry: { label: 'Industrie', color: '#8a5a2b', tint: '#f0dfc8' },
  ns: { label: 'NS-Zeit', color: '#7b2331', tint: '#f0d6dc' },
};

const CONCEPT_THEME_PALETTE = [
  { color: '#3f6d62', tint: '#deebe7' },
  { color: '#87662a', tint: '#f1e3bf' },
  { color: '#7b2331', tint: '#f0d6dc' },
  { color: '#245b7d', tint: '#d7e8f0' },
  { color: '#6f3b87', tint: '#eadcf0' },
  { color: '#5f6e35', tint: '#e5ecd2' },
  { color: '#8a5a2b', tint: '#f0dfc8' },
  { color: '#7a6d58', tint: '#ebe3d4' },
];

export function buildThemeOptions(
  events: ChronotopEvent[],
  places: Place[],
  movements: Movement[],
  concepts: Concept[],
  lang: string,
): ThemeOption[] {
  const systemThemes = new Set<ThemeKey>();
  const eventById = new Map(events.map(event => [event.id, event]));

  events.forEach(event => {
    eventThemeIds(event, lang).forEach(id => {
      if (isSystemTheme(id)) systemThemes.add(id);
    });
  });
  places.forEach(place => {
    placeThemeIds(place, lang).forEach(id => {
      if (isSystemTheme(id)) systemThemes.add(id);
    });
  });
  movements.forEach(movement => {
    movementThemeIds(movement, eventById.get(movement.eventId ?? ''), lang).forEach(id => {
      if (isSystemTheme(id)) systemThemes.add(id);
    });
  });

  const systemOptions: ThemeOption[] = SYSTEM_THEME_ORDER
    .filter(id => systemThemes.has(id))
    .map(id => ({ id, kind: 'system' as const, ...SYSTEM_THEME_OPTIONS[id] }));

  const conceptOptions: ThemeOption[] = concepts.map((concept, index) => {
    const palette = CONCEPT_THEME_PALETTE[index % CONCEPT_THEME_PALETTE.length];
    return {
      id: conceptThemeId(concept.id),
      kind: 'concept' as const,
      label: localized(concept.label, lang, 'Begriff'),
      color: palette.color,
      tint: palette.tint,
    };
  });

  return [...systemOptions, ...conceptOptions];
}

export function eventMatchesTheme(event: ChronotopEvent, filter: ThemeFilter, lang: string): boolean {
  if (filter.length === 0) return true;
  return themeFilterMatches(eventThemeIds(event, lang), filter);
}

export function placeMatchesTheme(place: Place, filter: ThemeFilter, lang: string): boolean {
  if (filter.length === 0) return true;
  return themeFilterMatches(placeThemeIds(place, lang), filter);
}

export function movementMatchesTheme(
  movement: { name?: string; description?: string },
  filter: ThemeFilter,
  linkedEvent?: ChronotopEvent,
  lang = 'de',
): boolean {
  if (filter.length === 0) return true;
  return themeFilterMatches(movementThemeIds(movement, linkedEvent, lang), filter);
}

export function eventThemeIds(event: ChronotopEvent, lang: string): Set<ThemeFilterId> {
  const tags = new Set<ThemeFilterId>();
  if (event.place) {
    placeThemeIds(event.place, lang).forEach(id => tags.add(id));
  }
  addThemeTags(tags, [
    localized(event.title, lang),
    localized(event.description, lang),
    event.timeObject ? localized(event.timeObject.label, lang) : '',
    ...(event.sources?.map(s => `${localized(s.title, lang)} ${s.description ? localized(s.description, lang) : ''}`) ?? []),
    ...(event.actors?.map(a => `${localized(a.actor.name, lang)} ${a.role ?? ''}`) ?? []),
    ...(event.concepts?.map(c => `${localized(c.label, lang)} ${c.description ? localized(c.description, lang) : ''}`) ?? []),
  ].join(' '), event.place ? classifyVisualKind(event.place, lang) : undefined);
  event.concepts?.forEach(concept => tags.add(conceptThemeId(concept.id)));
  return tags;
}

export function dominantThemeOption(event: ChronotopEvent, options: ThemeOption[], lang: string): ThemeOption {
  const tags = eventThemeIds(event, lang);
  const optionById = new Map(options.map(option => [option.id, option]));
  for (const concept of event.concepts ?? []) {
    const option = optionById.get(conceptThemeId(concept.id));
    if (option) return option;
  }
  for (const id of SYSTEM_THEME_ORDER) {
    const option = optionById.get(id);
    if (tags.has(id) && option) return option;
  }
  return { id: 'civic', kind: 'system', ...SYSTEM_THEME_OPTIONS.civic };
}

export function themePalette(option: Pick<ThemeOption, 'color' | 'tint'>): VisualPalette {
  return {
    stroke: option.color,
    strong: option.color,
    soft: mixHex(option.color, '#ffffff', 0.42),
    tint: option.tint,
    halo: `${option.color}2e`,
  };
}

export function visualPalette(visualKind: VisualKind): VisualPalette {
  switch (visualKind) {
    case 'rail':
      return { stroke: '#5f3a2e', strong: '#7b4a38', soft: '#d7b990', tint: '#f3e4c5', halo: 'rgba(95, 58, 46, 0.18)' };
    case 'water':
      return { stroke: '#236f8f', strong: '#2f86aa', soft: '#9ccfe0', tint: '#d8edf5', halo: 'rgba(35, 111, 143, 0.18)' };
    case 'energy':
      return { stroke: '#a8781c', strong: '#bf8c25', soft: '#dfbd62', tint: '#f3e2b5', halo: 'rgba(168, 120, 28, 0.2)' };
    case 'persecution':
      return { stroke: '#7b2331', strong: '#9f3344', soft: '#d796a2', tint: '#f0d6dc', halo: 'rgba(123, 35, 49, 0.18)' };
    case 'medicalCrime':
      return { stroke: '#6f3b87', strong: '#8753a0', soft: '#c5a1d0', tint: '#eadcf0', halo: 'rgba(111, 59, 135, 0.18)' };
    case 'forcedLabor':
      return { stroke: '#8a5a2b', strong: '#a86d33', soft: '#d2a36f', tint: '#f0dfc8', halo: 'rgba(138, 90, 43, 0.2)' };
    case 'liberation':
      return { stroke: '#245b7d', strong: '#2f7198', soft: '#91b8cd', tint: '#d7e8f0', halo: 'rgba(36, 91, 125, 0.18)' };
    case 'civic':
      return { stroke: '#7a6d58', strong: '#948366', soft: '#c7b99d', tint: '#ebe3d4', halo: 'rgba(122, 109, 88, 0.18)' };
    case 'route':
      return { stroke: '#7B2D42', strong: '#9a4058', soft: '#c78c9b', tint: '#efd9de', halo: 'rgba(123, 45, 66, 0.18)' };
    case 'area':
    default:
      return { stroke: '#3e6e62', strong: '#4c8274', soft: '#95b8ae', tint: '#dbe9e4', halo: 'rgba(62, 110, 98, 0.18)' };
  }
}

export function movementColor(visualKind: MovementVisualKind): string {
  switch (visualKind) {
    case 'deportation':
    case 'deportationSchematic':
      return '#7b2331';
    case 'liberation':
      return '#245b7d';
    case 'persecution':
      return '#7b2331';
    case 'schematic':
      return '#a8781c';
    default:
      return '#7B2D42';
  }
}

export function classifyVisualKind(place: Place, lang = 'de'): VisualKind {
  const text = `${localized(place.name, lang)} ${place.description ? localized(place.description, lang) : ''}`.toLowerCase();
  if (place.geometry?.type.includes('LineString') && /(neckar|fils|fluss|river|wasserlauf|wasser)/.test(text)) return 'water';
  if (/(krankenmord|euthanasie|zwangssteril|kennburg|hadamar|grafeneck|klinikum|krankenhaus|patient)/.test(text)) return 'medicalCrime';
  if (/(synagoge|pogrom|jued|jüd|juden|deport|killesberg|nordbahnhof|zeichen der erinnerung|waisenhaus|wilhelmspflege|friedhof|shoah|heppaecher|heppächer)/.test(text)) return 'persecution';
  if (/(zwangsarbeit|ruest|rüst|fabrik|industrie|stollen|luftkrieg|bombard|kriegswirtschaft)/.test(text)) return 'forcedLabor';
  if (/(befrei|us-|amerikan|franzoes|französ|besatz|waeldenbronn|wäldenbronn|kriegsende|pliensau|uebergabe|übergabe)/.test(text)) return 'liberation';
  if (/(rathaus|gemeinderat|verwaltung|marktplatz|altstadt|ritterstr|hafenmarkt|kundgebung|gleichschaltung)/.test(text)) return 'civic';
  if (/(bahn|rail|filsbahn|centralbahn|eisenbahn|steige)/.test(text)) return 'rail';
  if (/(neckar|fils|fluss|river|wasser)/.test(text)) return 'water';
  if (/(strom|energie|elektr|lauffen|kraft)/.test(text)) return 'energy';
  if (place.geometry?.type.includes('LineString')) return 'route';
  return 'area';
}

export function classifyMovementKind(movement: { name?: string; description?: string }): MovementVisualKind {
  const text = `${movement.name ?? ''} ${movement.description ?? ''}`.toLowerCase();
  if (/(deport|killesberg|nordbahnhof|riga|theresienstadt)/.test(text)) {
    return /(schematisch|rekonstruiert|beziehung|zufuehrung|zuführung)/.test(text) ? 'deportationSchematic' : 'deportation';
  }
  if (/(befrei|us-|amerikan|franzoes|französ|besatz|vormarsch|kriegsende|waeldenbronn|wäldenbronn|uebergabe|übergabe)/.test(text)) return 'liberation';
  if (/(krankenmord|euthanasie|grafeneck|hadamar|pogrom|synagoge|wilhelmspflege)/.test(text)) return 'persecution';
  return /(schematisch|rekonstruiert|energie|strom|lauffen|frankfurt|transferachse|annaeherungsroute|annäherungsroute)/.test(text) ? 'schematic' : 'route';
}

export function certaintyLabel(certainty: CertaintyLevel): string {
  switch (certainty) {
    case 'certain': return 'gesichert';
    case 'probable': return 'wahrscheinlich';
    case 'contested': return 'umstritten';
    case 'reconstructed': return 'rekonstruiert';
    default: return certainty;
  }
}

export function geometryHint(type: string, certainty: string, visualKind = ''): string {
  const typeLabel = type.includes('Polygon') ? 'Fläche' : type.includes('LineString') ? 'Linie' : type.includes('Point') ? 'Punkt' : 'Geometrie';
  const quality = visualKind === 'energy' ? 'schematische Achse' : certaintyLabel(certainty as CertaintyLevel);
  const kind = visualKindLabel(visualKind);
  return kind ? `${typeLabel} - ${kind} - ${quality}` : `${typeLabel} - ${quality}`;
}

export function visualKindLabel(visualKind: string): string {
  switch (visualKind) {
    case 'rail': return 'Eisenbahn';
    case 'water': return 'Flussraum';
    case 'energy': return 'Energieachse';
    case 'persecution': return 'Verfolgung';
    case 'medicalCrime': return 'NS-Medizinverbrechen';
    case 'forcedLabor': return 'Zwangsarbeit/Industrie';
    case 'liberation': return 'Kriegsende/Besatzung';
    case 'civic': return 'Stadt/Öffentlichkeit';
    case 'route': return 'historische Achse';
    case 'area': return 'Untersuchungsraum';
    default: return '';
  }
}

export function movementKindLabel(visualKind: string): string {
  switch (visualKind) {
    case 'schematic': return 'schematische Achse';
    case 'deportation': return 'Deportationsroute';
    case 'deportationSchematic': return 'rekonstruierte Deportationsbeziehung';
    case 'liberation': return 'Kriegsende/Besatzung';
    case 'persecution': return 'Verfolgung';
    default: return 'historische Achse';
  }
}

function placeThemeIds(place: Place, lang: string): Set<ThemeFilterId> {
  const visualKind = classifyVisualKind(place, lang);
  const tags = new Set<ThemeFilterId>();
  addThemeTags(
    tags,
    `${localized(place.name, lang)} ${place.description ? localized(place.description, lang) : ''}`,
    visualKind,
  );
  if (tags.size === 0) tags.add('civic');
  return tags;
}

function movementThemeIds(
  movement: { name?: string; description?: string },
  linkedEvent?: ChronotopEvent,
  lang = 'de',
): Set<ThemeFilterId> {
  const visualKind = classifyMovementKind(movement);
  const tags = new Set<ThemeFilterId>();
  addThemeTags(tags, `${movement.name ?? ''} ${movement.description ?? ''}`, visualKind);
  if (visualKind === 'liberation' || visualKind === 'persecution' || visualKind.includes('deportation')) tags.add('ns');
  linkedEvent?.concepts?.forEach(concept => tags.add(conceptThemeId(concept.id)));
  if (linkedEvent?.place) {
    placeThemeIds(linkedEvent.place, lang).forEach(id => {
      if (isSystemTheme(id)) tags.add(id);
    });
  }
  return tags;
}

function themeFilterMatches(tags: Set<ThemeFilterId>, filter: ThemeFilter): boolean {
  return filter.some(theme => tags.has(theme));
}

function isSystemTheme(id: ThemeFilterId): id is ThemeKey {
  return id === 'water' || id === 'rail' || id === 'civic' || id === 'industry' || id === 'ns';
}

function conceptThemeId(id: string): `concept:${string}` {
  return `concept:${id}`;
}

function addThemeTags(tags: Set<ThemeFilterId>, rawText: string, visualKind?: string) {
  const text = rawText.toLowerCase();
  if (visualKind === 'water' || /(fils|ebersbach|bach|fluss|wasser|mühl|muehl|kanal|niederung|hochwasser|badrain|mühlrad|muehlrad|gerberei|säge|saege)/.test(text)) {
    tags.add('water');
  }
  if (visualKind === 'rail' || /(bahn|filsbahn|eisenbahn|bahnhof|trasse|gleis|pendel)/.test(text)) {
    tags.add('rail');
  }
  if (visualKind === 'civic' || /(markt|amt|rathaus|post|zoll|reichsstraße|reichsstrasse|chaussee|b10|straße|strasse|wirt|kirche|schule|museum|brunnen|apotheke|öffentlich|oeffentlich|verwaltung|stiftung|bibliothek|kirchberg|burggarten|veitskirche|sonnenwirt)/.test(text)) {
    tags.add('civic');
  }
  if (visualKind === 'energy' || visualKind === 'forcedLabor' || /(industrie|fabrik|gewerbe|mühle|muehle|weberei|textil|arbeiter|kauffmann|martin|schuler|haefele|häfele|gaswerk|zement|gerberei|säge|saege|energie|mühlkanal|muehlkanal)/.test(text)) {
    tags.add('industry');
  }
  if (
    visualKind === 'persecution'
    || visualKind === 'medicalCrime'
    || visualKind === 'liberation'
    || /(\bns\b|\bns-|nationalsozial|zwangsarbeit|reichsarbeitsdienst|\brad\b|kriegsgefang|todesmarsch|gleichschaltung|luftschutz|lager|1944|1945|verfolgung|shoah|deport|pogrom)/.test(text)
  ) {
    tags.add('ns');
  }
}

function mixHex(a: string, b: string, amount: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const mixed = ca.map((channel, index) => Math.round(channel * (1 - amount) + cb[index] * amount));
  return `#${mixed.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
}

function parseHex(value: string): [number, number, number] {
  const hex = value.replace('#', '');
  const full = hex.length === 3
    ? hex.split('').map(part => part + part).join('')
    : hex.padEnd(6, '0').slice(0, 6);
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}
