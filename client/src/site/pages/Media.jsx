import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import { PageBanner, Loading, ErrorState, GenericSection } from '../components/Bits.jsx';
import Lightbox from '../components/Lightbox.jsx';
import Icon, { PlayIcon } from '../components/Icon.jsx';

/** Photos / Videos switch that sits above both media grids. */
function MediaTabs({ active }) {
  const tabs = [
    { key: 'photos', label: 'Photos', to: '/media' },
    { key: 'videos', label: 'Videos', to: '/media-videos' },
  ];
  return (
    <div className="media-tabs reveal" role="tablist" aria-label="Media type">
      {tabs.map((t) => (
        <Link key={t.key} className={`media-tab${active === t.key ? ' is-on' : ''}`}
              to={t.to} role="tab" aria-selected={active === t.key}>
          <Icon name={t.key} />{t.label}
        </Link>
      ))}
    </div>
  );
}

export function Media() {
  const { data, loading, error } = useFetch('/albums');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <PageBanner page={data.page} crumb="Photos" trail={[{ label: 'Media', to: '/media' }]} />

      <section className="section">
        <div className="shell">
          <MediaTabs active="photos" />
          <div className="album-grid" style={{ marginTop: '1.75rem' }}>
            {(data.albums || []).map((a, i) => (
              <Link className="card card-hover album-card reveal" to={`/media/${a.slug}`}
                    key={a.id} data-reveal-delay={i * 80}>
                <span className="album-media">
                  {a.cover_image && <img src={a.cover_image} alt="" loading="lazy" decoding="async" />}
                  <span className="album-count">
                    {a.photo_count} {a.photo_count === 1 ? 'photo' : 'photos'}
                  </span>
                </span>
                <span className="album-body">
                  <span className="album-meta">
                    {a.date_text}
                    {a.date_text && a.location && <i aria-hidden="true">·</i>}
                    {a.location}
                  </span>
                  <h3>{a.title}</h3>
                  <span className="album-blurb">{a.description}</span>
                  <span className="bcard-read">View album <Icon name="arrowRight" /></span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {(data.sections || []).map((s) => <GenericSection section={s} key={s.id} />)}
    </>
  );
}

export function Album() {
  const { slug } = useParams();
  const { data, loading, error } = useFetch(`/albums/${slug}`);
  const [open, setOpen] = useState(null);

  useReveal([data]);
  useTitle(data?.album?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const { album, photos = [] } = data;

  return (
    <>
      <section className="section">
        <div className="shell">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/media">Media</Link></li>
              <li aria-current="page">{album.title}</li>
            </ol>
          </nav>

          <span className="eyebrow">{album.date_text}{album.location && ` · ${album.location}`}</span>
          <h1 className="t-hero balance">{album.title}</h1>
          {album.description && <p className="lead t-lead pretty">{album.description}</p>}

          {/* `photo-grid` is a CSS multi-column masonry (1/2/3/4 columns by
              width). It is what lets the mixed portrait and landscape shots sit
              together at their own aspect ratios without being cropped. */}
          <div className="photo-grid" style={{ marginTop: '2rem' }}>
            {photos.map((p, i) => (
              <figure className="ph-tile reveal" key={p.id} data-reveal-delay={(i % 6) * 60}>
                <button className="ph-open" type="button" onClick={() => setOpen(i)}
                        aria-label={`Open photo ${i + 1} of ${photos.length}${p.caption ? `: ${p.caption}` : ''}`}>
                  {/* width/height reserve the tile's aspect ratio before the
                      image arrives, so the masonry does not re-flow as it fills. */}
                  <img src={p.thumb} alt={p.caption || ''}
                       width={p.width || undefined} height={p.height || undefined}
                       loading="lazy" decoding="async" />
                  <span className="ph-zoom" aria-hidden="true"><Icon name="search" /></span>
                </button>
                {p.caption && <figcaption>{p.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </div>
      </section>

      <Lightbox photos={photos} index={open} onClose={() => setOpen(null)} onGo={setOpen} />
    </>
  );
}

export function Videos() {
  const { data, loading, error } = useFetch('/videos');
  const [playing, setPlaying] = useState(null);

  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  return (
    <>
      <PageBanner page={data.page} crumb="Videos" trail={[{ label: 'Media', to: '/media' }]} />

      <section className="section">
        <div className="shell">
          <MediaTabs active="videos" />
          <div className="vid-grid" style={{ marginTop: '1.75rem' }}>
            {(data.videos || []).map((v, i) => (
              <article className="card card-hover vid-card reveal" key={v.id} data-reveal-delay={i * 80}>
                <div className="vid-media">
                  {playing === v.id && v.youtube_id ? (
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${v.youtube_id}?autoplay=1`}
                      title={v.title}
                      allow="accelerometer; autoplay; encrypted-media; picture-in-picture"
                      allowFullScreen loading="lazy"
                    />
                  ) : (
                    <button className="vid-thumb" type="button"
                            onClick={() => setPlaying(v.id)}
                            aria-label={`Play: ${v.title}`}>
                      {v.thumb && <img src={v.thumb} alt="" loading="lazy" decoding="async" />}
                      <span className="scrim" aria-hidden="true" />
                      <span className="play" aria-hidden="true"><i><PlayIcon /></i></span>
                      {v.duration && <span className="dur">{v.duration}</span>}
                      {v.kind && <span className="type-pill">{v.kind}</span>}
                    </button>
                  )}
                </div>
                <div className="vid-body">
                  <p className="bcard-meta">
                    {v.date_text}
                    {v.date_text && v.affiliation && <i aria-hidden="true">·</i>}
                    {v.affiliation}
                  </p>
                  <h3>{v.title}</h3>
                  {v.description && <p className="vid-blurb">{v.description}</p>}
                  {v.guest && <p className="vid-by"><Icon name="mic" />{v.guest}</p>}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {(data.sections || []).map((s) => <GenericSection section={s} key={s.id} />)}
    </>
  );
}
