import type { ThemeFilterId } from './themeFilters.js';

export type TimelineScaleMode = 'linear' | 'segmented';

export interface TimelinePhase {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  themeId?: ThemeFilterId;
  weight?: number;
}

export interface TimelineConfig {
  scaleMode: TimelineScaleMode;
  phases: TimelinePhase[];
  initialRange?: { from: number; to: number };
}

const EMPTY_CONFIG: TimelineConfig = {
  scaleMode: 'linear',
  phases: [],
};

const MODULE_TIMELINES: Record<string, TimelineConfig> = {
  '00000000-0000-0000-0000-000000000003': {
    scaleMode: 'linear',
    initialRange: { from: 1933, to: 1945.6 },
    phases: [
      { id: 'es-p1', label: 'Machtübernahme', startYear: 1933, endYear: 1934, themeId: 'civic' },
      { id: 'es-p2', label: 'Ausgrenzung', startYear: 1935, endYear: 1938, themeId: 'ns' },
      { id: 'es-p3', label: 'Gewalt & Krieg', startYear: 1939, endYear: 1942.8, themeId: 'ns' },
      { id: 'es-p4', label: 'Kriegsende', startYear: 1943, endYear: 1945.6, themeId: 'ns' },
    ],
  },
  '00000000-0000-0000-0000-000000000004': {
    scaleMode: 'linear',
    initialRange: { from: 1845, to: 1914 },
    phases: [
      { id: 'nf-p1', label: 'Bahnraum', startYear: 1845, endYear: 1859, themeId: 'rail' },
      { id: 'nf-p2', label: 'Industrieorte', startYear: 1860, endYear: 1888, themeId: 'industry' },
      { id: 'nf-p3', label: 'Energie & Cluster', startYear: 1889, endYear: 1898, themeId: 'industry' },
      { id: 'nf-p4', label: 'Vernetzung', startYear: 1899, endYear: 1914, themeId: 'rail' },
    ],
  },
  '00000000-0000-0000-0000-000000000005': {
    scaleMode: 'segmented',
    initialRange: { from: 1160, to: 2012 },
    phases: [
      { id: 'eb-p1', label: 'Siedlung & Herrschaft', startYear: 1160, endYear: 1599, themeId: 'civic', weight: 1.25 },
      { id: 'eb-p2', label: 'Krise & Marktort', startYear: 1600, endYear: 1787, themeId: 'civic', weight: 1 },
      { id: 'eb-p3', label: 'Wasser, Straße, Bahn', startYear: 1788, endYear: 1886, themeId: 'rail', weight: 1.15 },
      { id: 'eb-p4', label: 'Industrialisierung', startYear: 1887, endYear: 1933, themeId: 'industry', weight: 1.25 },
      { id: 'eb-p5', label: 'NS-Zeit & Krieg', startYear: 1934, endYear: 1945, themeId: 'ns', weight: 0.95 },
      { id: 'eb-p6', label: 'Nachkrieg & Stadtumbau', startYear: 1946, endYear: 2012, themeId: 'civic', weight: 1.25 },
    ],
  },
};

export function getTimelineConfig(moduleId: string | null | undefined, fallbackFrom: number, fallbackTo: number): TimelineConfig {
  const config = moduleId ? MODULE_TIMELINES[moduleId] : undefined;
  if (!config) {
    return {
      ...EMPTY_CONFIG,
      initialRange: { from: fallbackFrom, to: fallbackTo },
    };
  }
  return config;
}
