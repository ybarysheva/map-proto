import Papa from 'papaparse';

export type CenterType = 'hospital' | 'dropin' | 'bus';
export const CENTER_TYPES: CenterType[] = ['hospital', 'dropin', 'bus'];

export interface Center {
  id: string;
  name: string;
  type: CenterType;
  borough: string;
  address: string;
  crossStreet: string;
  lat: number;
  lng: number;
  opens: number; // minutes after midnight
  closes: number; // minutes after midnight; 1440 = midnight next day
  phone: string;
  pets: boolean;
  wheelchair: boolean;
  instructions: string;
  updated: string; // YYYY-MM-DD
}

export interface LngLat {
  lng: number;
  lat: number;
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export async function loadCenters(): Promise<Center[]> {
  const text = await fetch('/centers.csv').then((r) => r.text());
  const { data } = Papa.parse<Record<string, string>>(text.trim(), { header: true });
  return data.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type as CenterType,
    borough: r.borough,
    address: r.address,
    crossStreet: r.cross_street,
    lat: Number(r.lat),
    lng: Number(r.lng),
    opens: toMinutes(r.opens),
    closes: toMinutes(r.closes),
    phone: r.phone,
    pets: r.pets === 'yes',
    wheelchair: r.wheelchair === 'yes',
    instructions: r.instructions,
    updated: r.updated,
  }));
}

/* ---------- Hours ---------- */

export const is24h = (c: Center) => c.opens === 0 && c.closes === 1440;

export function isOpenAt(c: Center, minute: number) {
  if (is24h(c)) return true;
  if (c.opens < c.closes) return minute >= c.opens && minute < c.closes;
  // Overnight hours, e.g. 10 PM – 5 AM
  return minute >= c.opens || minute < c.closes;
}

export const nowMinutes = () => {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
};

export function formatTime(minute: number, lang: string) {
  const d = new Date(2026, 0, 1, Math.floor(minute / 60) % 24, minute % 60);
  return new Intl.DateTimeFormat(lang, {
    hour: 'numeric',
    minute: minute % 60 ? '2-digit' : undefined,
  }).format(d);
}

export const minutesToHHMM = (m: number) =>
  `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

/* ---------- Distance ---------- */

export function distanceMiles(a: LngLat, b: LngLat) {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/* ---------- Stacked pins ---------- */

const STACK_METERS = 40;

/** Groups centers that sit within 40 m of each other into one pin. */
export function buildStacks(centers: Center[]): Center[][] {
  const stacks: Center[][] = [];
  for (const c of centers) {
    const stack = stacks.find((s) => distanceMiles(s[0], c) * 1609.34 <= STACK_METERS);
    if (stack) stack.push(c);
    else stacks.push([c]);
  }
  return stacks;
}

/* ---------- Freshness ---------- */

export const STALE_DAYS = 30;

export function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date + 'T12:00:00').getTime()) / 86_400_000);
}

export function formatDate(date: string, lang: string) {
  return new Intl.DateTimeFormat(lang, { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date + 'T12:00:00'),
  );
}

/* ---------- Links ---------- */

export const directionsUrl = (c: Center) =>
  `https://www.google.com/maps/dir/?api=1&destination=${c.lat},${c.lng}`;

export const telHref = (phone: string) => `tel:+1${phone.replace(/\D/g, '')}`;

export const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;
