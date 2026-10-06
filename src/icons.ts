import type { CenterType } from './lib';

// Each location type gets its own pin shape AND glyph, so color is never the only signal.
export const TYPE_COLOR: Record<CenterType, string> = {
  hospital: '#1d3c8f',
  dropin: '#0d6a52',
  bus: '#a7400a',
};

// 24×24 white-stroke glyphs
const GLYPH: Record<CenterType, string> = {
  hospital: '<path d="M7 5v14M17 5v14M7 12h10"/>',
  dropin: '<path d="M4 11.5 12 4.5l8 7"/><path d="M6.5 10v9.5h11V10"/><path d="M10.5 19.5v-5h3v5"/>',
  bus: '<rect x="5" y="4" width="14" height="13" rx="2.5"/><path d="M5 11h14"/><path d="M8 17v2.5M16 17v2.5"/><circle cx="8.5" cy="14" r=".6"/><circle cx="15.5" cy="14" r=".6"/>',
};

// Pin outlines in a 40×50 box, tip at (20, 50)
const SHAPE: Record<CenterType, string> = {
  // rounded square
  hospital:
    'M9 3h22a6 6 0 0 1 6 6v22a6 6 0 0 1-6 6h-5l-6 13-6-13H9a6 6 0 0 1-6-6V9a6 6 0 0 1 6-6z',
  // classic teardrop
  dropin: 'M20 50S3 31.5 3 20a17 17 0 1 1 34 0c0 11.5-17 30-17 30z',
  // diamond
  bus: 'M20 1.5 38.5 20 20 50 1.5 20z',
};

const GLYPH_TRANSFORM: Record<CenterType, string> = {
  hospital: 'translate(10 10) scale(.84)',
  dropin: 'translate(10.5 10.5) scale(.8)',
  bus: 'translate(12.2 12.2) scale(.65)',
};

function glyph(type: CenterType) {
  return `<g transform="${GLYPH_TRANSFORM[type]}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${GLYPH[type]}</g>`;
}

/** Full pin used on the map. viewBox 48×54, tip at bottom-center. */
export function pinSvg(type: CenterType, count = 1) {
  const badge =
    count > 1
      ? `<circle cx="40" cy="9" r="8.5" fill="#111" stroke="#fff" stroke-width="2"/>
         <text x="40" y="13" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="11.5" font-weight="700" fill="#fff">${count}</text>`
      : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="108" viewBox="0 0 48 54">
    <g transform="translate(4 4)">
      <path d="${SHAPE[type]}" fill="${TYPE_COLOR[type]}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>
      ${glyph(type)}
    </g>
    ${badge}
  </svg>`;
}

/** Small inline marker for the list, card and legend. */
export function markerSvg(type: CenterType) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" aria-hidden="true" focusable="false">
    <g transform="translate(0 1)">
      <path d="${SHAPE[type]}" fill="${TYPE_COLOR[type]}" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      ${glyph(type)}
    </g>
  </svg>`;
}

export function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(96, 108);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}
