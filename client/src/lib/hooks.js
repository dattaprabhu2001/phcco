import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from './api.js';

/** Fetch on mount (and whenever `path` changes) with loading/error state. */
export function useFetch(path) {
  const [state, setState] = useState({ data: null, loading: true, error: null });

  const reload = useCallback(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    api.get(path)
      .then((data) => { if (!cancelled) setState({ data, loading: false, error: null }); })
      .catch((error) => { if (!cancelled) setState({ data: null, loading: false, error }); });
    return () => { cancelled = true; };
  }, [path]);

  useEffect(reload, [reload]);
  return { ...state, reload };
}

/**
 * Adds the `is-visible` class as an element scrolls into view — the React
 * equivalent of the original site's IntersectionObserver reveal pass.
 *
 * Anyone who has asked for reduced motion gets everything shown immediately
 * rather than a page of invisible elements.
 */
/**
 * Does IntersectionObserver actually deliver callbacks here?
 *
 * The reveal animation needs `reveal-ready` on <html>, which makes the
 * stylesheet hide every `.reveal` until JS un-hides it. In an environment where
 * the observer never fires — embedded webviews that do not composite are the
 * known case, and scroll events are usually dead there too — that leaves the
 * page blank. So prove the mechanism works before betting the content on it.
 *
 * The probe settles within a frame or two, well before the first fetch
 * resolves, so in a real browser the animation is never actually skipped.
 */
let observerWorks = false;
if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;pointer-events:none';
  const io = new IntersectionObserver(() => {
    observerWorks = true;
    io.disconnect();
    probe.remove();
  });
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(probe);
    io.observe(probe);
  }, { once: true });
  if (document.readyState !== 'loading') {
    document.body.appendChild(probe);
    io.observe(probe);
  }
}

/**
 * Scroll-reveal, matching the design: the stylesheet hides `.reveal` only once
 * `reveal-ready` is on <html>, and reveals each element when it gains `is-in`.
 *
 * Reveal itself is driven by rect checks on scroll rather than by the observer,
 * so a missed callback can never strand content mid-page.
 */
export function useReveal(deps = []) {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal:not(.is-in)')];
    if (!els.length) return;

    // Cannot prove the page can be un-hidden — so never hide it.
    if (!observerWorks) {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }

    const show = (el) => {
      const delay = Number(el.dataset.revealDelay || 0);
      if (delay) el.style.transitionDelay = `${delay}ms`;
      el.classList.add('is-in');
    };

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(show);
      return;
    }

    document.documentElement.classList.add('reveal-ready');

    let pending = els;
    let queued = false;

    const pass = () => {
      queued = false;
      const limit = window.innerHeight * 0.92; // matches the design's -8% margin
      const next = [];
      for (const el of pending) {
        const r = el.getBoundingClientRect();
        // Anything whose top has crossed the fold line is revealed — including
        // elements already scrolled past. Requiring it to still be on screen
        // would strand content the viewer skimmed over quickly.
        // A zero-height box is inside a collapsed/hidden panel: leave it.
        if (r.height > 0 && r.top < limit) show(el);
        else next.push(el);
      }
      pending = next;
      if (!pending.length) detach();
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(pass);
    };

    function detach() {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    }

    pass();

    // IntersectionObserver gives the nicest result where it works, and is what
    // the design used. It is additive here, never load-bearing.
    let io = null;
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          show(e.target);
          pending = pending.filter((x) => x !== e.target);
          io.unobserve(e.target);
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      pending.forEach((el) => io.observe(el));
    }

    // The first pass runs before images and webfonts have settled, so elements
    // that will end up above the fold can still measure as below it.
    const timers = [80, 300, 900].map((ms) => setTimeout(pass, ms));

    // Last resort. Some embedded webviews never composite: no scroll events, no
    // observer callbacks. Because `reveal-ready` hides content by default, that
    // would leave the page blank — so if nothing has appeared by now, show
    // everything. A page without animation beats a page nobody can read.
    const failsafe = setTimeout(() => {
      if (pending.length === els.length) els.forEach(show);
    }, 1200);

    window.addEventListener('load', pass);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);

    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(failsafe);
      io?.disconnect();
      window.removeEventListener('load', pass);
      detach();
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Sets document.title, restoring the previous one on unmount. */
export function useTitle(title) {
  useEffect(() => {
    if (!title) return;
    const prev = document.title;
    document.title = title;
    return () => { document.title = prev; };
  }, [title]);
}

/** Auto-advancing index with pause-on-hover/focus and manual override. */
export function useCarousel(count, interval = 6000) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const timer = useRef(null);

  useEffect(() => {
    if (!playing || count < 2) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % count), interval);
    return () => clearInterval(timer.current);
  }, [playing, count, interval]);

  const go = useCallback((i) => setIndex(((i % count) + count) % count), [count]);

  return {
    index,
    go,
    next: () => go(index + 1),
    prev: () => go(index - 1),
    playing,
    setPlaying,
  };
}

/** Locks body scroll while `active` — used by the lightbox and mobile nav. */
export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [active]);
}
