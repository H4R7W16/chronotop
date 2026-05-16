import { computeTickStep } from './timelineUtils.js';
import type { TimelinePhase, TimelineScaleMode } from './timelineConfig.js';

export interface TimelineSegment {
  id: string;
  label: string;
  startYear: number;
  endYear: number;
  ratioStart: number;
  ratioEnd: number;
  themeId?: TimelinePhase['themeId'];
}

export interface TimelineTick {
  year: number;
  major: boolean;
}

export interface TimelineScale {
  mode: TimelineScaleMode;
  minYear: number;
  maxYear: number;
  segments: TimelineSegment[];
  ratioForYear: (year: number) => number;
  yearForRatio: (ratio: number) => number;
}

export function buildTimelineScale({
  minYear,
  maxYear,
  mode,
  phases,
}: {
  minYear: number;
  maxYear: number;
  mode: TimelineScaleMode;
  phases: TimelinePhase[];
}): TimelineScale {
  const safeMin = Number.isFinite(minYear) ? minYear : 1900;
  const safeMax = Number.isFinite(maxYear) && maxYear > safeMin ? maxYear : safeMin + 1;

  if (mode === 'segmented' && phases.length > 0) {
    const ordered = phases
      .filter(phase => phase.endYear > phase.startYear)
      .sort((a, b) => a.startYear - b.startYear);
    const totalWeight = ordered.reduce((sum, phase) => sum + phaseWeight(phase), 0) || 1;
    let cursor = 0;
    const segments = ordered.map(phase => {
      const width = phaseWeight(phase) / totalWeight;
      const segment: TimelineSegment = {
        id: phase.id,
        label: phase.label,
        startYear: phase.startYear,
        endYear: phase.endYear,
        ratioStart: cursor,
        ratioEnd: cursor + width,
        themeId: phase.themeId,
      };
      cursor += width;
      return segment;
    });
    if (segments.length > 0) {
      segments[segments.length - 1].ratioEnd = 1;
    }
    return {
      mode,
      minYear: Math.min(safeMin, segments[0]?.startYear ?? safeMin),
      maxYear: Math.max(safeMax, segments[segments.length - 1]?.endYear ?? safeMax),
      segments,
      ratioForYear: year => segmentedRatioForYear(year, segments),
      yearForRatio: ratio => segmentedYearForRatio(ratio, segments),
    };
  }

  const segment: TimelineSegment = {
    id: 'linear',
    label: '',
    startYear: safeMin,
    endYear: safeMax,
    ratioStart: 0,
    ratioEnd: 1,
  };
  return {
    mode: 'linear',
    minYear: safeMin,
    maxYear: safeMax,
    segments: [segment],
    ratioForYear: year => clamp01((year - safeMin) / (safeMax - safeMin || 1)),
    yearForRatio: ratio => safeMin + clamp01(ratio) * (safeMax - safeMin || 1),
  };
}

export function generateTimelineTicks(scale: TimelineScale, targetTicks = 7): TimelineTick[] {
  if (scale.mode === 'linear') {
    const range = scale.maxYear - scale.minYear || 1;
    const majorStep = computeTickStep(range, targetTicks);
    const minorStep = majorStep / (majorStep >= 10 ? 10 : majorStep >= 5 ? 5 : 1);
    const ticks: TimelineTick[] = [];
    for (let y = Math.ceil(scale.minYear / minorStep) * minorStep; y <= scale.maxYear; y += minorStep) {
      const rounded = roundYear(y);
      ticks.push({ year: rounded, major: Math.abs(rounded % majorStep) < 0.001 });
    }
    return uniqueTicks(ticks);
  }

  const ticks: TimelineTick[] = [];
  for (const segment of scale.segments) {
    const duration = segment.endYear - segment.startYear;
    const step = computeTickStep(duration, duration > 80 ? 3 : 2);
    ticks.push({ year: segment.startYear, major: true });
    for (let y = Math.ceil(segment.startYear / step) * step; y < segment.endYear; y += step) {
      if (y > segment.startYear + 0.01) ticks.push({ year: roundYear(y), major: false });
    }
    ticks.push({ year: segment.endYear, major: true });
  }
  return uniqueTicks(ticks);
}

function phaseWeight(phase: TimelinePhase): number {
  if (phase.weight && phase.weight > 0) return phase.weight;
  const duration = Math.max(1, phase.endYear - phase.startYear);
  return Math.max(0.75, Math.sqrt(duration) / 9);
}

function segmentedRatioForYear(year: number, segments: TimelineSegment[]): number {
  if (segments.length === 0) return 0;
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (year <= first.startYear) return first.ratioStart;
  if (year >= last.endYear) return last.ratioEnd;
  const segment = segments.find(s => year >= s.startYear && year <= s.endYear)
    ?? segments.reduce((nearest, current) => {
      const nearestDistance = Math.min(Math.abs(year - nearest.startYear), Math.abs(year - nearest.endYear));
      const currentDistance = Math.min(Math.abs(year - current.startYear), Math.abs(year - current.endYear));
      return currentDistance < nearestDistance ? current : nearest;
    }, first);
  const local = (year - segment.startYear) / (segment.endYear - segment.startYear || 1);
  return segment.ratioStart + clamp01(local) * (segment.ratioEnd - segment.ratioStart);
}

function segmentedYearForRatio(ratio: number, segments: TimelineSegment[]): number {
  if (segments.length === 0) return 1900;
  const r = clamp01(ratio);
  const segment = segments.find(s => r >= s.ratioStart && r <= s.ratioEnd) ?? segments[segments.length - 1];
  const local = (r - segment.ratioStart) / (segment.ratioEnd - segment.ratioStart || 1);
  return segment.startYear + clamp01(local) * (segment.endYear - segment.startYear);
}

function uniqueTicks(ticks: TimelineTick[]): TimelineTick[] {
  const seen = new Map<string, TimelineTick>();
  ticks.forEach(tick => {
    const key = tick.year.toFixed(3);
    const existing = seen.get(key);
    if (!existing || tick.major) seen.set(key, tick);
  });
  return [...seen.values()].sort((a, b) => a.year - b.year);
}

function roundYear(year: number): number {
  return Math.round(year * 1000) / 1000;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
