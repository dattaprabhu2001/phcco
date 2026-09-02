/* ===========================================================================
   PHCCO (phcco2) — site behaviour.

   Plain ES2019, no framework, no build step, no dependencies.

   Design rule: all *content* lives in the HTML. This file only enhances it, so
   every page is complete and readable with JavaScript disabled — filters simply
   show everything, carousels become native horizontal scrollers, and the two
   maps fall back to their plain lists.

   Sections:
     1. helpers
     2. mobile navigation
     3. scroll reveal
     4. hero carousel
     5. card carousels (cohort)
     6. list filtering (publications / blog / cohort)
     7. tabs (training editions)
     8. outreach map of India
     9. world map of blog authors
    10. podcast player
    11. blog post expand
    12. contact form
     13. nav submenus
     14. cohort group picker
     15. photo lightbox
   =========================================================================== */
(function () {
  'use strict';

  /* -- 1. helpers ---------------------------------------------------------- */

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  var prefersReduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /** Minimal SVG icon set, so markup stays terse. 24x24, currentColor. */
  var ICON = {
    pin: '<path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z"/><circle cx="12" cy="10" r="2.6"/>'
  };

  function svg(paths, cls) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"' +
      (cls ? ' class="' + cls + '"' : '') + ' aria-hidden="true">' + paths + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else { fn(); }
  }

  /* -- 2. mobile navigation ------------------------------------------------ */

  function initNav() {
    var toggle = $('.menu-toggle');
    var drawer = $('#site-nav-mobile');
    if (!toggle || !drawer) return;

    var prevOverflow = '';

    function setOpen(open) {
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      drawer.hidden = !open;
      if (open) {
        prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = prevOverflow;
      }
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Reset the scroll lock if the drawer's breakpoint takes over.
    if (window.matchMedia) {
      var mq = window.matchMedia('(min-width: 1024px)');
      var onChange = function () { if (mq.matches) setOpen(false); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
  }

  /* -- 3. scroll reveal ---------------------------------------------------- */

  /**
   * Content is visible by default; the stylesheet only hides `.reveal` once
   * `.reveal-ready` is on <html>, which happens here and only if we really are
   * about to observe. A failsafe reveals everything if the observer never fires
   * (some embedded webviews never composite) — a blank page is worse than no
   * animation.
   */
  function initReveal() {
    var nodes = $$('.reveal');
    if (!nodes.length) return;

    function showAll() {
      nodes.forEach(function (n) { n.classList.add('is-in'); });
    }

    if (prefersReduced || !('IntersectionObserver' in window)) {
      showAll();
      return;
    }

    document.documentElement.classList.add('reveal-ready');

    var revealed = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        var delay = parseInt(el.getAttribute('data-reveal-delay') || '0', 10);
        if (delay) el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-in');
        revealed++;
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

    nodes.forEach(function (n) { io.observe(n); });

    window.setTimeout(function () {
      if (revealed > 0) return;
      io.disconnect();
      showAll();
    }, 2500);
  }

  /* -- 4. hero carousel ---------------------------------------------------- */

  function initHero() {
    var root = $('[data-hero]');
    if (!root) return;

    var track = $('.carousel-track', root);
    var slides = $$('.carousel-slide', track);
    var dots = $$('[data-hero-dot]', root);
    var prev = $('[data-hero-prev]', root);
    var next = $('[data-hero-next]', root);
    var playBtn = $('[data-hero-play]', root);
    if (slides.length < 2) {
      if (playBtn) playBtn.hidden = true;
      return;
    }

    var index = 0;
    var timer = null;
    var playing = !prefersReduced;
    var DELAY = 6000;

    function render() {
      track.style.transform = 'translate3d(' + (-index * 100) + '%, 0, 0)';
      slides.forEach(function (s, i) {
        // Keep offscreen slides out of the tab order and the a11y tree.
        s.setAttribute('aria-hidden', i === index ? 'false' : 'true');
      });
      dots.forEach(function (d, i) {
        d.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });
    }

    function go(i) {
      index = (i + slides.length) % slides.length;
      render();
    }

    function start() {
      if (!playing || timer) return;
      timer = window.setInterval(function () { go(index + 1); }, DELAY);
    }
    function stop() {
      if (timer) { window.clearInterval(timer); timer = null; }
    }
    function setPlaying(v) {
      playing = v;
      if (playBtn) {
        playBtn.setAttribute('data-playing', v ? 'true' : 'false');
        playBtn.setAttribute('aria-label', v ? 'Pause slideshow' : 'Play slideshow');
      }
      if (v) start(); else stop();
    }

    if (prev) prev.addEventListener('click', function () { go(index - 1); });
    if (next) next.addEventListener('click', function () { go(index + 1); });
    dots.forEach(function (d, i) {
      d.addEventListener('click', function () { go(i); });
    });
    if (playBtn) {
      playBtn.addEventListener('click', function () { setPlaying(playing !== true); });
    }

    // Pause while the pointer is over the hero, and while the tab is hidden.
    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', function () { if (playing) start(); });
    root.addEventListener('focusin', stop);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (playing) start();
    });

    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    });

    // Touch swipe.
    var x0 = null;
    root.addEventListener('touchstart', function (e) {
      x0 = e.touches[0].clientX; stop();
    }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1));
      x0 = null;
      if (playing) start();
    });

    render();
    setPlaying(!prefersReduced);
    if (playBtn && prefersReduced) playBtn.hidden = true;
  }

  /* -- 5. card carousels (cohort) ------------------------------------------ */

  /**
   * The track is a native scroll-snap scroller, so touch and trackpad already
   * work with no JS. This adds arrows and dots, and hides them entirely when
   * everything already fits.
   */
  function initCardCarousels() {
    $$('[data-carousel]').forEach(function (root) {
      var track = $('.cards-track', root);
      var nav = $('.carousel-nav', root);
      if (!track || !nav) return;

      var prev = $('[data-c-prev]', nav);
      var next = $('[data-c-next]', nav);
      var dotWrap = $('.dots', nav);
      var cards = $$(':scope > *', track);

      function pageSize() {
        // One "page" is however many whole cards fit in the viewport.
        if (!cards.length) return 1;
        var cardW = cards[0].getBoundingClientRect().width;
        var gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
        return Math.max(1, Math.round(track.clientWidth / (cardW + gap)));
      }

      function pageCount() {
        return Math.max(1, Math.ceil(cards.length / pageSize()));
      }

      function currentPage() {
        if (!cards.length) return 0;
        var cardW = cards[0].getBoundingClientRect().width;
        var gap = parseFloat(getComputedStyle(track).columnGap || '0') || 0;
        return Math.round(track.scrollLeft / ((cardW + gap) * pageSize()));
      }

      function buildDots() {
        var n = pageCount();
        if (!dotWrap) return;
        dotWrap.innerHTML = '';
        if (n < 2) return;
        for (var i = 0; i < n; i++) {
          var b = document.createElement('button');
          b.type = 'button';
          b.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          b.setAttribute('data-page', String(i));
          dotWrap.appendChild(b);
        }
      }

      function sync() {
        var n = pageCount();
        nav.hidden = n < 2;
        var page = currentPage();
        if (prev) prev.disabled = track.scrollLeft <= 2;
        if (next) {
          next.disabled =
            track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
        }
        if (dotWrap) {
          $$('button', dotWrap).forEach(function (d, i) {
            d.setAttribute('aria-current', i === page ? 'true' : 'false');
          });
        }
      }

      function scrollByPage(dir) {
        track.scrollBy({
          left: dir * track.clientWidth,
          behavior: prefersReduced ? 'auto' : 'smooth'
        });
      }

      if (prev) prev.addEventListener('click', function () { scrollByPage(-1); });
      if (next) next.addEventListener('click', function () { scrollByPage(1); });

      // Smooth scrolling finishes asynchronously and its scroll events can be
      // coalesced, so re-sync shortly after any button press as well.
      [prev, next].forEach(function (b) {
        if (b) b.addEventListener('click', function () { window.setTimeout(sync, 450); });
      });

      if (dotWrap) {
        dotWrap.addEventListener('click', function (e) {
          var b = e.target.closest('button[data-page]');
          if (!b) return;
          track.scrollTo({
            left: parseInt(b.getAttribute('data-page'), 10) * track.clientWidth,
            behavior: prefersReduced ? 'auto' : 'smooth'
          });
        });
      }

      root.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowLeft') { e.preventDefault(); scrollByPage(-1); }
        else if (e.key === 'ArrowRight') { e.preventDefault(); scrollByPage(1); }
      });

      /* Throttle with setTimeout rather than requestAnimationFrame: rAF is tied
         to compositing, and in some embedded webviews it never fires, which
         would leave the arrows and dots permanently stale. */
      var pending = null;
      track.addEventListener('scroll', function () {
        if (pending) return;
        pending = window.setTimeout(function () { pending = null; sync(); }, 90);
      }, { passive: true });

      window.addEventListener('resize', function () { buildDots(); sync(); });

      // Re-measure when the filter shows/hides cards.
      root.addEventListener('phcco:refresh', function () {
        cards = $$(':scope > *', track).filter(function (c) { return !c.hidden; });
        buildDots(); sync();
      });

      buildDots();
      sync();
    });
  }

  /* -- 6. list filtering --------------------------------------------------- */

  /**
   * Generic DOM filter driven by data attributes:
   *
   *   <div data-filter="pubs" data-filter-search="input#q">
   *     <button class="chip" data-filter-key="theme" data-filter-value="X">
   *     <li data-theme="X" data-year="2024" data-search="text to match">
   *
   * Chips toggle; an active chip narrows on its key. Optional count/empty/clear
   * elements are updated. Groups marked data-filter-group hide when they end up
   * with no visible items.
   */
  function initFilters() {
    $$('[data-filter]').forEach(function (root) {
      var items = $$('[data-filter-item]', root);
      if (!items.length) return;

      var chips = $$('[data-filter-key]', root);
      var searchSel = root.getAttribute('data-filter-search');
      var search = searchSel ? $(searchSel, root) || $(searchSel) : null;
      var countEl = $('[data-filter-count]', root);
      var emptyEl = $('[data-filter-empty]', root);
      var clearEl = $('[data-filter-clear]', root);
      var groups = $$('[data-filter-group]', root);
      var carousels = $$('[data-carousel]', root);

      var active = {};   // key -> value (or undefined)

      function matches(item) {
        for (var key in active) {
          if (!active[key]) continue;
          if (item.getAttribute('data-' + key) !== active[key]) return false;
        }
        if (search && search.value.trim()) {
          var q = search.value.trim().toLowerCase();
          var hay = (item.getAttribute('data-search') || item.textContent || '')
            .toLowerCase();
          if (hay.indexOf(q) === -1) return false;
        }
        return true;
      }

      function apply() {
        var shown = 0;
        items.forEach(function (item) {
          var ok = matches(item);
          item.hidden = !ok;
          if (ok) shown++;
        });

        // Hide group wrappers (year headings, cohort blocks) left empty.
        groups.forEach(function (g) {
          var any = $$('[data-filter-item]', g).some(function (i) {
            return !i.hidden;
          });
          g.hidden = !any;
          var n = $('[data-group-count]', g);
          if (n) {
            var c = $$('[data-filter-item]', g).filter(function (i) {
              return !i.hidden;
            }).length;
            n.textContent = c + ' ' + (c === 1
              ? (n.getAttribute('data-singular') || 'item')
              : (n.getAttribute('data-plural') || 'items'));
          }
        });

        if (countEl) {
          countEl.textContent = shown + ' of ' + items.length + ' ' +
            (countEl.getAttribute('data-noun') || 'items');
        }
        if (emptyEl) emptyEl.hidden = shown > 0;

        var dirty = !!(search && search.value.trim()) ||
          Object.keys(active).some(function (k) { return !!active[k]; });
        if (clearEl) clearEl.hidden = !dirty;

        chips.forEach(function (c) {
          var key = c.getAttribute('data-filter-key');
          var val = c.getAttribute('data-filter-value');
          var on = val ? active[key] === val : !active[key];
          c.setAttribute('aria-pressed', on ? 'true' : 'false');
        });

        carousels.forEach(function (c) {
          c.dispatchEvent(new CustomEvent('phcco:refresh'));
        });
      }

      chips.forEach(function (c) {
        c.addEventListener('click', function () {
          var key = c.getAttribute('data-filter-key');
          var val = c.getAttribute('data-filter-value');
          if (!val) { active[key] = undefined; }         // the "All" chip
          else { active[key] = active[key] === val ? undefined : val; }
          apply();
        });
      });

      if (search) {
        search.addEventListener('input', apply);
        search.addEventListener('search', apply);
      }

      if (clearEl) {
        clearEl.addEventListener('click', function () {
          active = {};
          if (search) search.value = '';
          apply();
        });
      }

      apply();
    });
  }

  /* -- 7. tabs (training editions) ----------------------------------------- */

  function initTabs() {
    $$('[data-tabs]').forEach(function (root) {
      var tabs = $$('[role="tab"]', root);
      if (!tabs.length) return;

      function select(id) {
        tabs.forEach(function (t) {
          var on = t.getAttribute('aria-controls') === id;
          t.setAttribute('aria-selected', on ? 'true' : 'false');
          t.setAttribute('aria-pressed', on ? 'true' : 'false');
          t.tabIndex = on ? 0 : -1;
        });
        $$('[role="tabpanel"]', root).forEach(function (p) {
          p.hidden = p.id !== id;
        });
      }

      tabs.forEach(function (t, i) {
        t.addEventListener('click', function () {
          select(t.getAttribute('aria-controls'));
        });
        t.addEventListener('keydown', function (e) {
          var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
          if (!d) return;
          e.preventDefault();
          var nxt = tabs[(i + d + tabs.length) % tabs.length];
          nxt.focus();
          select(nxt.getAttribute('aria-controls'));
        });
      });

      var initial = tabs.filter(function (t) {
        return t.getAttribute('aria-selected') === 'true';
      })[0] || tabs[0];
      select(initial.getAttribute('aria-controls'));
    });
  }

  /* -- 8. outreach map of India -------------------------------------------- */

  /*
   * The basemap is the map supplied in "Website Contents.docx", cropped to the
   * India region. It is a plain equirectangular render, so markers are placed
   * with a linear lon/lat -> pixel fit:
   *
   *   x = X0 + (lon - LON0) * PX_LON
   *   y = Y0 + (LAT0 - lat) * PX_LAT
   *
   * These constants are LEAST-SQUARES FITTED to the eight markers that were
   * originally drawn into that figure, matched to the cities they represent —
   * worst residual 3.3 px, most around 1 px. Do not hand-tune them: re-run
   * `node _build/clean-basemap.mjs` against the original figure, which prints
   * the fit and also paints those eight dots out of the image (otherwise they
   * show through underneath these interactive pins as a second, offset set of
   * markers).
   *
   * Locations are read from the page's own <li> list, so the data lives once.
   */
  var MAP = {
    W: 640, H: 660,
    X0: 55.65, Y0: 35.96,
    LON0: 68.2, LAT0: 37.1,
    PX_LON: 18.875, PX_LAT: 19.938
  };

  function initIndiaMap() {
    // More than one page carries a map now (Outreach, and About's
    // collaborators), so build every instance rather than only the first.
    $$('[data-india-map]').forEach(buildIndiaMap);
  }

  function buildIndiaMap(root) {
    if (!root) return;
    var canvas = $('.map-canvas', root);
    var rows = $$('[data-loc]', root);
    if (!canvas || !rows.length) return;

    // Group by city: three venues are in Bengaluru and would otherwise stack
    // on the same pixel with only the topmost hoverable.
    var order = [];
    var byCity = {};
    rows.forEach(function (row) {
      var city = row.getAttribute('data-city');
      if (!byCity[city]) { byCity[city] = { city: city, rows: [] }; order.push(city); }
      byCity[city].rows.push(row);
    });

    var pinFor = {};

    order.forEach(function (city) {
      var group = byCity[city];
      var first = group.rows[0];
      var lon = parseFloat(first.getAttribute('data-lon'));
      var lat = parseFloat(first.getAttribute('data-lat'));
      var x = MAP.X0 + (lon - MAP.LON0) * MAP.PX_LON;
      var y = MAP.Y0 + (MAP.LAT0 - lat) * MAP.PX_LAT;

      var anyWocon = group.rows.some(function (r) {
        return r.getAttribute('data-kind') === 'wocon';
      });
      var multiple = group.rows.length > 1;

      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'pin ' + (anyWocon ? 'wocon' : 'conf') + (multiple ? ' multi' : '');
      pin.style.left = (x / MAP.W * 100) + '%';
      pin.style.top = (y / MAP.H * 100) + '%';
      pin.setAttribute('aria-label', city + ' — ' + group.rows.length +
        (group.rows.length === 1 ? ' event' : ' events'));

      var tip = '<span class="tip" role="tooltip"><span class="city">' +
        esc(city) + '</span>';
      group.rows.forEach(function (r) {
        tip += '<span class="ev"><span class="e">' +
          esc(r.getAttribute('data-event')) + '</span><span class="v">' +
          esc(r.getAttribute('data-venue')) + '</span></span>';
      });
      tip += '</span>';

      pin.innerHTML = '<span class="halo" aria-hidden="true"></span>' +
        '<span class="dot" aria-hidden="true">' + (multiple ? group.rows.length : '') +
        '</span>' + tip;

      canvas.appendChild(pin);
      pinFor[city] = pin;

      function on() { setActive(city, true); }
      function off() { setActive(city, false); }
      pin.addEventListener('mouseenter', on);
      pin.addEventListener('mouseleave', off);
      pin.addEventListener('focus', on);
      pin.addEventListener('blur', off);
      pin.addEventListener('click', function () {
        setActive(city, !pin.classList.contains('is-active'));
      });
    });

    function setActive(city, on) {
      var pin = pinFor[city];
      if (pin) pin.classList.toggle('is-active', on);
      (byCity[city] ? byCity[city].rows : []).forEach(function (r) {
        var btn = $('.loc-item', r) || r;
        btn.classList.toggle('is-active', on);
      });
    }

    // Hovering a list row lights up its city pin.
    rows.forEach(function (row) {
      var city = row.getAttribute('data-city');
      var btn = $('.loc-item', row) || row;
      btn.addEventListener('mouseenter', function () { setActive(city, true); });
      btn.addEventListener('mouseleave', function () { setActive(city, false); });
      btn.addEventListener('click', function () {
        var pin = pinFor[city];
        setActive(city, pin ? !pin.classList.contains('is-active') : true);
      });
    });

    // Filter chips (All / WoCON / Conferences) re-group the pins.
    $$('[data-map-filter]', root).forEach(function (chip) {
      chip.addEventListener('click', function () {
        var want = chip.getAttribute('data-map-filter');
        $$('[data-map-filter]', root).forEach(function (c) {
          c.setAttribute('aria-pressed',
            c === chip ? 'true' : 'false');
        });

        var shownEvents = 0;
        var shownCities = {};
        rows.forEach(function (row) {
          var ok = want === 'all' || row.getAttribute('data-kind') === want;
          row.hidden = !ok;
          if (ok) { shownEvents++; shownCities[row.getAttribute('data-city')] = true; }
        });
        order.forEach(function (city) {
          if (pinFor[city]) pinFor[city].hidden = !shownCities[city];
        });

        var counter = $('[data-map-count]', root);
        if (counter) {
          counter.textContent = shownEvents + ' events · ' +
            Object.keys(shownCities).length + ' cities';
        }
      });
    });
  }

  /* -- 9. world map of blog authors ---------------------------------------- */

  /*
   * Path data is pre-baked by phcco2/scripts/bake-world-map.mjs (Natural Earth
   * I projection, land only — no country borders). Author pin positions are
   * pre-projected there too, so nothing is computed here.
   */
  function initWorldMap() {
    var root = $('[data-world-map]');
    if (!root) return;
    var frame = $('.world-frame', root);
    if (!frame) return;

    var data = window.WORLD_MAP;
    if (!data) {
      frame.innerHTML = '<p class="empty-state">Map unavailable.</p>';
      return;
    }

    // Author metadata comes from the page's own list.
    var meta = {};
    $$('[data-author]', root).forEach(function (li) {
      meta[li.getAttribute('data-author')] = {
        city: li.getAttribute('data-city') || '',
        affiliation: li.getAttribute('data-affiliation') || '',
        el: li
      };
    });

    var VB_W = 960;
    var parts = [];
    parts.push('<svg viewBox="' + data.viewBox + '" role="img" aria-label="' +
      'World map showing the locations of ' + data.pins.length +
      ' contributing authors">');
    parts.push('<defs><radialGradient id="pinGlow">' +
      '<stop offset="0%" stop-color="#f7b938" stop-opacity="0.55"/>' +
      '<stop offset="100%" stop-color="#f7b938" stop-opacity="0"/>' +
      '</radialGradient></defs>');
    parts.push('<path class="world-grat" d="' + data.graticule + '"/>');
    parts.push('<path class="world-land" d="' + data.land + '"/>');

    /* Labels are two lines each and pins can sit close together (Clemson and
       Tampa are ~20px apart at this scale), so walk top-to-bottom and flip a
       label below its pin when it would clash with one already placed. */
    var placed = [];
    var pins = data.pins.slice().sort(function (a, b) { return a.y - b.y; });

    pins.forEach(function (p) {
      var m = meta[p.name] || { city: '', affiliation: '' };
      var clash = placed.some(function (q) {
        return Math.abs(q.y - p.y) < 46 && Math.abs(q.x - p.x) < 140;
      });
      placed.push(p);

      var end = p.x > VB_W - 170;
      var dx = end ? -12 : 12;
      var anchor = end ? 'end' : 'start';
      var nameY = clash ? 15 : -9;
      var cityY = clash ? 29 : 5;

      parts.push('<g class="world-pin" data-pin="' + esc(p.name) +
        '" transform="translate(' + p.x + ' ' + p.y + ')">' +
        '<circle class="glow" r="22"/>' +
        '<circle class="core" r="5"/>' +
        '<title>' + esc(p.name) + ' — ' + esc(m.affiliation) +
        (m.city ? ', ' + esc(m.city) : '') + '</title>' +
        '<text class="nm" x="' + dx + '" y="' + nameY + '" text-anchor="' + anchor +
        '">' + esc(p.name) + '</text>' +
        '<text class="ct" x="' + dx + '" y="' + cityY + '" text-anchor="' + anchor +
        '">' + esc(m.city) + '</text>' +
        '</g>');
    });

    parts.push('</svg>');
    frame.innerHTML = parts.join('');

    // Cross-highlight between the map and the by-country list.
    function setActive(name, on) {
      var g = frame.querySelector('[data-pin="' + name.replace(/"/g, '\\"') + '"]');
      if (g) g.classList.toggle('is-active', on);
      if (meta[name] && meta[name].el) {
        meta[name].el.style.color = on ? 'var(--plum-800)' : '';
      }
    }

    $$('[data-pin]', frame).forEach(function (g) {
      var name = g.getAttribute('data-pin');
      g.addEventListener('mouseenter', function () { setActive(name, true); });
      g.addEventListener('mouseleave', function () { setActive(name, false); });
    });

    Object.keys(meta).forEach(function (name) {
      var li = meta[name].el;
      li.addEventListener('mouseenter', function () { setActive(name, true); });
      li.addEventListener('mouseleave', function () { setActive(name, false); });
    });
  }

  /* -- 10. podcast player -------------------------------------------------- */

  /**
   * Podcast cards, three in a row.
   *
   * Each card is its own click-to-load facade: the YouTube iframe is created
   * only when that card's play button is pressed, so the page loads nothing
   * from YouTube — and sets no third-party cookies — until a visitor asks.
   * Playing one card returns any other to its thumbnail, so two videos can
   * never play at once.
   */
  function initPodcast() {
    var root = $('[data-podcast]');
    if (!root) return;

    var cards = $$('[data-pod]', root).map(function (btn) {
      return { btn: btn, media: btn.parentNode, thumb: btn.outerHTML };
    });

    function reset(card) {
      if (card.media.querySelector('iframe') === null) return;
      card.media.innerHTML = card.thumb;
      bind(card, card.media.querySelector('[data-pod]'));
    }

    function play(card, btn) {
      // Only one player at a time.
      cards.forEach(function (c) { if (c !== card) reset(c); });

      var frame = document.createElement('iframe');
      frame.src = 'https://www.youtube-nocookie.com/embed/' +
        btn.getAttribute('data-yt') + '?autoplay=1&rel=0';
      frame.title = btn.getAttribute('data-title');
      frame.allow = 'accelerometer; autoplay; clipboard-write; ' +
        'encrypted-media; gyroscope; picture-in-picture; web-share';
      frame.allowFullscreen = true;
      card.media.innerHTML = '';
      card.media.appendChild(frame);
    }

    function bind(card, btn) {
      if (!btn) return;
      card.btn = btn;

      var img = btn.querySelector('img');
      if (img) {
        img.addEventListener('error', function () {
          // Not every video has every thumbnail size; degrade once.
          if (img.getAttribute('data-fallback')) return;
          img.setAttribute('data-fallback', '1');
          img.src = 'https://i.ytimg.com/vi/' +
            btn.getAttribute('data-yt') + '/mqdefault.jpg';
        });
      }

      btn.addEventListener('click', function () { play(card, btn); });
    }

    cards.forEach(function (c) { bind(c, c.btn); });
  }

  /* -- 11. blog post expand ------------------------------------------------ */

  function initPostToggles() {
    $$('[data-post-toggle]').forEach(function (btn) {
      var body = document.getElementById(btn.getAttribute('aria-controls'));
      if (!body) return;
      var labelOpen = btn.getAttribute('data-label-open') || 'Read the post';
      var labelClose = btn.getAttribute('data-label-close') || 'Close';

      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', open ? 'false' : 'true');
        body.hidden = open;
        $('[data-toggle-label]', btn).textContent = open ? labelOpen : labelClose;
        if (open) {
          btn.scrollIntoView({ block: 'nearest', behavior: prefersReduced ? 'auto' : 'smooth' });
        }
      });
    });
  }

  /* -- 12. contact form ---------------------------------------------------- */

  /**
   * No form backend on this host, so submitting composes a prefilled mailto:.
   * Replace this handler with a fetch() when an endpoint exists — the field
   * names are already sensible.
   */
  function initContactForm() {
    var form = $('[data-contact-form]');
    if (!form) return;

    // Event detail pages link here as contact.html?subject=<option>, so the
    // enquiry arrives pre-categorised. Unknown values are simply ignored.
    try {
      var want = new URLSearchParams(location.search).get('subject');
      if (want && form.elements.subject) {
        var opts = Array.prototype.slice.call(form.elements.subject.options);
        if (opts.some(function (o) { return o.value === want; })) {
          form.elements.subject.value = want;
        }
      }
    } catch (e) { /* URLSearchParams missing: fine, default stays */ }
    var ok = $('[data-form-ok]');
    var to = form.getAttribute('data-mailto');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }

      var f = form.elements;
      var lines = [
        'Name: ' + f.name.value,
        'Email: ' + f.email.value
      ];
      if (f.organisation.value) lines.push('Organisation: ' + f.organisation.value);
      lines.push('', f.message.value);

      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent('[' + f.subject.value + '] ' + f.name.value) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      if (ok) ok.classList.add('is-shown');
    });
  }


  /* -- 13. nav submenus ---------------------------------------------------- */

  /**
   * Desktop dropdown for nav items that have children.
   *
   * The parent is a real link, so this only *adds* behaviour: hovering opens
   * the submenu, and clicking the parent opens it rather than navigating when
   * the submenu is closed (a second click follows the link). Escape closes.
   */
  function initNavSubmenus() {
    var parents = $$('[data-nav-parent]');
    if (!parents.length) return;

    function closeAll(except) {
      parents.forEach(function (p) {
        if (p === except) return;
        p.classList.remove('is-open');
        var a = $('a', p);
        if (a) a.setAttribute('aria-expanded', 'false');
      });
    }

    parents.forEach(function (p) {
      var link = $('a', p);

      p.addEventListener('mouseenter', function () {
        closeAll(p);
        p.classList.add('is-open');
        if (link) link.setAttribute('aria-expanded', 'true');
      });
      p.addEventListener('mouseleave', function () {
        p.classList.remove('is-open');
        if (link) link.setAttribute('aria-expanded', 'false');
      });

      // Keyboard / touch: first activation opens, second follows the link.
      if (link) {
        link.addEventListener('click', function (e) {
          if (!p.classList.contains('is-open')) {
            e.preventDefault();
            closeAll(p);
            p.classList.add('is-open');
            link.setAttribute('aria-expanded', 'true');
          }
        });
      }
      p.addEventListener('focusin', function () {
        closeAll(p);
        p.classList.add('is-open');
        if (link) link.setAttribute('aria-expanded', 'true');
      });
      p.addEventListener('focusout', function (e) {
        if (!p.contains(e.relatedTarget)) {
          p.classList.remove('is-open');
          if (link) link.setAttribute('aria-expanded', 'false');
        }
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeAll(null);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('[data-nav-parent]')) closeAll(null);
    });
  }

  /* -- 14. cohort group picker --------------------------------------------- */

  /**
   * Cohort page: the founding team is a plain grid, and every other group is a
   * carousel shown one at a time. A <select> drives it on narrow screens and a
   * chip row on wide ones; both stay in sync.
   */
  function initCohortPicker() {
    var root = $('[data-cohort-picker]');
    if (!root) return;

    var select = $('[data-cohort-select]', root);
    var tabs = $$('[data-cohort-tab]', root);
    var panels = $$('.cohort-panel');
    if (!panels.length) return;

    function show(id) {
      panels.forEach(function (p) { p.hidden = p.id !== id; });
      tabs.forEach(function (t) {
        t.setAttribute('aria-selected',
          t.getAttribute('data-cohort-tab') === id ? 'true' : 'false');
      });
      if (select && select.value !== id) select.value = id;

      // Carousels measure themselves on build; a panel that was hidden then
      // had zero width, so tell it to re-measure now that it is visible.
      var c = $('[data-carousel]', document.getElementById(id));
      if (c) c.dispatchEvent(new CustomEvent('phcco:refresh'));
    }

    if (select) {
      select.addEventListener('change', function () { show(select.value); });
    }
    tabs.forEach(function (t) {
      t.addEventListener('click', function () {
        show(t.getAttribute('data-cohort-tab'));
      });
    });

    // Deep link: cohort.html#cohort-sip-2025 opens that group.
    var hash = location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) show(hash);
  }

  /* -- 15. photo lightbox --------------------------------------------------- */

  /**
   * Album lightbox. Built on demand, so a visitor who never opens a photo pays
   * nothing for it. Arrow keys move, Escape closes, and focus returns to the
   * tile that opened it.
   */
  function initLightbox() {
    var grid = $('[data-lightbox]');
    if (!grid) return;

    var tiles = $$('.ph-open', grid);
    if (!tiles.length) return;

    var box = null;
    var imgEl = null;
    var capEl = null;
    var posEl = null;
    var index = 0;
    var opener = null;
    var prevOverflow = '';

    function build() {
      box = document.createElement('div');
      box.className = 'lightbox';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-label', 'Photo viewer');
      box.innerHTML =
        '<button class="lb-close" type="button" aria-label="Close">' +
          svg('<path d="M6 6l12 12M18 6 6 18"/>') + '</button>' +
        '<button class="lb-nav lb-prev" type="button" aria-label="Previous photo">' +
          svg('<path d="M15 6l-6 6 6 6"/>') + '</button>' +
        '<figure class="lb-figure">' +
          '<img alt="">' +
          '<figcaption><span class="cap"></span><span class="pos"></span></figcaption>' +
        '</figure>' +
        '<button class="lb-nav lb-next" type="button" aria-label="Next photo">' +
          svg('<path d="M9 6l6 6-6 6"/>') + '</button>';
      document.body.appendChild(box);

      imgEl = $('img', box);
      capEl = $('.cap', box);
      posEl = $('.pos', box);

      $('.lb-close', box).addEventListener('click', close);
      $('.lb-prev', box).addEventListener('click', function () { go(index - 1); });
      $('.lb-next', box).addEventListener('click', function () { go(index + 1); });
      box.addEventListener('click', function (e) {
        // Clicking the backdrop (not the photo or a control) closes.
        if (e.target === box || e.target.classList.contains('lb-figure')) close();
      });
    }

    function go(i) {
      index = (i + tiles.length) % tiles.length;
      var t = tiles[index];
      imgEl.src = t.getAttribute('data-full');
      imgEl.alt = t.getAttribute('data-caption') || '';
      capEl.textContent = t.getAttribute('data-caption') || '';
      posEl.textContent = (index + 1) + ' / ' + tiles.length;
    }

    function open(i, from) {
      if (!box) build();
      opener = from || null;
      prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      box.classList.add('is-open');
      go(i);
      $('.lb-close', box).focus();
    }

    function close() {
      if (!box) return;
      box.classList.remove('is-open');
      document.body.style.overflow = prevOverflow;
      if (opener) opener.focus();
    }

    tiles.forEach(function (t, i) {
      t.addEventListener('click', function () { open(i, t); });
    });

    document.addEventListener('keydown', function (e) {
      if (!box || !box.classList.contains('is-open')) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(index - 1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); go(index + 1); }
    });
  }

  /* -- boot ---------------------------------------------------------------- */

  onReady(function () {
    initNav();
    initHero();
    initCardCarousels();
    initFilters();
    initTabs();
    initIndiaMap();
    initWorldMap();
    initPodcast();
    initPostToggles();
    initContactForm();
    initNavSubmenus();
    initCohortPicker();
    initLightbox();
    // Reveal last: the maps and filters have already injected their markup, so
    // nothing gets observed before it exists.
    initReveal();
  });

  // Expose the icon helper for inline use if ever needed.
  window.PHCCO = { icon: svg, ICON: ICON };
})();
