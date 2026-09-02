import { Link, useParams } from 'react-router-dom';
import { useFetch, useReveal, useTitle } from '../../lib/hooks.js';
import { PageBanner, Loading, ErrorState, SectionHead, Section, Prose, GenericSection } from '../components/Bits.jsx';
import WorldMap from '../components/WorldMap.jsx';
import Icon from '../components/Icon.jsx';
import { formatDate, initials } from './Home.jsx';

export function Blog() {
  const { data, loading, error } = useFetch('/posts');
  useReveal([data]);
  useTitle(data?.page?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const posts = data.posts || [];
  const featured = posts.find((p) => p.is_featured) || posts[0];
  const rest = posts.filter((p) => p !== featured);
  const contributors = (data.sections || []).find((s) => s.section_key === 'our-contributors');

  return (
    <>
      <PageBanner page={data.page} crumb="Blog" />

      <section className="section">
        <div className="shell">
          {featured && (
            <Link className="card card-hover blog-feature reveal" to={`/blog/${featured.slug}`}>
              <span className="bf-media">
                {featured.cover_image && (
                  <img src={featured.cover_image} alt="" loading="eager"
                       fetchpriority="high" decoding="async" />
                )}
                {Number(featured.is_invited) === 1 && (
                  <span className="pill-invited bcard-pill">Invited</span>
                )}
              </span>
              <span className="bf-body">
                <span className="bcard-meta">
                  Latest <i aria-hidden="true">·</i> {formatDate(featured.published_at)}
                  {featured.read_minutes && <> <i aria-hidden="true">·</i> {featured.read_minutes}</>}
                </span>
                <h2 className="t-h3 balance">{featured.title}</h2>
                <p className="bf-x">{featured.excerpt}</p>
                <span className="bcard-by">
                  <span className="avatar-fb" aria-hidden="true">{initials(featured.author_name)}</span>
                  <span className="who">
                    <span className="nm">{featured.author_name}</span>
                    {/* The wide feature card has room for the author's full title. */}
                    <span className="af">{featured.author_title || featured.author_role}</span>
                  </span>
                </span>
                <span className="bcard-read">Read the post <Icon name="arrowRight" /></span>
              </span>
            </Link>
          )}

          {rest.length > 0 && (
            <div className="blog-cards" style={{ marginTop: '1.25rem' }}>
              {rest.map((p, i) => (
                <Link className="card card-hover bcard reveal" to={`/blog/${p.slug}`}
                      key={p.id} data-reveal-delay={i * 80}>
                  <span className="bcard-media">
                    {p.cover_image && <img src={p.cover_image} alt="" loading="lazy" decoding="async" />}
                    {Number(p.is_invited) === 1 && (
                      <span className="pill-invited bcard-pill">Invited</span>
                    )}
                  </span>
                  <span className="bcard-body">
                    <span className="bcard-meta">
                      {formatDate(p.published_at)}
                      {p.read_minutes && <> <i aria-hidden="true">·</i> {p.read_minutes}</>}
                    </span>
                    <h3>{p.title}</h3>
                    <span className="bcard-x">{p.excerpt}</span>
                    <span className="bcard-by">
                      <span className="avatar-fb" aria-hidden="true">{initials(p.author_name)}</span>
                      <span className="who">
                        <span className="nm">{p.author_name}</span>
                        <span className="af">{p.author_role}</span>
                      </span>
                    </span>
                    <span className="bcard-read">Read the post <Icon name="arrowRight" /></span>
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {contributors && posts.some((p) => p.author_map_x != null) && (
        <Section section={contributors}>
          <SectionHead section={contributors} />
          <WorldMap authors={posts} />
        </Section>
      )}

      {(data.sections || [])
        .filter((s) => s.section_key !== 'our-contributors')
        .map((s) => <GenericSection section={s} key={s.id} />)}
    </>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { data, loading, error } = useFetch(`/posts/${slug}`);
  useReveal([data]);
  useTitle(data?.post?.title);

  if (loading) return <Loading />;
  if (error) return <ErrorState error={error} />;

  const { post, more = [] } = data;

  return (
    <>
      <article className="section">
        <div className="shell shell-narrow">
          <nav className="crumbs" aria-label="Breadcrumb">
            <ol>
              <li><Link to="/">Home</Link></li>
              <li><Link to="/blog">Blog</Link></li>
              <li aria-current="page">{post.title}</li>
            </ol>
          </nav>

          <span className="bcard-meta">
            {formatDate(post.published_at)}
            {post.read_minutes && <> <i aria-hidden="true">·</i> {post.read_minutes}</>}
          </span>
          <h1 className="t-hero balance">{post.title}</h1>
          {post.excerpt && <p className="lead t-lead pretty">{post.excerpt}</p>}

          <div className="bcard-by" style={{ marginTop: '1.5rem' }}>
            <span className="avatar-fb" aria-hidden="true">{initials(post.author_name)}</span>
            <span className="who">
              <span className="nm">{post.author_name}</span>
              <span className="af">{post.author_role}</span>
            </span>
          </div>

          {post.cover_image && (
            <img src={post.cover_image} alt="" className="post-cover"
                 style={{ marginTop: '2rem', width: '100%', borderRadius: '1rem' }} />
          )}

          {/* Body HTML comes from the CMS, authored by a signed-in admin. */}
          {post.body_html && (
            <div className="prose" style={{ marginTop: '2rem' }}
                 dangerouslySetInnerHTML={{ __html: post.body_html }} />
          )}
        </div>
      </article>

      {more.length > 0 && (
        <section className="section bg-white">
          <div className="shell">
            <SectionHead heading="More from the blog" />
            <div className="blog-cards" style={{ marginTop: '1.5rem' }}>
              {more.map((p, i) => (
                <Link className="card card-hover bcard reveal" to={`/blog/${p.slug}`}
                      key={p.slug} data-reveal-delay={i * 80}>
                  <span className="bcard-media">
                    {p.cover_image && <img src={p.cover_image} alt="" loading="lazy" />}
                  </span>
                  <span className="bcard-body">
                    <h3>{p.title}</h3>
                    <span className="bcard-x">{p.excerpt}</span>
                    <span className="bcard-read">Read the post <Icon name="arrowRight" /></span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
