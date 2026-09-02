import { useMemo, useState } from 'react';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import { PageBanner, Loading, ErrorState, GenericSection } from '../components/Bits.jsx';
import Icon from '../components/Icon.jsx';

export default function Publications() {
  const { data, loading, error } = useFetch('/publications');
  const [search, setSearch] = useState('');
  const [theme, setTheme] = useState(null);
  const [year, setYear] = useState(null);

  useReveal([data, search, theme, year]);
  useTitle(data?.page?.title);

  const shown = useMemo(() => {
    const rows = data?.publications || [];
    const needle = search.trim().toLowerCase();
    return rows.filter((p) => {
      if (theme && p.theme !== theme) return false;
      if (year && String(p.year) !== String(year)) return false;
      if (!needle) return true;
      return `${p.title} ${p.journal} ${p.theme} ${p.authors || ''}`.toLowerCase().includes(needle);
    });
  }, [data, search, theme, year]);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  // Grouped by year so the page reads as a bibliography, newest first.
  const byYear = shown.reduce((acc, p) => {
    (acc[p.year || 'Undated'] ||= []).push(p);
    return acc;
  }, {});
  const years = Object.keys(byYear).sort((a, b) => Number(b) - Number(a));

  return (
    <>
      <PageBanner page={data.page} crumb="Publications" />

      <section className="section">
        <div className="shell">
          <div>
            <div className="card pub-controls reveal">
              <label className="search-field">
                <span className="visually-hidden">Search publications</span>
                <Icon name="search" />
                <input className="input" type="search" id="pub-search"
                       placeholder="Search by title, journal or theme…"
                       value={search} onChange={(e) => setSearch(e.target.value)} />
              </label>

              <div className="filter-groups">
                <FilterGroup label="Theme" options={data.themes} value={theme} onChange={setTheme} />
                <FilterGroup label="Year" options={data.years} value={year} onChange={setYear} />
              </div>

              <div className="pub-meta">
                {shown.length} of {data.publications.length}{' '}
                {data.publications.length === 1 ? 'publication' : 'publications'}
              </div>
            </div>

            <div className="stack-lg">
              {years.map((y) => (
                <div key={y}>
                  <h2 className="t-h3">{y} <span className="kicker">
                    {byYear[y].length} {byYear[y].length === 1 ? 'paper' : 'papers'}
                  </span></h2>
                  <ul className="pub-list" style={{ marginTop: '1rem' }}>
                    {byYear[y].map((p) => (
                      <li className="card card-hover pub-row reveal" key={p.id}>
                        <span className="ico"><Icon name="file" /></span>
                        <div className="body">
                          <h3>{p.title}</h3>
                          <p className="src">
                            {p.journal && <cite>{p.journal}</cite>}
                            {p.journal && p.year && <span className="sep" aria-hidden="true">·</span>}
                            {p.year && <span className="yr">{p.year}</span>}
                          </p>
                          {p.authors && <p className="kicker">{p.authors}</p>}
                          {p.theme && <span className="tag" style={{ marginTop: '0.75rem' }}>{p.theme}</span>}
                        </div>
                        {p.doi_url && (
                          <div className="act">
                            <a className="btn btn-ghost pub-doi" href={p.doi_url}
                               target="_blank" rel="noopener noreferrer">
                              Find DOI<Icon name="external" />
                            </a>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {shown.length === 0 && (
              <p className="empty-state reveal">No publications match those filters.</p>
            )}
          </div>
        </div>
      </section>

      {(data.sections || []).map((s) => <GenericSection section={s} key={s.id} />)}
    </>
  );
}

function FilterGroup({ label, options = [], value, onChange }) {
  return (
    <div className="filter-group">
      <span className="lbl">{label}</span>
      <div className="chips">
        <button className="chip" type="button" aria-pressed={!value} onClick={() => onChange(null)}>
          All
        </button>
        {options.map((o) => (
          <button key={o} className="chip" type="button"
                  aria-pressed={String(value) === String(o)}
                  onClick={() => onChange(String(value) === String(o) ? null : o)}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
