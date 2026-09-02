/**
 * The site's icon set, lifted from the original markup so the CSS that targets
 * `svg` inside buttons and cards keeps working unchanged.
 */
const PATHS = {
  mail: ['M3 7.5A2.5 2.5 0 0 1 5.5 5h13A2.5 2.5 0 0 1 21 7.5v9A2.5 2.5 0 0 1 18.5 19h-13A2.5 2.5 0 0 1 3 16.5v-9Z', 'm3.5 7 8.5 6 8.5-6'],
  caret: ['M6 9l6 6 6-6'],
  menu: ['M4 7h16M4 12h16M4 17h16'],
  close: ['M6 6l12 12M18 6 6 18'],
  arrowRight: ['M5 12h14M13 6l6 6-6 6'],
  arrowLeft: ['M19 12H5M11 18l-6-6 6-6'],
  external: ['M14 4h6v6', 'M20 4 11 13', 'M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10'],
  file: ['M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z', 'M14 3v5h5'],
  pin: ['M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z'],
  mic: ['M9 3h6v10a3 3 0 0 1-6 0Z', 'M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21'],
  search: ['m16 16 4.5 4.5'],
  phone: ['M4 5.5A1.5 1.5 0 0 1 5.5 4h2A1.5 1.5 0 0 1 9 5.5v2A1.5 1.5 0 0 1 7.5 9H7a11 11 0 0 0 8 8v-.5A1.5 1.5 0 0 1 16.5 15h2A1.5 1.5 0 0 1 20 16.5v2A1.5 1.5 0 0 1 18.5 20 15 15 0 0 1 4 5.5Z'],
  linkedin: ['M6 9v10M6 5.5v.01M11 19v-5a3 3 0 0 1 6 0v5'],
  globe: ['M3.5 12h17M12 3.5c2.4 2.3 3.6 5.3 3.6 8.5S14.4 18.2 12 20.5c-2.4-2.3-3.6-5.3-3.6-8.5S9.6 5.8 12 3.5Z'],
};

const CIRCLES = {
  pin: [{ cx: 12, cy: 10, r: 2.6 }],
  search: [{ cx: 11, cy: 11, r: 6.5 }],
  globe: [{ cx: 12, cy: 12, r: 8.5 }],
};

export default function Icon({ name, className }) {
  const paths = PATHS[name];
  if (!paths) return null;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
         strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {(CIRCLES[name] || []).map((c, i) => <circle key={`c${i}`} {...c} />)}
      {paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}

/** Solid play triangle — the only icon that fills rather than strokes. */
export function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4.5v15l13-7.5-13-7.5Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
