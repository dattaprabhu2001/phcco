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
export function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-visible)');
    if (!els.length) return;

    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      els.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const delay = Number(entry.target.dataset.revealDelay || 0);
          setTimeout(() => entry.target.classList.add('is-visible'), delay);
          io.unobserve(entry.target);
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.05 }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
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
