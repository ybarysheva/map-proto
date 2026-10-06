import { CENTER_TYPES, type CenterType, type LngLat } from './lib';
import type { Lang } from './i18n';

export type When = 'any' | 'now' | 'at';

export interface Filters {
  when: When;
  at: string; // HH:MM
  types: CenterType[];
  pets: boolean;
  wheelchair: boolean;
}

export type Origin = LngLat & { label: string };

export const DEFAULT_FILTERS: Filters = {
  when: 'any',
  at: '16:30',
  types: [],
  pets: false,
  wheelchair: false,
};

export const activeFilterCount = (f: Filters) =>
  (f.when !== 'any' ? 1 : 0) + f.types.length + (f.pets ? 1 : 0) + (f.wheelchair ? 1 : 0);

/* ---------- Deep links: everything shareable lives in the URL ---------- */

export interface UrlState {
  lang: Lang;
  filters: Filters;
  origin: Origin | null;
  selectedId: string | null;
}

export function readUrl(): UrlState {
  const p = new URLSearchParams(location.search);
  const near = p.get('near')?.split(',').map(Number);
  const lang = p.get('lang');
  return {
    lang: lang === 'es' || lang === 'zh' || lang === 'ar' ? lang : 'en',
    selectedId: p.get('center'),
    origin:
      near && near.length === 2 && near.every(Number.isFinite)
        ? { lng: near[0], lat: near[1], label: p.get('place') ?? '' }
        : null,
    filters: {
      when: (['now', 'at'] as const).find((w) => w === p.get('when')) ?? 'any',
      at: /^\d\d:\d\d$/.test(p.get('at') ?? '') ? p.get('at')! : DEFAULT_FILTERS.at,
      types: (p.get('type')?.split(',') ?? []).filter((t): t is CenterType =>
        CENTER_TYPES.includes(t as CenterType),
      ),
      pets: p.get('pets') === '1',
      wheelchair: p.get('wheelchair') === '1',
    },
  };
}

export function buildUrl({ lang, filters: f, origin, selectedId }: UrlState) {
  const p = new URLSearchParams();
  if (selectedId) p.set('center', selectedId);
  if (lang !== 'en') p.set('lang', lang);
  if (f.when !== 'any') p.set('when', f.when);
  if (f.when === 'at') p.set('at', f.at);
  if (f.types.length) p.set('type', f.types.join(','));
  if (f.pets) p.set('pets', '1');
  if (f.wheelchair) p.set('wheelchair', '1');
  if (origin) {
    p.set('near', `${origin.lng.toFixed(5)},${origin.lat.toFixed(5)}`);
    if (origin.label) p.set('place', origin.label);
  }
  const qs = p.toString();
  return location.pathname + (qs ? '?' + qs : '');
}

/** Link to a single center, without the viewer's own filters or location. */
export const centerLink = (id: string) => `${location.origin}${location.pathname}?center=${encodeURIComponent(id)}`;
