(function () {
  'use strict';

  /* -----------------------------------------------------------------
   * Sticky header state — rAF-throttled so scroll never fires this
   * more than once per frame.
   * ------------------------------------------------------------- */
  var header = document.getElementById('siteHeader');
  if (header) {
    var ticking = false;
    var applyScrollState = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    var onScroll = function () {
      if (!ticking) {
        window.requestAnimationFrame(applyScrollState);
        ticking = true;
      }
    };
    applyScrollState();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* -----------------------------------------------------------------
   * Mobile nav toggle — closes on link click, outside click, or Escape
   * ------------------------------------------------------------- */
  var navToggle = document.getElementById('navToggle');
  var siteNav = document.getElementById('siteNav');

  function closeNav() {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute('aria-expanded', 'false');
    siteNav.classList.remove('is-open');
  }

  function openNav() {
    if (!navToggle || !siteNav) return;
    navToggle.setAttribute('aria-expanded', 'true');
    siteNav.classList.add('is-open');
  }

  if (navToggle && siteNav) {
    navToggle.addEventListener('click', function () {
      var isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      if (isOpen) {
        closeNav();
      } else {
        openNav();
      }
    });

    siteNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeNav);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeNav();
        navToggle.focus();
      }
    });
  }

  /* -----------------------------------------------------------------
   * Scrollspy — highlights whichever nav link matches the section
   * currently under the sticky header, and updates immediately on
   * click rather than waiting for the scroll to settle. The negative
   * top rootMargin (header height) is what keeps a section from
   * "counting" until it's actually clear of the sticky header, since
   * scroll-padding-top already stops there on click/anchor jumps.
   * ------------------------------------------------------------- */
  if (siteNav && 'IntersectionObserver' in window) {
    var spyLinks = siteNav.querySelectorAll('a[href^="#"]');
    var spySections = [];
    spyLinks.forEach(function (link) {
      var target = document.getElementById(link.getAttribute('href').slice(1));
      if (target) spySections.push(target);
    });

    var setActiveLink = function (id) {
      spyLinks.forEach(function (link) {
        link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
      });
    };

    if (spySections.length) {
      var headerHeight = header ? header.offsetHeight : 76;
      var spyObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            setActiveLink(entry.target.id);
          }
        });
      }, { rootMargin: '-' + (headerHeight + 1) + 'px 0px -70% 0px', threshold: 0 });

      spySections.forEach(function (section) {
        spyObserver.observe(section);
      });

      spyLinks.forEach(function (link) {
        link.addEventListener('click', function () {
          setActiveLink(link.getAttribute('href').slice(1));
        });
      });

      // The observer only fires when a section enters/leaves the tracked
      // band, so scrolling back up past the very first section (into the
      // hero, which has no nav link) never fires a new event and the last
      // section's link is left looking active even though nothing on the
      // list is actually in view. Clear it explicitly whenever we're above
      // that first section.
      var firstSection = spySections[0];
      var spyTicking = false;
      var clearIfAboveFirst = function () {
        spyTicking = false;
        if (firstSection.getBoundingClientRect().top > headerHeight + 1) {
          spyLinks.forEach(function (link) { link.classList.remove('is-active'); });
        }
      };
      window.addEventListener('scroll', function () {
        if (!spyTicking) {
          window.requestAnimationFrame(clearIfAboveFirst);
          spyTicking = true;
        }
      }, { passive: true });
      clearIfAboveFirst();
    }
  }

  /* -----------------------------------------------------------------
   * Scroll-reveal via AOS (Animate On Scroll, self-hosted in vendor/aos/,
   * loaded just before this script). AOS owns the observing/timing/stagger
   * plumbing; the actual animation values are our own transform-only CSS
   * keyed to custom data-aos names (pop-up / pop-hero-left / pop-side-left
   * / pop-side-right, see _animations.scss and _hero.scss) rather than
   * AOS's built-in fade/zoom set, which is opacity-based. Respects
   * prefers-reduced-motion via AOS's own `disable` option.
   *
   * If vendor/aos/aos.js fails to load for any reason (e.g. a broken
   * deploy that drops the vendor/ folder), `window.AOS` won't exist —
   * fall back to revealing everything immediately rather than leaving
   * content translated off-screen forever with nothing left to trigger
   * the reveal.
   * ------------------------------------------------------------- */
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (window.AOS) {
    window.AOS.init({
      duration: 1100,
      easing: 'ease-out-quart',
      once: true,
      offset: 80,
      disable: function () { return prefersReducedMotion; }
    });
  } else {
    document.querySelectorAll('[data-aos]').forEach(function (el) {
      el.classList.add('aos-animate');
    });
  }

  /* -----------------------------------------------------------------
   * FAQ accordion — smooth expand/collapse instead of the native
   * <details> instant show/hide, animating the element's own height
   * with the Web Animations API. Falls back to plain native toggling
   * under prefers-reduced-motion or if Element.animate isn't
   * supported, so the accordion always works either way.
   * ------------------------------------------------------------- */
  if (!prefersReducedMotion && 'animate' in Element.prototype) {
    document.querySelectorAll('.faq-item').forEach(function (item) {
      var summary = item.querySelector('summary');
      var animation = null;
      var isClosing = false;
      var isExpanding = false;

      function onFinish(open) {
        item.open = open;
        animation = null;
        isClosing = false;
        isExpanding = false;
        item.style.height = '';
        item.style.overflow = '';
      }

      function shrink() {
        isClosing = true;
        var startHeight = item.offsetHeight + 'px';
        var endHeight = summary.offsetHeight + 'px';
        if (animation) animation.cancel();
        animation = item.animate({ height: [startHeight, endHeight] }, { duration: 250, easing: 'ease-out' });
        animation.onfinish = function () { onFinish(false); };
        animation.oncancel = function () { isClosing = false; };
      }

      function expand() {
        item.style.overflow = 'hidden';
        var startHeight = item.offsetHeight + 'px';
        item.open = true;
        window.requestAnimationFrame(function () {
          isExpanding = true;
          var endHeight = (summary.offsetHeight + item.querySelector('.faq-answer').offsetHeight) + 'px';
          if (animation) animation.cancel();
          animation = item.animate({ height: [startHeight, endHeight] }, { duration: 250, easing: 'ease-out' });
          animation.onfinish = function () { onFinish(true); };
          animation.oncancel = function () { isExpanding = false; };
        });
      }

      summary.addEventListener('click', function (event) {
        event.preventDefault();
        item.style.overflow = 'hidden';
        if (isClosing || !item.open) {
          expand();
        } else if (isExpanding || item.open) {
          shrink();
        }
      });
    });
  }

  /* -----------------------------------------------------------------
   * Reviews carousel (Slick) — jQuery + Slick are fetched off the
   * critical rendering path (after window `load`, not inline in
   * <head>), but the fetch starts immediately at that point rather
   * than waiting for the section to scroll near view.
   *
   * That scroll-proximity trigger used to be here and caused a real
   * bug: on a throttled connection, a visitor who scrolled straight to
   * the reviews and tapped "next" within the first second or two hit a
   * dead button, because Slick hadn't finished loading and the arrow's
   * click handler didn't exist yet. Loading right after `load` instead
   * gives it the entire time the visitor spends reading everything
   * above the reviews section to finish — normally seconds — instead
   * of a race started the instant they arrive. The arrow buttons below
   * are also wired as a safety net: a click before Slick is ready
   * kicks the load off immediately and queues the action.
   * ------------------------------------------------------------- */
  (function lazyLoadReviewsCarousel() {
    var track = document.querySelector('.reviews-track');
    var section = document.getElementById('reviews');
    if (!track || !section) return;

    var loaded = false;
    var readyPromise = null;

    function loadScript(src, integrity) {
      return new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = src;
        if (integrity) {
          s.integrity = integrity;
          s.crossOrigin = 'anonymous';
        }
        s.onload = resolve;
        s.onerror = reject;
        document.body.appendChild(s);
      });
    }

    function loadStylesheet(href, integrity) {
      return new Promise(function (resolve) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = href;
        if (integrity) {
          l.integrity = integrity;
          l.crossOrigin = 'anonymous';
        }
        l.onload = resolve;
        l.onerror = resolve; // don't block the carousel over a CSS 404
        document.head.appendChild(l);
      });
    }

    function initCarousel() {
      if (typeof window.jQuery === 'undefined') throw new Error('jQuery missing');
      var $ = window.jQuery;
      var $track = $(track);
      if (typeof $track.slick !== 'function') throw new Error('Slick missing');

      // Slick does its real DOM/positioning setup slightly after `.slick()`
      // returns (it defers internally), so a method call issued right away
      // — exactly the "queued click" case below — can silently no-op.
      // Binding to Slick's own `init` event, instead of assuming `.slick()`
      // is synchronous, is the documented way to know it's actually ready.
      var readyForCommands = new Promise(function (resolve) {
        $track.on('init', function () { resolve($track); });
        // No arrows at all: with exactly 3 reviews, the desktop view
        // (slidesToShow: 3) already shows every one of them at once, so a
        // "next" arrow would visibly do nothing — confusing, not broken,
        // but indistinguishable from broken to a visitor. Dots stay on for
        // the breakpoints where there's actually more than one page to
        // move between (2-up and 1-up), off where there isn't (3-up).
        $track.slick({
          dots: false,
          arrows: false,
          infinite: true,
          speed: 400,
          slidesToShow: 3,
          slidesToScroll: 1,
          adaptiveHeight: false,
          autoplay: false,
          accessibility: true,
          focusOnSelect: false,
          responsive: [
            { breakpoint: 992, settings: { slidesToShow: 2, dots: true } },
            { breakpoint: 640, settings: { slidesToShow: 1, dots: true } }
          ]
        });
      });

      return readyForCommands;
    }

    // Returns a promise that resolves once Slick is loaded AND initialised
    // on this track. Safe to call repeatedly — it only ever loads once.
    function ensureCarouselReady() {
      if (readyPromise) return readyPromise;
      loaded = true;

      // Self-hosted (vendor/slick, vendor/jquery) rather than loaded from a
      // CDN — same-origin, so no integrity/crossOrigin attributes needed
      // (those were only ever about verifying third-party content).
      readyPromise = Promise.all([
        loadStylesheet('vendor/slick/slick.min.css'),
        loadScript('vendor/jquery/jquery.min.js').then(function () {
          return loadScript('vendor/slick/slick.min.js');
        })
      ]).then(initCarousel);

      return readyPromise;
    }

    // Kick the load off proactively, well before a visitor is likely to
    // reach the reviews section, but only after the page's own critical
    // content has finished loading — so it never competes with first paint.
    function startProactiveLoad() {
      if ('requestIdleCallback' in window) {
        requestIdleCallback(function () { ensureCarouselReady().catch(function () {}); }, { timeout: 2000 });
      } else {
        setTimeout(function () { ensureCarouselReady().catch(function () {}); }, 300);
      }
    }

    if (document.readyState === 'complete') {
      startProactiveLoad();
    } else {
      window.addEventListener('load', startProactiveLoad);
    }
  })();

})();
