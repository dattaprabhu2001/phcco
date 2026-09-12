import { useState, useMemo } from 'react';
import { WORLD_MAP } from '../../lib/world-map-data.js';

const VB_W = 960;

/**
 * Blog author locations on a Natural Earth I world map.
 *
 * Pin coordinates come from the posts themselves (author_map_x / author_map_y),
 * so an editor can add or move an author without a rebuild.
 */
export default function WorldMap({ authors = [] }) {
  const [active, setActive] = useState(null);

  const pins = useMemo(
    () => authors
      .filter((a) => a.author_map_x != null && a.author_map_y != null)
      .map((a) => ({
        name: a.author_name,
        city: a.author_city || '',
        affiliation: a.author_role || '',
        country: a.author_country || 'Elsewhere',
        x: Number(a.author_map_x),
        y: Number(a.author_map_y),
      }))
      .sort((a, b) => a.y - b.y),
    [authors]
  );

  // The list beside the map groups authors by country, so it still tells the
  // story on its own if the map cannot draw.
  const countries = useMemo(() => {
    const byCountry = new Map();
    for (const p of pins) {
      if (!byCountry.has(p.country)) byCountry.set(p.country, []);
      byCountry.get(p.country).push(p);
    }
    return [...byCountry.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [pins]);

  // Labels run two lines and pins can sit close together (Clemson and Tampa are
  // ~20px apart at this scale), so walk top-to-bottom and drop a label below its
  // pin when it would collide with one already placed.
  const placed = [];
  const laidOut = pins.map((p) => {
    const clash = placed.some((qq) => Math.abs(qq.y - p.y) < 46 && Math.abs(qq.x - p.x) < 140);
    placed.push(p);
    const end = p.x > VB_W - 170;
    return { ...p, below: clash, anchor: end ? 'end' : 'start', dx: end ? -12 : 12 };
  });

  return (
    <div className="world-wrap" style={{ marginTop: '2rem' }}>
      <div className="world-frame">
        <svg viewBox={WORLD_MAP.viewBox} role="img"
             aria-label={`World map showing the locations of ${laidOut.length} contributing authors`}>
          <defs>
            <radialGradient id="pinGlow">
              <stop offset="0%" stopColor="#f7b938" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#f7b938" stopOpacity="0" />
            </radialGradient>
          </defs>
          {WORLD_MAP.graticule && <path className="world-grat" d={WORLD_MAP.graticule} />}
          <path className="world-land" d={WORLD_MAP.land} />

          {laidOut.map((p) => {
            const on = active === p.name;
            const ly = p.below ? p.y + 26 : p.y - 10;
            return (
              <g key={p.name} className={`world-pin${on ? ' is-active' : ''}`}
                 onMouseEnter={() => setActive(p.name)}
                 onMouseLeave={() => setActive(null)}>
                <circle cx={p.x} cy={p.y} r="26" fill="url(#pinGlow)" />
                <circle className="world-dot" cx={p.x} cy={p.y} r="4.5" />
                <text x={p.x + p.dx} y={ly} textAnchor={p.anchor}>
                  <tspan className="world-name" x={p.x + p.dx}>{p.name}</tspan>
                  <tspan className="world-city" x={p.x + p.dx} dy="14">{p.city}</tspan>
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="reveal">
        <h3 className="kicker">Contributing from</h3>
        <ul className="stack-sm" style={{ marginTop: '1rem' }}>
          {countries.map(([country, authors]) => (
            <li className="card card-hover country-card" key={country}>
              <div className="hd">
                <p className="nm">{country}</p>
                <span className="ct">
                  {authors.length} {authors.length === 1 ? 'author' : 'authors'}
                </span>
              </div>
              <ul>
                {authors.map((a) => (
                  <li key={a.name}
                      className={active === a.name ? 'is-active' : ''}
                      onMouseEnter={() => setActive(a.name)}
                      onMouseLeave={() => setActive(null)}>
                    <b>{a.name}</b>
                    <span>{[a.affiliation, a.city].filter(Boolean).join(', ')}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
