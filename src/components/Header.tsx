import { LANGUAGES, type Lang, type T } from '../i18n';
import type { Origin } from '../state';
import SearchBox from './SearchBox';

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  origin: Origin | null;
  onOrigin: (o: Origin | null) => void;
  t: T;
}

export default function Header({ lang, onLang, origin, onOrigin, t }: Props) {
  return (
    <header className="header">
      <div className="brand">
        <span className="nyc" aria-hidden="true">
          NYC
        </span>
        <div>
          <h1>{t('title')}</h1>
          <p className="tagline">{t('tagline')}</p>
        </div>
      </div>
      <SearchBox origin={origin} onOrigin={onOrigin} t={t} />
      <div className="lang">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <g fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="12" cy="12" r="9" />
            <path d="M3 12h18M12 3c2.8 3 2.8 15 0 18M12 3c-2.8 3-2.8 15 0 18" />
          </g>
        </svg>
        <label className="sr-only" htmlFor="lang-select">
          {t('language')}
        </label>
        <select id="lang-select" value={lang} onChange={(e) => onLang(e.target.value as Lang)}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>
    </header>
  );
}
