import type { CertaintyLevel, PlaceGeometry } from '@chronotop/shared';

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: [number, number] }
  | PlaceGeometry
  | { type: 'GeometryCollection'; geometries: GeoJsonGeometry[] };

interface GeoJsonFeature {
  type: 'Feature';
  properties?: Record<string, unknown> | null;
  geometry?: GeoJsonGeometry | null;
}

interface ParseOptions {
  defaultCertainty?: CertaintyLevel;
  defaultValidFrom?: string;
  defaultValidTo?: string;
}

export interface GeoJsonImportItem {
  id: string;
  name: string;
  description?: string;
  geometry?: PlaceGeometry;
  geometryType: 'Point' | PlaceGeometry['type'];
  lat: number;
  lng: number;
  validFrom?: string;
  validTo?: string;
  certainty: CertaintyLevel;
  sourceTitle?: string;
  sourceDetail?: string;
  sourceUrl?: string;
  license?: string;
  qualityStatus?: string;
  properties: Record<string, unknown>;
}

export interface GeoJsonImportResult {
  items: GeoJsonImportItem[];
  warnings: string[];
}

const certaintyValues = new Set<CertaintyLevel>(['certain', 'probable', 'contested', 'reconstructed']);

export function parseGeoJsonImport(raw: string | object, options: ParseOptions = {}): GeoJsonImportResult {
  const warnings: string[] = [];
  const json = typeof raw === 'string' ? JSON.parse(raw) : raw;
  const features = collectFeatures(json, warnings);
  const items: GeoJsonImportItem[] = [];

  features.forEach((feature, featureIndex) => {
    const properties = feature.properties ?? {};
    const geometries = flattenGeometry(feature.geometry, warnings);
    geometries.forEach((geometry, geometryIndex) => {
      const normalized = normalizeGeometry(geometry);
      if (!normalized) {
        warnings.push(`Feature ${featureIndex + 1}: Geometrietyp "${geometry?.type ?? 'unbekannt'}" wird nicht unterstuetzt.`);
        return;
      }

      const center = geometryCenter(normalized.geometry, normalized.point);
      if (!center) {
        warnings.push(`Feature ${featureIndex + 1}: keine gueltigen Koordinaten gefunden.`);
        return;
      }

      const name = pickString(properties, ['name', 'Name', 'NAME', 'title', 'Titel', 'label', 'LABEL', 'bezeichnung', 'BEZEICHNUNG'])
        ?? `GeoJSON-Objekt ${items.length + 1}`;
      const certaintyRaw = pickString(properties, ['certainty', 'sicherheit', 'quality', 'qualitaet']);
      const certainty = certaintyRaw && certaintyValues.has(certaintyRaw as CertaintyLevel)
        ? certaintyRaw as CertaintyLevel
        : options.defaultCertainty ?? 'reconstructed';

      items.push({
        id: `${featureIndex}-${geometryIndex}-${items.length}`,
        name,
        description: pickString(properties, ['description', 'Beschreibung', 'desc', 'DESC', 'note', 'Kommentar']),
        geometry: normalized.geometry,
        geometryType: normalized.geometry?.type ?? 'Point',
        lat: center.lat,
        lng: center.lng,
        validFrom: pickString(properties, ['validFrom', 'valid_from', 'start', 'Start', 'from', 'von']) ?? options.defaultValidFrom,
        validTo: pickString(properties, ['validTo', 'valid_to', 'end', 'Ende', 'to', 'bis']) ?? options.defaultValidTo,
        certainty,
        sourceTitle: pickString(properties, ['sourceTitle', 'source_title', 'sourceName', 'source_name', 'Quellentitel']),
        sourceDetail: pickString(properties, ['sourceDetail', 'source_detail', 'sourcePage', 'source_page', 'evidence', 'evidenceNote', 'Beleg', 'Fundstelle']),
        sourceUrl: pickString(properties, ['source', 'sourceUrl', 'source_url', 'Quelle', 'url', 'URL']),
        license: pickString(properties, ['license', 'Lizenz', 'licence']),
        qualityStatus: pickString(properties, ['qualityStatus', 'quality_status', 'sourceStatus', 'source_status', 'Quellenstatus']),
        properties,
      });
    });
  });

  return { items, warnings };
}

