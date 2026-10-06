import { formatTime, is24h, isOpenAt, type Center } from '../lib';
import type { Lang, T } from '../i18n';
import type { When } from '../state';

export function statusFor(c: Center, minute: number, when: When, lang: Lang, t: T) {
  const open = isOpenAt(c, minute);
  const time = formatTime(minute, lang);
  const fmt = (m: number) => formatTime(m % 1440, lang);
  let text: string;
  if (is24h(c)) text = t('open24');
  else if (open) text = when === 'at' ? t('openAtUntil', { time, t: fmt(c.closes) }) : t('openUntil', { t: fmt(c.closes) });
  else text = when === 'at' ? t('closedAtOpensAt', { time, t: fmt(c.opens) }) : t('closedOpensAt', { t: fmt(c.opens) });
  return { open, text };
}

/** Open/closed line. Uses an icon + wording, not just color. */
export default function Status({ c, minute, when, lang, t }: { c: Center; minute: number; when: When; lang: Lang; t: T }) {
  const { open, text } = statusFor(c, minute, when, lang, t);
  return (
    <p className={`status ${open ? 'is-open' : 'is-closed'}`}>
      <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        {open ? (
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 4.5V8l2.5 1.5" />
          </g>
        )}
      </svg>
      {text}
    </p>
  );
}
