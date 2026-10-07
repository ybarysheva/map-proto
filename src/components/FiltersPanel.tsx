import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { CENTER_TYPES, formatTime, type CenterType } from '../lib';
import { markerSvg } from '../icons';
import type { Lang, T } from '../i18n';
import { activeFilterCount, DEFAULT_FILTERS, type Filters, type When } from '../state';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  resultCount: number;
  compact: boolean; // desktop: one tight row of pills; mobile: full-screen sheet
  open: boolean; // mobile sheet
  onClose: () => void;
  search?: ReactNode; // address search sits first in the bar on desktop
  lang: Lang;
  t: T;
}

export default function FiltersPanel({ filters: f, onChange, resultCount, compact, open, onClose, search, lang, t }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...f, ...patch });
  const count = activeFilterCount(f);
  const clear = () => onChange({ ...DEFAULT_FILTERS, at: f.at });

  const whenControl = <WhenControl f={f} set={set} t={t} />;
  const typeControl = <TypeControl f={f} set={set} t={t} />;

  /* ---------- Desktop: compact pill row ---------- */
  if (compact) {
    const whenLabel =
      f.when === 'any'
        ? t('anyTime')
        : f.when === 'now'
          ? t('openNow')
          : `${t('openAt')} ${formatTime(Number(f.at.slice(0, 2)) * 60 + Number(f.at.slice(3)), lang)}`;
    const typeLabel =
      f.types.length === 0 ? t('type') : f.types.length === 1 ? t(f.types[0]) : `${t('type')} · ${f.types.length}`;

    return (
      <section className="filters compact" aria-label={t('filters')}>
        {search}
        <Dropdown label={whenLabel} active={f.when !== 'any'} t={t}>
          {whenControl}
        </Dropdown>
        <Dropdown label={typeLabel} active={f.types.length > 0} t={t}>
          {typeControl}
        </Dropdown>
        <button type="button" className="pill" aria-pressed={f.wheelchair} onClick={() => set({ wheelchair: !f.wheelchair })}>
          {t('wheelchair')}
        </button>
        <button type="button" className="pill" aria-pressed={f.pets} onClick={() => set({ pets: !f.pets })}>
          {t('pets')}
        </button>
        {count > 0 && (
          <button type="button" className="link-btn clear" onClick={clear}>
            {t('clearFilters')}
          </button>
        )}
      </section>
    );
  }

  /* ---------- Mobile: full-screen sheet ---------- */
  return (
    <section className={`filters sheet ${open ? 'is-open' : ''}`} aria-labelledby="filters-heading">
      <div className="filters-sheet-head">
        <h2 id="filters-heading">{t('filters')}</h2>
        <button type="button" className="icon-btn" aria-label={t('close')} onClick={onClose}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div className="filters-body">
        <fieldset className="filter">
          <legend>{t('when')}</legend>
          {whenControl}
        </fieldset>
        <fieldset className="filter">
          <legend>{t('type')}</legend>
          {typeControl}
        </fieldset>
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
        <button type="button" className="link-btn clear" disabled={!count} onClick={clear}>
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

/* ---------- Shared controls ---------- */

type SetFn = (patch: Partial<Filters>) => void;

function WhenControl({ f, set, t }: { f: Filters; set: SetFn; t: T }) {
  const options: [When, string][] = [
    ['any', t('anyTime')],
    ['now', t('openNow')],
    ['at', t('openAt')],
  ];
  return (
    <div className="when-row" role="radiogroup" aria-label={t('when')}>
      <div className="segmented">
        {options.map(([value, label]) => (
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
  );
}

function TypeControl({ f, set, t }: { f: Filters; set: SetFn; t: T }) {
  const toggle = (type: CenterType) =>
    set({ types: f.types.includes(type) ? f.types.filter((x) => x !== type) : [...f.types, type] });
  return (
    <div className="type-options">
      {CENTER_TYPES.map((type) => (
        <label key={type} className="check">
          <input type="checkbox" checked={f.types.includes(type)} onChange={() => toggle(type)} />
          <span className="chip-marker" dangerouslySetInnerHTML={{ __html: markerSvg(type) }} />
          {t(type)}
        </label>
      ))}
    </div>
  );
}

/** Pill button that opens a small panel below it. Closes on outside click or Escape. */
function Dropdown({ label, active, t, children }: { label: string; active: boolean; t: T; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div
      className="dropdown"
      ref={ref}
      onBlur={(e) => !ref.current?.contains(e.relatedTarget as Node) && setOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        className={`pill ${active ? 'is-active' : ''}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        <svg className="pill-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={panelId} className="dropdown-panel" hidden={!open} tabIndex={-1}>
        {children}
        <button type="button" className="link-btn done" onClick={() => { setOpen(false); buttonRef.current?.focus(); }}>
          {t('done')}
        </button>
      </div>
    </div>
  );
}
