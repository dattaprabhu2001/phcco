import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, Outlet } from 'react-router-dom';
import { useFetch, useScrollLock } from '../../lib/hooks.js';
import Icon from './Icon.jsx';
import ErrorBoundary from './ErrorBoundary.jsx';

/** Header, footer and mobile nav — everything driven by /api/shell. */
export default function Layout() {
  const { data } = useFetch('/shell');
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSub, setOpenSub] = useState(null);
  const location = useLocation();

  useScrollLock(menuOpen);

  // Close the menu and jump to the top whenever the route changes — otherwise a
  // tap in the mobile sheet leaves it hanging open over the new page.
  useEffect(() => {
    setMenuOpen(false);
    setOpenSub(null);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  // A dropdown opened by click stays open until dismissed, so Escape and a
  // click anywhere outside have to close it.
  useEffect(() => {
    if (openSub == null) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpenSub(null); };
    const onClick = (e) => { if (!e.target.closest('.nav-parent')) setOpenSub(null); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, [openSub]);

  const settings = data?.settings || {};
  const nav = data?.nav || [];

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>

      <div className="topbar">
        <div className="shell">
          <p>
            <span className="from-sm">{settings.topbar_text}</span>
            <span className="to-sm">{settings.topbar_text_short}</span>
          </p>
          {settings.contact_email && (
            <a href={`mailto:${settings.contact_email}`}>
              <Icon name="mail" /><span>{settings.contact_email}</span>
            </a>
          )}
        </div>
      </div>

      <header className="site-header">
        <div className="shell">
          <div className="header-row">
            <Link className="brand" to="/" aria-label={`${settings.site_title || 'PHCCO'} — home`}>
              {settings.logo && <img className="brand-logo" src={settings.logo} alt={settings.site_tagline || 'PHCCO'} />}
            </Link>

            <nav className="nav-desktop" aria-label="Primary">
              {nav.map((item) => {
                if (!item.children?.length) {
                  return (
                    <NavLink key={item.id} to={item.path} end={item.path === '/'}>
                      {item.label}
                    </NavLink>
                  );
                }

                const open = openSub === item.id;
                return (
                  // `is-open` is what the stylesheet shows the dropdown on —
                  // tracking the state without setting the class leaves the
                  // submenu permanently hidden.
                  <div className={`nav-parent${open ? ' is-open' : ''}`} key={item.id}
                    onMouseEnter={() => setOpenSub(item.id)}
                    onMouseLeave={() => setOpenSub(null)}
                    onFocus={() => setOpenSub(item.id)}
                    onBlur={(e) => {
                      if (!e.currentTarget.contains(e.relatedTarget)) setOpenSub(null);
                    }}>
                    {/* <NavLink to={item.path} aria-expanded={open} aria-haspopup="true"
                             onClick={(e) => {
                               // First activation opens the menu; a second one
                               // follows the link, so the parent page stays
                               // reachable by keyboard and on touch.
                               if (!open) {
                                 e.preventDefault();
                                 setOpenSub(item.id);
                               }
                             }}>
                      {item.label}<Icon name="caret" className="nav-caret" />
                    </NavLink> */}
                    <NavLink to={item.path} aria-expanded={open} aria-haspopup="true"
                      onClick={(e) => {
                        // Parent menu item should never navigate.
                        // Only submenu items (Photos / Videos) should open pages.
                        e.preventDefault();
                        setOpenSub(item.id);
                      }}>
                      {item.label} <Icon name="caret" className="nav-caret" />
                    </NavLink>
                    <ul className="nav-sub">
                      {item.children.map((c) => (
                        <li key={c.id}><NavLink to={c.path}>{c.label}</NavLink></li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </nav>

            <div className="header-actions">
              {settings.cta_label && (
                <Link className="btn btn-accent header-cta" to={settings.cta_url || '/get-involved'}>
                  {settings.cta_label}
                </Link>
              )}
              <span className="header-divider" aria-hidden="true" />
              {settings.partner_logo && (
                <a className="ph-logo" href={settings.partner_url} target="_blank" rel="noopener noreferrer"
                  aria-label="Param Hansa Philanthropies">
                  <img src={settings.partner_logo} alt="Param Hansa Philanthropies" />
                </a>
              )}
              <button className="menu-toggle" type="button" aria-expanded={menuOpen}
                aria-controls="site-nav-mobile"
                aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                onClick={() => setMenuOpen((v) => !v)}>
                <Icon name="menu" className="icon-open" />
                <Icon name="close" className="icon-close" />
              </button>
            </div>
          </div>
        </div>

        <div className="nav-mobile" id="site-nav-mobile" hidden={!menuOpen}>
          <div className="shell">
            <nav aria-label="Primary (mobile)">
              {nav.map((item) => (
                <div key={item.id}>
                  <NavLink to={item.path} end={item.path === '/'}>{item.label}</NavLink>
                  {item.children?.length > 0 && (
                    <ul className="nav-sub-mobile">
                      {item.children.map((c) => (
                        <li key={c.id}><NavLink to={c.path}>{c.label}</NavLink></li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
              {settings.cta_label && (
                <Link className="btn btn-accent" to={settings.cta_url || '/get-involved'}>
                  {settings.cta_label}
                </Link>
              )}
            </nav>
          </div>
        </div>
      </header>

      <main id="main">
        <ErrorBoundary routeKey={location.pathname}>
          <Outlet />
        </ErrorBoundary>
      </main>

      <Footer settings={settings} nav={nav} />
    </>
  );
}

function Footer({ settings, nav }) {
  const address = (settings.contact_address || '').split('\n').filter(Boolean);

  return (
    <footer className="site-footer">
      <div className="shell">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="footer-logo-chip" to="/" aria-label={`${settings.site_title || 'PHCCO'} — home`}>
              {settings.logo && <img src={settings.logo} alt={settings.site_tagline || 'PHCCO'} />}
            </Link>
            <div className="marks" style={{ marginTop: '1.25rem' }}>
              {settings.iisc_logo && (
                <img className="iisc" src={settings.iisc_logo} alt="Indian Institute of Science" />
              )}
              <span className="divider" aria-hidden="true" />
              {/* The footer sits on a dark ground, so it takes the white lockup. */}
              <img className="ph" src="/assets/media/brand/paramhansa-white.webp" alt="Param Hansa Philanthropies" />
            </div>
            <p>{settings.footer_blurb}</p>
          </div>

          <div>
            <h2>Explore</h2>
            <div className="footer-nav">
              {nav.filter((n) => n.path !== '/').map((n) => (
                <Link key={n.id} to={n.path}>{n.label}</Link>
              ))}
            </div>
          </div>

          <div>
            <h2>Contact</h2>
            <ul className="footer-contact">
              <li>
                <address>{address.map((line, i) => <span key={i}>{line}</span>)}</address>
              </li>
              {settings.contact_phone && (
                <li><a href={`tel:${settings.contact_phone.replace(/[^+\d]/g, '')}`}>{settings.contact_phone}</a></li>
              )}
              {settings.contact_email && (
                <li><a href={`mailto:${settings.contact_email}`}>{settings.contact_email}</a></li>
              )}
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>{settings.footer_copyright}</p>
          <p>
            An initiative of IISc &amp;{' '}
            <a href={settings.partner_url} target="_blank" rel="noopener noreferrer">
              Param Hansa Philanthropies
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
