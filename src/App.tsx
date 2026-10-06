import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildStacks, distanceMiles, isOpenAt, loadCenters, nowMinutes, type Center } from './lib';
import { LANGUAGES, translate, type Lang, type StringKey } from './i18n';
import { activeFilterCount, buildUrl, readUrl, type Filters, type Origin } from './state';
import MapView from './MapView';
import Header from './components/Header';
import FiltersPanel from './components/FiltersPanel';
import ResultsList from './components/ResultsList';
import CenterCard from './components/CenterCard';
import Legend from './components/Legend';

const initial = readUrl();

function useIsMobile() {
  const query = '(max-width: 767px)';
  const [mobile, setMobile] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const fn = () => setMobile(mq.matches);
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);
  return mobile;
}

export default function App() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [lang, setLang] = useState<Lang>(initial.lang);
  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [origin, setOrigin] = useState<Origin | null>(initial.origin);
  const [selectedId, setSelectedId] = useState<string | null>(initial.selectedId);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [now, setNow] = useState(nowMinutes);
  const [view, setView] = useState<'list' | 'map'>('list'); // mobile only
  const [filtersOpen, setFiltersOpen] = useState(false); // mobile only
  const [announcement, setAnnouncement] = useState('');
  const returnFocus = useRef<HTMLElement | null>(null);
  const isMobile = useIsMobile();

  const t = useCallback((key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);

  useEffect(() => {
    loadCenters().then(setCenters);
    const timer = setInterval(() => setNow(nowMinutes()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Language: page lang + direction (Arabic is right-to-left)
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = LANGUAGES.find((l) => l.code === lang)!.dir;
    document.title = t('title');
  }, [lang, t]);

  // Keep the URL in sync so any view can be shared
  useEffect(() => {
    history.replaceState(null, '', buildUrl({ lang, filters, origin, selectedId }));
  }, [lang, filters, origin, selectedId]);

  /* ---------- Derived data ---------- */
  const minute = filters.when === 'at' ? Number(filters.at.slice(0, 2)) * 60 + Number(filters.at.slice(3)) : now;

  const results = useMemo(() => {
    const list = centers
      .filter((c) => {
        if (filters.types.length && !filters.types.includes(c.type)) return false;
        if (filters.borough && c.borough !== filters.borough) return false;
        if (filters.pets && !c.pets) return false;
        if (filters.wheelchair && !c.wheelchair) return false;
        if (filters.when !== 'any' && !isOpenAt(c, minute)) return false;
        return true;
      })
      .map((c) => ({ c, miles: origin ? distanceMiles(origin, c) : null }));
    if (origin) list.sort((a, b) => a.miles! - b.miles!);
    else list.sort((a, b) => a.c.borough.localeCompare(b.c.borough) || a.c.name.localeCompare(b.c.name));
    return list;
  }, [centers, filters, minute, origin]);

  const visible = useMemo(() => results.map((r) => r.c), [results]);
  const stacks = useMemo(() => buildStacks(visible), [visible]);

  // The card's "1 of N" uses the visible stack; falls back to all centers (e.g. a deep link to a filtered-out center)
  const selectedStack = useMemo(() => {
    if (!selectedId) return null;
    return (
      stacks.find((s) => s.some((c) => c.id === selectedId)) ??
      buildStacks(centers).find((s) => s.some((c) => c.id === selectedId)) ??
      null
    );
  }, [selectedId, stacks, centers]);

  /* ---------- Actions ---------- */
  const select = (id: string) => {
    if (!selectedId) returnFocus.current = document.activeElement as HTMLElement;
    setSelectedId(id);
  };
  const closeCard = () => {
    setSelectedId(null);
    requestAnimationFrame(() => returnFocus.current?.focus());
  };
  const announce = (msg: string) => {
    setAnnouncement('');
    setTimeout(() => setAnnouncement(msg), 50);
  };

  const filterCount = activeFilterCount(filters);

  return (
    <div className={`app view-${view}`}>
      <a className="skip-link" href="#results">
        {t('skipToList')}
      </a>
      <a
        className="skip-link"
        href="#map"
        onClick={(e) => {
          e.preventDefault();
          setView('map');
          requestAnimationFrame(() => document.querySelector<HTMLElement>('.maplibregl-canvas')?.focus());
        }}
      >
        {t('skipToMap')}
      </a>

      <Header lang={lang} onLang={setLang} origin={origin} onOrigin={setOrigin} t={t} />

      {/* Mobile-only toolbar */}
      <div className="toolbar">
        <button type="button" className="btn pill" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h10M18 7h2M4 17h4M12 17h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="16" cy="7" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="10" cy="17" r="2.2" fill="none" stroke="currentColor" strokeWidth="2" />
          </svg>
          {t('filters')}
          {filterCount > 0 && <span className="count-badge">{filterCount}</span>}
        </button>
        <div className="view-toggle" role="group">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            {t('list')}
          </button>
          <button type="button" aria-pressed={view === 'map'} onClick={() => setView('map')}>
            {t('map')}
          </button>
        </div>
      </div>

      <FiltersPanel
        filters={filters}
        onChange={setFilters}
        resultCount={results.length}
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        t={t}
      />

      <main className="main">
        {/* List comes first in reading order; CSS places it on the right on desktop */}
        <ResultsList
          results={results}
          total={centers.length}
          origin={origin}
          minute={minute}
          when={filters.when}
          lang={lang}
          t={t}
          onSelect={select}
          onHighlight={setHighlightId}
        />
        <div className="map-area" id="map">
          <MapView
            stacks={stacks}
            selectedId={selectedId}
            highlightId={highlightId}
            origin={origin}
            nearest={visible}
            lang={lang}
            t={t}
            onSelect={select}
          />
          <Legend t={t} defaultOpen={!isMobile} />
        </div>
      </main>

      {selectedStack && selectedId && (
        <CenterCard
          stack={selectedStack}
          selectedId={selectedId}
          origin={origin}
          minute={minute}
          when={filters.when}
          lang={lang}
          t={t}
          onSelect={setSelectedId}
          onClose={closeCard}
          onAnnounce={announce}
        />
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}
