import { describe, it, expect } from 'vitest';
import { isPlaceValidInRange } from './timelineUtils.js';

describe('isPlaceValidInRange', () => {
  it('zeigt einen Place ohne Gültigkeit immer', () => {
    expect(isPlaceValidInRange(undefined, undefined, '1900-01-01', '2000-01-01')).toBe(true);
    expect(isPlaceValidInRange(null, null, '1900-01-01', '2000-01-01')).toBe(true);
  });

  it('zeigt einen Place ohne aktiven Filter immer', () => {
    expect(isPlaceValidInRange('1933-01-30', '1945-05-08', undefined, undefined)).toBe(true);
  });

  it('zeigt das Reich (1933–1945) bei Cursor 1938 — Cursor mit ±0,5 Jahre Fenster', () => {
    expect(isPlaceValidInRange('1933-01-30', '1945-05-08', '1937-05-15', '1938-05-15')).toBe(true);
  });

  it('verbirgt das Reich (1933–1945) bei Cursor 1989', () => {
    expect(isPlaceValidInRange('1933-01-30', '1945-05-08', '1988-05-15', '1989-05-15')).toBe(false);
  });

  it('verbirgt die Mauer (1961–1989) bei Cursor 1938', () => {
    expect(isPlaceValidInRange('1961-08-13', '1989-11-09', '1937-05-15', '1938-05-15')).toBe(false);
  });

  it('zeigt die Mauer (1961–1989) bei Cursor 1989', () => {
    expect(isPlaceValidInRange('1961-08-13', '1989-11-09', '1988-05-15', '1989-05-15')).toBe(true);
  });

  it('Range-Filter überlappt mit teilweise gültigem Place', () => {
    // HRR 962–1806, Filter 1500–1900 → Überlappung 1500–1806 → sichtbar
    expect(isPlaceValidInRange('0962', '1806-08-06', '1500', '1900')).toBe(true);
  });

  it('keine Überlappung wenn Filter komplett vor Place', () => {
    expect(isPlaceValidInRange('1933-01-30', '1945-05-08', '1850', '1900')).toBe(false);
  });

  it('keine Überlappung wenn Filter komplett nach Place', () => {
    expect(isPlaceValidInRange('1933-01-30', '1945-05-08', '1990', '2000')).toBe(false);
  });

  it('zeigt Place mit nur validFrom (offenes Ende), wenn Filter danach liegt', () => {
    // Bundesrepublik gibt's seit 1949 → Filter 1980 → sichtbar
    expect(isPlaceValidInRange('1949', undefined, '1980', '1981')).toBe(true);
  });

  it('verbirgt Place mit nur validFrom, wenn Filter komplett davor liegt', () => {
    expect(isPlaceValidInRange('1949', undefined, '1900', '1940')).toBe(false);
  });
});
