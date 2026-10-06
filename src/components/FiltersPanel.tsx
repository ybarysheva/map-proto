import { BOROUGHS, CENTER_TYPES, type CenterType } from '../lib';
import { markerSvg } from '../icons';
import type { T } from '../i18n';
import { activeFilterCount, DEFAULT_FILTERS, type Filters, type When } from '../state';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  resultCount: number;
  open: boolean; // mobile sheet
  onClose: () => void;
  t: T;
}

/** Inline filter bar on desktop; full-screen sheet on mobile (same markup). */
export default function FiltersPanel({ filters: f, onChange, resultCount, open, onClose, t }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const toggleType = (type: CenterType) =>
    set({ types: f.types.includes(type) ? f.types.filter((x) => x !== type) : [...f.types, type] });
  const count = activeFilterCount(f);
  const whenOptions: [When, string][] = [
    ['any', t('anyTime')],
    ['now', t('openNow')],
    ['at', t('openAt')],
  ];

  return (
    <section className={`filters ${open ? 'is-open' : ''}`} aria-labelledby="filters-heading">
      <div className="filters-sheet-head">
        <h2 id="filters-heading">{t('filters')}</h2>
        <button type="button" className="icon-btn" aria-label={t('close')} onClick={onClose}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="filters-body">
        <fieldset className="filter when">
          <legend>{t('when')}</legend>
          <div className="when-row">
            <div className="segmented">
              {whenOptions.map(([value, label]) => (
                <label key={value} className={f.when === value ? 'is-on' : ''}>
                  <input type="radio" name="when" value={value} checked={f.when === value} onChange={() => set({ when: value })} />
                  {label}
                </label>
              ))}
            </div>
            {f.when === 'at' && (
              <input
                type="time"
                className="time-input"
                aria-label={t('time')}
                value={f.at}
                step={900}
                onChange={(e) => e.target.value && set({ at: e.target.value })}
              />
            )}
          </div>
        </fieldset>

        <fieldset className="filter">
          <legend>{t('type')}</legend>
          <div className="chips">
            {CENTER_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                className="chip"
                aria-pressed={f.types.includes(type)}
                onClick={() => toggleType(type)}
              >
                <span className="chip-marker" dangerouslySetInnerHTML={{ __html: markerSvg(type) }} />
                {t(type)}
                <svg className="chip-check" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                </svg>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="filter">
          <label htmlFor="borough" className="legend-like">
            {t('borough')}
          </label>
          <select id="borough" value={f.borough} onChange={(e) => set({ borough: e.target.value })}>
            <option value="">{t('allBoroughs')}</option>
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>

        <fieldset className="filter">
          <legend>{t('features')}</legend>
          <div className="checks">
            <label className="check">
              <input type="checkbox" checked={f.wheelchair} onChange={(e) => set({ wheelchair: e.target.checked })} />
              {t('wheelchair')}
            </label>
            <label className="check">
              <input type="checkbox" checked={f.pets} onChange={(e) => set({ pets: e.target.checked })} />
              {t('pets')}
            </label>
          </div>
        </fieldset>

        <button type="button" className="link-btn clear" disabled={!count} onClick={() => onChange({ ...DEFAULT_FILTERS, at: f.at })}>
          {t('clearFilters')}
          {count ? ` (${count})` : ''}
        </button>
      </div>

      <div className="filters-sheet-foot">
        <button type="button" className="btn primary block" onClick={onClose}>
          {t('showResults', { n: resultCount })}
        </button>
      </div>
    </section>
  );
}
