import { useEffect, useRef, useState } from 'react';
import {
  daysSince,
  directionsUrl,
  distanceMiles,
  formatDate,
  formatTime,
  is24h,
  STALE_DAYS,
  telHref,
  type Center,
} from '../lib';
import { markerSvg, TYPE_COLOR } from '../icons';
import type { Lang, T } from '../i18n';
import { centerLink, type Origin, type When } from '../state';
import Status from './Status';
import { LinkIcon } from './ResultsList';

interface Props {
  stack: Center[]; // every center at this location (usually 1)
  selectedId: string;
  origin: Origin | null;
  minute: number;
  when: When;
  lang: Lang;
  t: T;
  onSelect: (id: string) => void;
  onClose: () => void;
  onAnnounce: (msg: string) => void;
}

/** Info card: modal on desktop, full-screen on mobile. Native <dialog> gives focus trapping + Esc. */
export default function CenterCard({ stack, selectedId, origin, minute, when, lang, t, onSelect, onClose, onAnnounce }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [copied, setCopied] = useState(false);
  const index = Math.max(0, stack.findIndex((c) => c.id === selectedId));
  const c = stack[index];

  useEffect(() => {
    const dialog = ref.current!;
    if (!dialog.open) dialog.showModal();
    return () => dialog.close();
  }, []);

  useEffect(() => {
    setCopied(false);
    headingRef.current?.focus();
  }, [c.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(centerLink(c.id));
    } catch {
      /* clipboard blocked; still show the link state */
    }
    setCopied(true);
    onAnnounce(t('linkCopied'));
  };

  const stale = daysSince(c.updated) > STALE_DAYS;
  const miles = origin ? distanceMiles(origin, c) : null;
  const hours = is24h(c)
    ? t('open24')
    : t('hoursRange', { a: formatTime(c.opens, lang), b: formatTime(c.closes % 1440, lang) });

  return (
    <dialog
      ref={ref}
      className="card-dialog"
      aria-labelledby="card-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === ref.current && onClose()}
    >
      {stack.length > 1 && (
        <nav className="stack-pill" aria-label={t('multiple')}>
          <button type="button" aria-label={t('prev')} onClick={() => onSelect(stack[(index - 1 + stack.length) % stack.length].id)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span aria-live="polite">{t('stackOf', { i: index + 1, n: stack.length })}</span>
          <button type="button" aria-label={t('next')} onClick={() => onSelect(stack[(index + 1) % stack.length].id)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </nav>
      )}
      <div className="card">
        <div className="photo" role="img" aria-label={t('photoAlt', { name: c.name })} style={{ ['--tone' as string]: TYPE_COLOR[c.type] }}>
          <span className="photo-marker" dangerouslySetInnerHTML={{ __html: markerSvg(c.type) }} />
          <span className="photo-tag" aria-hidden="true">
            {t('sample')}
          </span>
        </div>
        <button type="button" className="close-btn" aria-label={t('close')} onClick={onClose}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </button>

        <div className="card-body">
          <p className="type-label with-marker">
            <span className="mini-marker" dangerouslySetInnerHTML={{ __html: markerSvg(c.type) }} />
            {t(c.type)}
          </p>
          <h2 id="card-title" ref={headingRef} tabIndex={-1}>
            {c.name}
          </h2>
          <Status c={c} minute={minute} when={when} lang={lang} t={t} />
          <p className="address">
            {c.address}, {c.borough}, NY
          </p>
          {miles !== null && <p className="distance">{t('miAway', { d: miles.toFixed(1) })}</p>}

          <div className="actions">
            <a className="btn primary" href={telHref(c.phone)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6 6l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
              </svg>
              {t('call')}
              <span className="btn-sub">{c.phone}</span>
            </a>
            <a className="btn" href={directionsUrl(c)} target="_blank" rel="noreferrer">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <g fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" strokeLinecap="round">
                  <path d="M12 2.5 21.5 12 12 21.5 2.5 12z" />
                  <path d="M9 14v-2.5a1.5 1.5 0 0 1 1.5-1.5H15M13 8l2 2-2 2" />
                </g>
              </svg>
              {t('directions')}
            </a>
          </div>

          <dl className="details">
            <div>
              <dt>{t('hours')}</dt>
              <dd>
                {hours}
                {!is24h(c) && <span className="muted"> · {t('everyDay')}</span>}
              </dd>
            </div>
            <div>
              <dt>{t('howToGetIn')}</dt>
              <dd>{c.instructions}</dd>
            </div>
            <div>
              <dt>{t('access')}</dt>
              <dd>
                <ul className="access">
                  <li className={c.wheelchair ? 'yes' : 'no'}>
                    <span aria-hidden="true">{c.wheelchair ? '✓' : '✕'}</span> {c.wheelchair ? t('wcYes') : t('wcNo')}
                  </li>
                  <li className={c.pets ? 'yes' : 'no'}>
                    <span aria-hidden="true">{c.pets ? '✓' : '✕'}</span> {c.pets ? t('petsYes') : t('petsNo')}
                  </li>
                </ul>
              </dd>
            </div>
          </dl>

          <div className="card-foot">
            <p className={stale ? 'freshness stale' : 'freshness'}>
              {stale && (
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 1.5 15 14H1z" fill="currentColor" />
                  <path d="M8 6v3.5M8 11.5v.5" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              )}
              <span>
                {t('updated', { date: formatDate(c.updated, lang) })}
                {stale && <> — {t('stale')}</>}
              </span>
            </p>
            <button type="button" className="link-with-icon" onClick={copy}>
              <LinkIcon />
              {copied ? t('linkCopied') : t('copyLink')}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}
