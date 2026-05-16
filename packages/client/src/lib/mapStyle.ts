import type { StyleSpecification } from 'maplibre-gl';

export interface MapStyleOption {
  id: 'parchment' | 'modern' | 'topo' | 'historic';
  label: string;
  description: string;
  spec: StyleSpecification;
}

const cartoLightTiles = [
  'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
  'https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
  'https://c.basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
];
const cartoVoyagerTiles = [
  'https://a.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
  'https://b.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
  'https://c.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png',
];
const opentopoTiles = [
  'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
  'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
  'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
];

const cartoAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

const opentopoAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)';

// Pergament-Stil: warm-getöntes CARTO Light, leicht entsättigt
const parchmentStyle: StyleSpecification = {
  version: 8,
  sources: {
    base: { type: 'raster', tiles: cartoLightTiles, tileSize: 256, attribution: cartoAttribution },
  },
  layers: [
    {
      id: 'base-tiles', type: 'raster', source: 'base', minzoom: 0, maxzoom: 19,
      paint: {
        'raster-saturation': -0.4,
        'raster-contrast': 0.05,
        'raster-brightness-min': 0.05,
        'raster-brightness-max': 0.95,
      },
    },
  ],
};

// Modern: klares CARTO Voyager mit gedämpften Farben
const modernStyle: StyleSpecification = {
  version: 8,
  sources: {
    base: { type: 'raster', tiles: cartoVoyagerTiles, tileSize: 256, attribution: cartoAttribution },
  },
  layers: [
    { id: 'base-tiles', type: 'raster', source: 'base', minzoom: 0, maxzoom: 19 },
  ],
};

// Topografisch: OpenTopoMap mit Höhenlinien und Reliefschattierung
const topoStyle: StyleSpecification = {
  version: 8,
  sources: {
    base: { type: 'raster', tiles: opentopoTiles, tileSize: 256, attribution: opentopoAttribution, maxzoom: 17 },
  },
  layers: [
    { id: 'base-tiles', type: 'raster', source: 'base', minzoom: 0, maxzoom: 17 },
  ],
};

export const MAP_STYLES: MapStyleOption[] = [
  { id: 'parchment', label: 'Pergament', description: 'Warm getönter Geschichtsstil', spec: parchmentStyle },
  { id: 'modern',    label: 'Modern',    description: 'Klare moderne Karte', spec: modernStyle },
  { id: 'topo',      label: 'Topografisch', description: 'Mit Höhenlinien und Relief', spec: topoStyle },
];

/**
 * Erzeugt einen dynamischen MapStyleOption für eine historische Karte
 * anhand einer XYZ-Tile-URL (z.B. https://host/{z}/{x}/{y}.png).
 */
export function buildHistoricStyle(tileUrl: string, label: string): MapStyleOption {
  const spec: StyleSpecification = {
    version: 8,
    sources: {
      historic: {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution: label,
      },
    },
    layers: [
      {
        id: 'historic-tiles',
        type: 'raster',
        source: 'historic',
        minzoom: 0,
        maxzoom: 20,
        paint: {
          'raster-opacity': 1,
        },
      },
    ],
  };
  return { id: 'historic', label: 'Hist. Karte', description: label, spec };
}

export const DEFAULT_STYLE_ID: MapStyleOption['id'] = 'parchment';
export const DEFAULT_CENTER: [number, number] = [10.0, 50.0];
export const DEFAULT_ZOOM = 4;

// Bequemlichkeits-Export: Standard-Stil
export const mapStyle: StyleSpecification = parchmentStyle;
