import { useMemo, useState } from 'react';
import Icon from './Icon.jsx';

/**
 * The basemap is a plain equirectangular render of India, so markers sit at a
 * linear lon/lat -> pixel fit:
 *
 *   x = X0 + (lon - LON0) * PX_LON
 *   y = Y0 + (LAT0 - lat) * PX_LAT
 *
 * These constants were least-squares fitted against the eight markers drawn
 * into the original figure (worst residual ~3.3px). They belong to that exact
 * image — swapping the basemap means refitting them, not nudging them.
 */
const MAP = { W: 640, H: 660, X0: 55.65, Y0: 35.96, LON0: 68.2, LAT0: 37.1, PX_LON: 18.875, PX_LAT: 19.938 };

const project = (lon, lat) => ({
  x: MAP.X0 + (lon - MAP.LON0) * MAP.PX_LON,
  y: MAP.Y0 + (MAP.LAT0 - lat) * MAP.PX_LAT,
});

/**
 * Several venues share a city (three in Bengaluru). Left as separate rows they
 * stack on one pixel with only the topmost hoverable, so group by city and let
 * a single pin own them all.
 */
function groupByCity(rows) {
  const byCity = new Map();
  for (const row of rows) {
    if (row.lat == null || row.lon == null) continue;
    if (!byCity.has(row.city)) byCity.set(row.city, { city: row.city, rows: [] });
    byCity.get(row.city).rows.push(row);
  }
  return [...byCity.values()];
}

/** The framed basemap with its pins and legend. Shared by Outreach and About. */
export function MapFrame({ groups, active, setActive, image, alt, labelOf }) {
  return (
    <div className="card map-frame reveal">
      <div className="map-canvas">
        <img src={image} width={MAP.W} height={MAP.H} alt={alt}
             loading="lazy" decoding="async" />

        {groups.map((group) => {
          const { x, y } = project(Number(group.rows[0].lon), Number(group.rows[0].lat));
          const isWocon = group.rows.some((r) => r.kind === 'wocon') || !group.rows[0].kind;
          const multiple = group.rows.length > 1;
          const on = active === group.city;
          return (
            <button
              key={group.city}
              type="button"
              className={`pin ${isWocon ? 'wocon' : 'conf'}${multiple ? ' multi' : ''}${on ? ' is-active' : ''}`}
              style={{ left: `${(x / MAP.W) * 100}%`, top: `${(y / MAP.H) * 100}%` }}
              onMouseEnter={() => setActive(group.city)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(group.city)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(on ? null : group.city)}
              aria-label={`${group.city} — ${group.rows.length} ${group.rows.length === 1 ? 'entry' : 'entries'}`}
            >
              <span className="halo" aria-hidden="true" />
              <span className="dot" aria-hidden="true">{multiple ? group.rows.length : ''}</span>
              <span className="tip" role="tooltip">
                <span className="city">{group.city}</span>
                {group.rows.map((r) => (
                  <span className="ev" key={r.id}>{labelOf(r)}</span>
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="map-legend">
        <span><i className="w" />Collaborating institution</span>
        <span><i className="m">3</i>Multiple institutions in one city</span>
      </div>
    </div>
  );
}

/** About's map: partner institutions, no filters. */
export function CollabMap({ rows }) {
  const [active, setActive] = useState(null);
  const groups = useMemo(() => groupByCity(rows), [rows]);

  return (
    <MapFrame
      groups={groups} active={active} setActive={setActive}
      image="/assets/media/img/map-india-outreach.webp"
      alt="Map of India showing the cities of PHCCO's Indian collaborating institutions"
      labelOf={(r) => <span className="e">{r.name}</span>}
    />
  );
}

const FILTERS = [
  { key: 'all', label: 'All locations' },
  { key: 'wocon', label: 'WoCON series' },
  { key: 'conference', label: 'Conferences & symposia' },
];

/** Outreach's map: every event, filterable by kind, with the full list beside it. */
export default function IndiaMap({ locations = [] }) {
  const [filter, setFilter] = useState('all');
  const [active, setActive] = useState(null);

  const shown = useMemo(
    () => (filter === 'all' ? locations : locations.filter((l) => l.kind === filter)),
    [locations, filter]
  );
  const groups = useMemo(() => groupByCity(shown), [shown]);

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <div className="row-wrap reveal" style={{ alignItems: 'center' }}>
        {FILTERS.map((f) => (
          <button key={f.key} className="chip" type="button"
                  aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
        <span className="kicker" style={{ marginLeft: 'auto' }}>
          {shown.length} {shown.length === 1 ? 'event' : 'events'} · {groups.length}{' '}
          {groups.length === 1 ? 'city' : 'cities'}
        </span>
      </div>

      <div className="map-wrap" style={{ marginTop: '1.5rem' }}>
        <MapFrame
          groups={groups} active={active} setActive={setActive}
          image="/assets/media/img/map-india-outreach.webp"
          alt="Map of India showing the cities where PHCCO has run workshops and conferences"
          labelOf={(r) => (
            <>
              <span className="e">{r.event}</span>
              <span className="v">{r.venue}</span>
            </>
          )}
        />

        <ul className="loc-list">
          {shown.map((loc) => (
            <li key={loc.id}>
              <button
                className={`loc-item ${loc.kind}${active === loc.city ? ' is-active' : ''}`}
                type="button"
                onMouseEnter={() => setActive(loc.city)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(loc.city)}
                onBlur={() => setActive(null)}
              >
                <Icon name="pin" />
                <span>
                  <span className="e">{loc.event}</span>
                  <span className="v">{loc.venue} · {loc.city}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
