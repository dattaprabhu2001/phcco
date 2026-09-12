/**
 * Line icons for the CMS chrome, on a 24px grid at 1.7 stroke.
 *
 * Deliberately separate from the public site's icon set: these are UI
 * affordances that should stay consistent with each other, not design assets
 * lifted from the marketing pages.
 */
const ICONS = {
  dashboard: 'M4 13h6V4H4v9Zm0 7h6v-5H4v5Zm10 0h6v-9h-6v9Zm0-16v5h6V4h-6Z',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5ZM14 3v5h5',
  layers: 'm12 3 9 5-9 5-9-5 9-5ZM3 13l9 5 9-5M3 17l9 5 9-5',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  image: 'M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11ZM4.5 17l5-4.5 3.5 3 3-2.5 3.5 3',
  album: 'M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9ZM7 6V4.5M17 6V4.5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  beaker: 'M9 3h6M10 3v5.5L5.5 17A2.5 2.5 0 0 0 7.8 21h8.4a2.5 2.5 0 0 0 2.3-4L14 8.5V3M7 15h10',
  book: 'M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5v-13ZM11 4h7.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H11',
  users: 'M15.5 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H6.7A3.7 3.7 0 0 0 3 18.2V20M19 20v-1.8a3.7 3.7 0 0 0-2.8-3.6M15 4.2a3.7 3.7 0 0 1 0 7.1',
  user: 'M19 20v-1.8a3.7 3.7 0 0 0-3.7-3.7H8.7A3.7 3.7 0 0 0 5 18.2V20',
  pen: 'M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3ZM15 6.5l2.5 2.5',
  video: 'M4 7.5A2.5 2.5 0 0 1 6.5 5h6A2.5 2.5 0 0 1 15 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 4 16.5v-9ZM15 10.5l5-3v9l-5-3z',
  calendar: 'M4 8.5A2.5 2.5 0 0 1 6.5 6h11A2.5 2.5 0 0 1 20 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-9ZM8 4v4M16 4v4M4 11h16',
  map: 'M9 4 3.5 6.2v13.3L9 17.3l6 2.2 5.5-2.2V4L15 6.2 9 4Zm0 0v13.3m6-11.1V19.5',
  handshake: 'm12 8.5 2.5-2.5 5 5-3.5 3.5-2-2M12 8.5 9.5 6l-5 5L8 14.5l2-2M8 14.5l2 2 2-2 2 2',
  inbox: 'M4 13h4l1.5 2.5h5L16 13h4M4 13 6.5 5.5A2 2 0 0 1 8.4 4h7.2a2 2 0 0 1 1.9 1.5L20 13v4.5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V13Z',
  settings: 'M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3.5 15h-.3a2 2 0 1 1 0-4h.2A1.6 1.6 0 0 0 4.6 8.2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9.3a1.6 1.6 0 0 0 1-1.5v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8v.1a1.6 1.6 0 0 0 1.5 1h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1Z',
  search: 'm16 16 4.5 4.5',
  plus: 'M12 5v14M5 12h14',
  trash: 'M4 7h16M9.5 7V5.5A1.5 1.5 0 0 1 11 4h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 11v5M14 11v5',
  close: 'M6 6l12 12M18 6 6 18',
  logout: 'M15 17l5-5-5-5M20 12H9M12 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H12',
  external: 'M14 4h6v6M20 4 11 13M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10',
  chevronLeft: 'M15 6l-6 6 6 6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  eyeOff: 'M3 3l18 18M10.6 10.7a2 2 0 0 0 2.8 2.8M9.4 5.4A9.6 9.6 0 0 1 12 5c5 0 9 4.5 9 7a11 11 0 0 1-2.3 3.4M6.2 6.7A11.6 11.6 0 0 0 3 12c0 2.5 4 7 9 7 1.3 0 2.5-.3 3.6-.8',
  copy: 'M9 9V5.5A1.5 1.5 0 0 1 10.5 4h8A1.5 1.5 0 0 1 20 5.5v8a1.5 1.5 0 0 1-1.5 1.5H15M4 10.5A1.5 1.5 0 0 1 5.5 9h8a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 4 18.5v-8Z',
  upload: 'M12 16V4M8 8l4-4 4 4M4 16v2.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V16',
};

const CIRCLES = {
  search: [{ cx: 11, cy: 11, r: 6.5 }],
  user: [{ cx: 12, cy: 8, r: 4 }],
  users: [{ cx: 9.2, cy: 8, r: 3.7 }],
  album: [{ cx: 9.5, cy: 11, r: 1.4 }],
};

export default function AdminIcon({ name, size = 18, className }) {
  const d = ICONS[name];
  if (!d) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"
         className={className} aria-hidden="true" focusable="false">
      {(CIRCLES[name] || []).map((c, i) => <circle key={i} {...c} />)}
      <path d={d} />
    </svg>
  );
}
