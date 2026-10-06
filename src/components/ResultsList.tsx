import type { Center } from '../lib';
import { markerSvg } from '../icons';
import type { Lang, T } from '../i18n';
import type { Origin, When } from '../state';
import Status from './Status';

interface Props {
  results: { c: Center; miles: number | null }[];
  total: number;
  origin: Origin | null;
  minute: number;
  when: When;
  lang: Lang;
  t: T;
  onSelect: (id: string) => void;
  onHighlight: (id: string | null) => void;
}

export default function ResultsList({ results, total, origin, minute, when, lang, t, onSelect, onHighlight }: Props) {
  return (
    <section className="results" id="results" aria-labelledby="results-count" tabIndex={-1}>
      <div className="notice" role="note">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2v20M3.3 7l17.4 10M20.7 7 3.3 17" />
            <path d="M9.5 3.5 12 6l2.5-2.5M9.5 20.5 12 18l2.5 2.5" />
          </g>
        </svg>
        <p>
          {t('codeBlue')} <strong>{t('emergency')}</strong>
        </p>
      </div>

      <div className="results-head">
        <h2 id="results-count" aria-live="polite">
          {t('showing', { n: results.length, total })}
        </h2>
        {origin && <p className="sorted">{t('sortedBy', { place: origin.label })}</p>}
      </div>

      {results.length === 0 ? (
        <p className="empty">{t('noResults')}</p>
      ) : (
        <ol className="result-list">
          {results.map(({ c, miles }) => {
            return (
              <li
                key={c.id}
                className="result"
                onMouseEnter={() => onHighlight(c.id)}
                onMouseLeave={() => onHighlight(null)}
                onFocus={() => onHighlight(c.id)}
                onBlur={() => onHighlight(null)}
              >
                <span className="result-marker" dangerouslySetInnerHTML={{ __html: markerSvg(c.type) }} />
                <div className="result-body">
                  <h3>
                    {/* Whole card is clickable via a stretched pseudo-element on this button */}
                    <button type="button" className="result-link" onClick={() => onSelect(c.id)}>
                      {c.name}
                    </button>
                  </h3>
                  <p className="type-label">{t(c.type)}</p>
                  <Status c={c} minute={minute} when={when} lang={lang} t={t} />
                  <p className="address">
                    {c.address}, {c.borough}
                    {c.crossStreet && <span className="cross"> · {c.crossStreet}</span>}
                  </p>
                  {miles !== null && <p className="distance">{t('miAway', { d: miles.toFixed(1) })}</p>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
      <p className="sample-note">{t('sample')}</p>
    </section>
  );
}
