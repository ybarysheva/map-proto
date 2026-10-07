import { useState } from 'react';
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
  onCopyLink: () => void;
}

export default function ResultsList({ results, total, origin, minute, when, lang, t, onSelect, onHighlight, onCopyLink }: Props) {
  const [copied, setCopied] = useState(false);

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
        <div className="results-head-row">
          <h2 id="results-count" aria-live="polite">
            {t('showing', { n: results.length, total })}
          </h2>
          <button
            type="button"
            className="link-with-icon"
            aria-label={t('copyResultsLink')}
            onClick={() => {
              onCopyLink();
              setCopied(true);
              setTimeout(() => setCopied(false), 2500);
            }}
          >
            <LinkIcon />
            {copied ? t('linkCopied') : t('copyLink')}
          </button>
        </div>
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

export function LinkIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1" />
        <path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
      </g>
    </svg>
  );
}
