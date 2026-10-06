import { useEffect, useId, useRef, useState } from 'react';
import type { T } from '../i18n';
import type { Origin } from '../state';

interface Suggestion {
  label: string;
  lng: number;
  lat: number;
}

const cleanLabel = (label: string) => label.replace(/, (NY|New York), USA$/, '');

/** Address search using NYC GeoSearch (free, NYC-only geocoder). ARIA combobox pattern. */
export default function SearchBox({ origin, onOrigin, t }: { origin: Origin | null; onOrigin: (o: Origin | null) => void; t: T }) {
  const [text, setText] = useState(origin?.label ?? '');
  const [results, setResults] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [message, setMessage] = useState('');
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const skipFetch = useRef(true);

  useEffect(() => {
    skipFetch.current = true;
    setText(origin?.label ?? '');
  }, [origin]);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    if (text.trim().length < 3) {
      setResults([]);
      setOpen(false);
      return;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = `https://geosearch.planninglabs.nyc/v2/autocomplete?text=${encodeURIComponent(text)}`;
        const data = await fetch(url, { signal: ctrl.signal }).then((r) => r.json());
        const list: Suggestion[] = data.features.slice(0, 6).map((f: any) => ({
          label: cleanLabel(f.properties.label),
          lng: f.geometry.coordinates[0],
          lat: f.geometry.coordinates[1],
        }));
        setResults(list);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline */
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [text]);

  const choose = (s: Suggestion) => {
    setOpen(false);
    setMessage('');
    onOrigin({ lng: s.lng, lat: s.lat, label: s.label });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' && results.length) {
      e.preventDefault();
      setOpen(true);
      setActive((a) => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp' && results.length) {
      e.preventDefault();
      setActive((a) => (a <= 0 ? results.length - 1 : a - 1));
    } else if (e.key === 'Enter') {
      const pick = results[active] ?? results[0];
      if (open && pick) {
        e.preventDefault();
        choose(pick);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const locate = () => {
    if (!navigator.geolocation) return setMessage(t('locationError'));
    setMessage(t('locating'));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMessage('');
        onOrigin({ lng: pos.coords.longitude, lat: pos.coords.latitude, label: t('youAreHere') });
      },
      () => setMessage(t('locationError')),
      { timeout: 10000 },
    );
  };

  return (
    <div className="search">
      <label htmlFor={listId + 'input'} className="search-label">
        {t('searchLabel')}
      </label>
      <div className="search-field">
        <svg className="search-icon" viewBox="0 0 20 20" aria-hidden="true">
          <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M13 13l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          ref={inputRef}
          id={listId + 'input'}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          placeholder={t('searchPlaceholder')}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => results.length && text !== origin?.label && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {(text || origin) && (
          <button
            type="button"
            className="icon-btn"
            aria-label={t('clearSearch')}
            title={t('clearSearch')}
            onClick={() => {
              setText('');
              setResults([]);
              onOrigin(null);
              inputRef.current?.focus();
            }}
          >
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <button type="button" className="icon-btn locate" aria-label={t('useLocation')} title={t('useLocation')} onClick={locate}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="6.5" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </g>
          </svg>
        </button>
      </div>
      <ul id={listId} role="listbox" className="suggestions" hidden={!open}>
        {results.length === 0 && open ? (
          <li className="suggestion empty">{t('noAddress')}</li>
        ) : (
          results.map((s, i) => (
            <li
              key={s.label + i}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className="suggestion"
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
            >
              {s.label}
            </li>
          ))
        )}
      </ul>
      <p className="search-msg" role="status">
        {message}
      </p>
    </div>
  );
}
