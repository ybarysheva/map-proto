import type { StyleSpecification, LayerSpecification } from 'maplibre-gl';

// OpenFreeMap "Liberty" (free, no key), recolored to feel like Google Maps:
// light gray land, bright blue water, soft green parks, white streets, blue-gray highways, few labels.
const SOURCE_STYLE = 'https://tiles.openfreemap.org/styles/liberty';

const C = {
  land: '#f1f3f4',
  park: '#c5e8c5',
  parkDark: '#b5dfb5',
  water: '#90daee',
  waterLabel: '#2f7d98',
  hospital: '#fbe9ea',
  sand: '#f5efd9',
  airport: '#e8eaed',
  street: '#ffffff',
  streetCasing: '#dadce0',
  avenueCasing: '#cfd3d8',
  highway: '#aebfd6',
  highwayCasing: '#94a8c4',
  rail: '#c4c8ce',
  building: '#e6e7ea',
  buildingOutline: '#dcdee2',
  roadLabel: '#5f6368',
  placeLabel: '#3c4043',
};

// Layers we drop entirely
const REMOVE = new Set([
  'natural_earth',
  'landuse_residential',
  'landuse_school',
  'park_outline',
  'building-3d', // the "shadows"
  'poi_r1', // shops, restaurants, etc. — compete with our pins
  'poi_r7',
  'poi_r20',
  'road_one_way_arrow',
  'road_one_way_arrow_opposite',
  'road_area_pattern',
]);

type Paint = Record<string, unknown>;

function roadColor(id: string): string | null {
  if (/rail/.test(id)) return C.rail;
  const casing = id.endsWith('_casing');
  if (/motorway/.test(id)) return casing ? C.highwayCasing : C.highway;
  if (/trunk_primary|secondary_tertiary|_link/.test(id)) return casing ? C.avenueCasing : C.street;
  if (/minor|street|service_track|path_pedestrian/.test(id)) return casing ? C.streetCasing : C.street;
  return null;
}

function restyle(layer: LayerSpecification): LayerSpecification | null {
  if (REMOVE.has(layer.id)) return null;
  const id = layer.id;
  const paint = { ...(layer as { paint?: Paint }).paint } as Paint;
  const layout = { ...(layer as { layout?: Paint }).layout } as Paint;
  let minzoom = layer.minzoom;

  if (id === 'background') paint['background-color'] = C.land;
  else if (id === 'park' || id === 'landcover_grass' || id === 'landuse_pitch' || id === 'landuse_track') {
    paint['fill-color'] = C.park;
    delete paint['fill-outline-color'];
  } else if (id === 'landcover_wood' || id === 'landuse_cemetery') paint['fill-color'] = C.parkDark;
  else if (id === 'landuse_hospital') paint['fill-color'] = C.hospital;
  else if (id === 'landcover_sand') paint['fill-color'] = C.sand;
  else if (id === 'aeroway_fill') paint['fill-color'] = C.airport;
  else if (id === 'water') paint['fill-color'] = C.water;
  else if (id.startsWith('waterway_') && layer.type === 'line') paint['line-color'] = C.water;
  else if (id === 'building') {
    minzoom = 16; // buildings only when zoomed right in
    paint['fill-color'] = C.building;
    paint['fill-outline-color'] = C.buildingOutline;
  } else if (layer.type === 'line' && 'source-layer' in layer && layer['source-layer'] === 'transportation') {
    const color = roadColor(id);
    if (color) paint['line-color'] = color;
  } else if (id === 'poi_transit') {
    // Keep subway/rail stations; bus stops look too much like our warming-bus pins
    (layer as { filter?: unknown }).filter = ['match', ['get', 'class'], ['airport', 'rail'], true, false];
  } else if (id.startsWith('highway-name')) {
    paint['text-color'] = C.roadLabel;
    paint['text-halo-color'] = '#ffffff';
    paint['text-halo-width'] = 1.5;
  } else if (id.includes('water_name') || id === 'waterway_line_label') {
    paint['text-color'] = C.waterLabel;
    paint['text-halo-color'] = 'rgba(255,255,255,0.6)';
  } else if (id === 'label_other') {
    // Neighborhoods: small, spaced-out caps like Google
    paint['text-color'] = C.placeLabel;
    layout['text-transform'] = 'uppercase';
    layout['text-letter-spacing'] = 0.12;
    layout['text-font'] = ['Noto Sans Bold'];
  } else if (id.startsWith('label_')) {
    paint['text-color'] = '#202124';
  }

  const out = { ...layer, paint, layout } as LayerSpecification;
  if (minzoom !== undefined) out.minzoom = minzoom;
  return out;
}

export async function loadBasemapStyle(): Promise<StyleSpecification> {
  const style: StyleSpecification = await fetch(SOURCE_STYLE).then((r) => r.json());
  style.layers = style.layers.map(restyle).filter((l): l is LayerSpecification => l !== null);
  return style;
}
