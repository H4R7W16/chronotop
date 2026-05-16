import { describe, expect, it } from 'vitest';
import { buildTimelineScale, generateTimelineTicks } from './timelineScale.js';

describe('buildTimelineScale', () => {
  it('bildet lineare Jahre stabil auf 0..1 ab', () => {
    const scale = buildTimelineScale({
      minYear: 1900,
      maxYear: 2000,
      mode: 'linear',
      phases: [],
    });

    expect(scale.ratioForYear(1900)).toBe(0);
    expect(scale.ratioForYear(1950)).toBeCloseTo(0.5);
    expect(scale.yearForRatio(1)).toBe(2000);
  });

  it('verteilt segmentierte Phasen nach Gewicht statt nach Rohdauer', () => {
    const scale = buildTimelineScale({
      minYear: 1160,
      maxYear: 2012,
      mode: 'segmented',
      phases: [
        { id: 'long', label: 'Lang', startYear: 1160, endYear: 1599, weight: 1 },
        { id: 'short', label: 'Kurz', startYear: 1934, endYear: 1945, weight: 1 },
      ],
    });

    expect(scale.segments).toHaveLength(2);
    expect(scale.segments[0].ratioEnd).toBeCloseTo(0.5);
    expect(scale.ratioForYear(1939)).toBeGreaterThan(0.5);
    expect(scale.yearForRatio(0.75)).toBeGreaterThan(1934);
  });

  it('erzeugt Major-Ticks fuer segmentierte Phasengrenzen', () => {
    const scale = buildTimelineScale({
      minYear: 1933,
      maxYear: 1945,
      mode: 'segmented',
      phases: [
        { id: 'a', label: 'A', startYear: 1933, endYear: 1938 },
        { id: 'b', label: 'B', startYear: 1939, endYear: 1945 },
      ],
    });

    const majorYears = generateTimelineTicks(scale).filter(tick => tick.major).map(tick => tick.year);
    expect(majorYears).toContain(1933);
    expect(majorYears).toContain(1938);
    expect(majorYears).toContain(1939);
    expect(majorYears).toContain(1945);
  });
});
