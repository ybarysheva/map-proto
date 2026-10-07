import { LANGUAGES, type Lang, type T } from '../i18n';

interface Props {
  lang: Lang;
  onLang: (l: Lang) => void;
  t: T;
}

export default function Header({ lang, onLang, t }: Props) {
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
      {/* Globe icon + current language name; the native select opens the menu */}
      <div className="lang">
        <svg className="lang-globe" viewBox="0 0 24 24" aria-hidden="true">
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
        <svg className="lang-chevron" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </header>
  );
}
