import { CENTER_TYPES } from '../lib';
import { markerSvg } from '../icons';
import type { T } from '../i18n';

export default function Legend({ t, defaultOpen }: { t: T; defaultOpen: boolean }) {
  return (
    <details className="legend" open={defaultOpen}>
      <summary>{t('legend')}</summary>
      <ul>
        {CENTER_TYPES.map((type) => (
          <li key={type}>
            <span className="legend-marker" dangerouslySetInnerHTML={{ __html: markerSvg(type) }} />
            {t(type)}
          </li>
        ))}
      </ul>
    </details>
  );
}