export function geometryTypeLabel(type: GeoJsonImportItem['geometryType']): string {
  switch (type) {
    case 'Point': return 'Punkt';
    case 'LineString': return 'Linie';
    case 'MultiLineString': return 'Liniengruppe';
    case 'Polygon': return 'Flaeche';
    case 'MultiPolygon': return 'Flaechengruppe';
    default: return type;
  }
}

export function countGeometryPoints(item: Pick<GeoJsonImportItem, 'geometry' | 'geometryType'>): number {
  if (!item.geometry) return 1;
  let count = 0;
  visitCoordinates(item.geometry.coordinates, coord => {
    count += 1;
    return coord;
  });
  return count;
}

function collectFeatures(input: any, warnings: string[]): GeoJsonFeature[] {
  if (!input || typeof input !== 'object') throw new Error('Kein GeoJSON-Objekt.');
  if (input.type === 'FeatureCollection' && Array.isArray(input.features)) {
    return input.features.filter((f: any) => f?.type === 'Feature');
  }
  if (input.type === 'Feature') return [input as GeoJsonFeature];
  if (typeof input.type === 'string' && input.coordinates) {
    return [{ type: 'Feature', properties: {}, geometry: input as GeoJsonGeometry }];
  }
  warnings.push('GeoJSON enthaelt keine FeatureCollection, kein Feature und keine direkte Geometrie.');
  return [];
}

function flattenGeometry(geometry: GeoJsonGeometry | null | undefined, warnings: string[]): GeoJsonGeometry[] {
  if (!geometry) return [];
  if (geometry.type !== 'GeometryCollection') return [geometry];
  if (!Array.isArray(geometry.geometries)) {
    warnings.push('GeometryCollection ohne geometries-Array uebersprungen.');
    return [];
  }
  return geometry.geometries.flatMap(g => flattenGeometry(g, warnings));
}

function normalizeGeometry(geometry: GeoJsonGeometry | null | undefined): { geometry?: PlaceGeometry; point?: [number, number] } | null {
  if (!geometry) return null;
  if (geometry.type === 'Point') {
    return isLngLat(geometry.coordinates) ? { point: geometry.coordinates } : null;
  }
  if (
    geometry.type === 'LineString'
    || geometry.type === 'MultiLineString'
    || geometry.type === 'Polygon'
    || geometry.type === 'MultiPolygon'
  ) {
    return hasAnyLngLat(geometry.coordinates) ? { geometry } : null;
  }
  return null;
}

function geometryCenter(geometry?: PlaceGeometry, point?: [number, number]): { lng: number; lat: number } | null {
  if (point) return { lng: point[0], lat: point[1] };
  if (!geometry) return null;
  const coords: [number, number][] = [];
  visitCoordinates(geometry.coordinates, coord => {
    coords.push(coord);
    return coord;
  });
  if (coords.length === 0) return null;
  const lngs = coords.map(c => c[0]);
  const lats = coords.map(c => c[1]);
  return {
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
  };
}

function pickString(properties: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function hasAnyLngLat(value: unknown): boolean {
  let found = false;
  visitCoordinates(value, coord => {
    found = true;
    return coord;
  });
  return found;
}

function visitCoordinates(value: unknown, visit: (coord: [number, number]) => [number, number]): unknown {
  if (isLngLat(value)) return visit(value);
  if (Array.isArray(value)) return value.map(v => visitCoordinates(v, visit));
  return value;
}

function isLngLat(value: unknown): value is [number, number] {
  return Array.isArray(value)
    && value.length >= 2
    && typeof value[0] === 'number'
    && Number.isFinite(value[0])
    && typeof value[1] === 'number'
    && Number.isFinite(value[1]);
}
