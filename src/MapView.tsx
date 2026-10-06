import { useEffect, useRef, useState } from 'react';
import maplibregl, { type GeoJSONSource, type MapLayerMouseEvent } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { CENTER_TYPES, prefersReducedMotion, type Center, type LngLat } from './lib';
import { loadImage, pinSvg } from './icons';
import type { Lang, T } from './i18n';

// Lazy-loads only when Arabic (right-to-left) map labels are first needed
maplibregl
  .setRTLTextPlugin('https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.3.0/dist/mapbox-gl-rtl-text.js', true)
  .catch(() => {});

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const NYC: [number, number] = [-73.94, 40.71];
const NYC_BOUNDS: [[number, number], [number, number]] = [
  [-74.6, 40.35],
  [-73.3, 41.1],
];

interface Props {
  stacks: Center[][];
  selectedId: string | null;
  highlightId: string | null;
  origin: (LngLat & { label: string }) | null;
  nearest: Center[];
  lang: Lang;
  t: T;
  onSelect: (id: string) => void;
}

export default function MapView({ stacks, selectedId, highlightId, origin, nearest, lang, t, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const originMarker = useRef<maplibregl.Marker | null>(null);
  const labelFields = useRef<Map<string, unknown>>(new Map());
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  /* ---------- Create the map once ---------- */
  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current!,
      style: STYLE,
      center: NYC,
      zoom: 10,
      minZoom: 9,
      maxBounds: NYC_BOUNDS,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    map.touchZoomRotate.disableRotation();
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    map.on('load', async () => {
      // Pin images: one per type × stack size
      await Promise.all(
        CENTER_TYPES.flatMap((type) =>
          [1, 2, 3].map(async (n) => {
            map.addImage(`${type}-${n}`, await loadImage(pinSvg(type, n)), { pixelRatio: 2 });
          }),
        ),
      );

      map.addSource('centers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterRadius: 44,
        clusterMaxZoom: 12,
        // Count sites, not pins: a stacked pin holds several sites
        clusterProperties: { sites: ['+', ['get', 'count']] },
      });

      map.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'centers',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#101a6e',
          'circle-radius': ['step', ['get', 'sites'], 17, 5, 21, 10, 25],
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'centers',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['to-string', ['get', 'sites']],
          'text-font': ['Noto Sans Bold'],
          'text-size': 14,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#fff' },
      });
      // Ring behind the highlighted/selected pin
      map.addLayer({
        id: 'pin-halo',
        type: 'circle',
        source: 'centers',
        filter: ['==', ['get', 'ids'], '__none__'],
        paint: {
          'circle-radius': 25,
          'circle-translate': [0, -21],
          'circle-color': 'rgba(255, 213, 0, 0.35)',
          'circle-stroke-color': '#111',
          'circle-stroke-width': 2.5,
        },
      });
      map.addLayer({
        id: 'pins',
        type: 'symbol',
        source: 'centers',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': ['get', 'icon'],
          'icon-anchor': 'bottom',
          'icon-size': 0.82,
          'icon-allow-overlap': true,
          'icon-ignore-placement': true,
        },
      });

      map.on('click', 'clusters', async (e: MapLayerMouseEvent) => {
        const f = e.features![0];
        const source = map.getSource('centers') as GeoJSONSource;
        const zoom = await source.getClusterExpansionZoom(f.properties.cluster_id);
        map.easeTo({
          center: (f.geometry as { coordinates: [number, number] }).coordinates,
          zoom: zoom + 0.5,
          duration: prefersReducedMotion() ? 0 : 500,
        });
      });
      map.on('click', 'pins', (e: MapLayerMouseEvent) => {
        onSelectRef.current(e.features![0].properties.id);
      });

      // Hover tooltip with the name(s) at a pin
      const tip = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: [0, -40], className: 'pin-tip' });
      map.on('mouseenter', 'pins', (e: MapLayerMouseEvent) => {
        map.getCanvas().style.cursor = 'pointer';
        const f = e.features![0];
        tip
          .setLngLat((f.geometry as { coordinates: [number, number] }).coordinates)
          .setText(JSON.parse(f.properties.names).join(' · '))
          .addTo(map);
      });
      map.on('mouseleave', 'pins', () => {
        map.getCanvas().style.cursor = '';
        tip.remove();
      });
      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));

      // Remember which basemap labels show place names so we can localize them
      for (const layer of map.getStyle().layers) {
        const field = layer.type === 'symbol' ? layer.layout?.['text-field'] : undefined;
        if (field && JSON.stringify(field).includes('name')) labelFields.current.set(layer.id, field);
      }
      setReady(true);
    });

    return () => map.remove();
  }, []);

  /* ---------- Data ---------- */
  useEffect(() => {
    if (!ready) return;
    const features = stacks.map((stack) => {
      const first = stack[0];
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [first.lng, first.lat] },
        properties: {
          id: first.id,
          ids: '|' + stack.map((c) => c.id).join('|') + '|',
          names: JSON.stringify(stack.map((c) => c.name)),
          count: stack.length,
          icon: `${first.type}-${Math.min(stack.length, 3)}`,
        },
      };
    });
    (mapRef.current!.getSource('centers') as GeoJSONSource).setData({ type: 'FeatureCollection', features });
  }, [ready, stacks]);

  /* ---------- Highlight + selection ---------- */
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const active = selectedId ?? highlightId;
    const match = active ? ['in', `|${active}|`, ['get', 'ids']] : false;
    map.setFilter('pin-halo', ['all', ['!', ['has', 'point_count']], match] as maplibregl.FilterSpecification);
    map.setLayoutProperty('pins', 'symbol-sort-key', ['case', match, 1, 0]);
    map.setLayoutProperty('pins', 'icon-size', ['case', match, 0.98, 0.82]);
  }, [ready, selectedId, highlightId]);

  // Move to a center when it's selected (from the list, a deep link or a pin)
  useEffect(() => {
    if (!ready || !selectedId) return;
    const c = stacks.flat().find((x) => x.id === selectedId);
    if (!c) return;
    const map = mapRef.current!;
    map.easeTo({
      center: [c.lng, c.lat],
      zoom: Math.max(map.getZoom(), 14),
      duration: prefersReducedMotion() ? 0 : 600,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, selectedId]);

  /* ---------- Search origin ---------- */
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    originMarker.current?.remove();
    originMarker.current = null;
    if (!origin) return;

    const el = document.createElement('div');
    el.className = 'origin-marker';
    el.setAttribute('aria-hidden', 'true');
    originMarker.current = new maplibregl.Marker({ element: el }).setLngLat(origin).addTo(map);

    // Fit the origin and the closest few results
    const bounds = new maplibregl.LngLatBounds([origin.lng, origin.lat], [origin.lng, origin.lat]);
    nearest.slice(0, 3).forEach((c) => bounds.extend([c.lng, c.lat]));
    map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: prefersReducedMotion() ? 0 : 800 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, origin]);

  /* ---------- Language ---------- */
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const field = ['coalesce', ['get', `name:${lang}`], ['get', 'name:latin'], ['get', 'name']];
    labelFields.current.forEach((_, id) => map.setLayoutProperty(id, 'text-field', field));

    const canvas = map.getCanvas();
    canvas.setAttribute('aria-label', t('mapLabel'));
    canvas.setAttribute('role', 'application');
    const label = (sel: string, text: string) => {
      const btn = containerRef.current!.querySelector(sel);
      btn?.setAttribute('title', text);
      btn?.setAttribute('aria-label', text);
    };
    label('.maplibregl-ctrl-zoom-in', t('zoomIn'));
    label('.maplibregl-ctrl-zoom-out', t('zoomOut'));
  }, [ready, lang, t]);

  return (
    <div className="map-wrap">
      <div ref={containerRef} className="map" />
      <p className="map-hint" aria-hidden="true">
        {t('mapHint')}
      </p>
    </div>
  );
}
