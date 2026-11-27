(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));

  if (!window.gsap || !window.ScrollTrigger) {
    reveals.forEach(el => el.classList.add('is-revealed'));
    return;
  }
  gsap.registerPlugin(ScrollTrigger);

  if (reduceMotion) {
    reveals.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  // ── Default reveal — clip-path slide up, not plain opacity/Y ──────────────
  reveals.forEach(el => {
    if (el.closest('.chapter--hero') || el.closest('[data-reveal-group]')) return;
    gsap.fromTo(el,
      { opacity: 0, y: 28, clipPath: 'inset(0 0 12% 0)' },
      {
        opacity: 1,
        y: 0,
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      }
    );
  });

  // ── Staggered groups (ruled lists etc.) ───────────────────────────────────
  document.querySelectorAll('[data-reveal-group]').forEach(group => {
    const children = Array.from(group.children).filter(c => c.hasAttribute('data-reveal'));
    if (!children.length) return;
    gsap.fromTo(children,
      { opacity: 0, x: -18, clipPath: 'inset(0 0 0 8%)' },
      {
        opacity: 1,
        x: 0,
        clipPath: 'inset(0 0 0 0%)',
        duration: 0.9,
        stagger: { each: 0.14, ease: 'power2.inOut' },
        ease: 'expo.out',
        scrollTrigger: { trigger: group, start: 'top 88%', once: true }
      }
    );
  });

  // ── Hero — cinematic entrance ──────────────────────────────────────────────
  const heroEyebrow = document.querySelector('.hero-eyebrow');
  if (heroEyebrow) {
    gsap.fromTo(heroEyebrow,
      { opacity: 0, y: -10 },
      { opacity: 1, y: 0, duration: 0.8, ease: 'power2.out', delay: 0.25 }
    );
  }

  const heroHeading = document.querySelector('.chapter--hero h1');
  if (heroHeading) {
    // Explicitly reveal parent h1 so word-inner is visible
    gsap.set(heroHeading, { opacity: 1, transform: 'none' });

    const rawText = heroHeading.innerHTML;
    const words = rawText.split(/(\s+)/);
    heroHeading.innerHTML = words.map(w =>
      /\s+/.test(w) ? w :
      `<span class="word-mask" style="display:inline-block;overflow:hidden;vertical-align:bottom">` +
      `<span class="word-inner" style="display:inline-block">${w}</span></span>`
    ).join('');

    const inners = heroHeading.querySelectorAll('.word-inner');
    gsap.fromTo(inners,
      { y: '110%', rotateX: 18, opacity: 0 },
      {
        y: '0%',
        rotateX: 0,
        opacity: 1,
        duration: 1.0,
        stagger: { each: 0.06, ease: 'power2.inOut' },
        ease: 'expo.out',
        delay: 0.35,
        transformOrigin: '0% 100%',
        force3D: true
      }
    );
  }

  const heroSecondary = Array.from(document.querySelectorAll(
    '.chapter--hero .lede, .chapter--hero .cta-row, .chapter--hero .credential-line'
  ));
  if (heroSecondary.length) {
    gsap.fromTo(heroSecondary,
      { opacity: 0, y: 20 },
      {
        opacity: 1,
        y: 0,
        duration: 0.85,
        stagger: 0.12,
        ease: 'power3.out',
        delay: 0.65
      }
    );
  }

  // ── Chapter headings — large text gets a horizontal scrub reveal ──────────
  document.querySelectorAll('.chapter:not(.chapter--hero) h2').forEach(heading => {
    gsap.fromTo(heading,
      { opacity: 0, x: -32, skewX: 1.5 },
      {
        opacity: 1,
        x: 0,
        skewX: 0,
        duration: 1.1,
        ease: 'expo.out',
        scrollTrigger: { trigger: heading, start: 'top 88%', once: true }
      }
    );
  });

  // ── Gallery horizontal scroll ──────────────────────────────────────────────
  const gallery = document.querySelector('[data-gallery]');
  if (gallery) {
    const track = gallery.querySelector('.gallery__track');
    const distance = () => Math.max(0, track.scrollWidth - gallery.clientWidth);
    if (distance() > 0) {
      gsap.to(track, {
        x: () => -distance(),
        ease: 'none',
        scrollTrigger: {
          trigger: gallery.closest('.chapter'),
          start: 'top top',
          end: () => '+=' + Math.round(window.innerHeight * 1.1),
          pin: true,
          scrub: 1.6,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
    }
  }

  // ── Chapter rail fade in ───────────────────────────────────────────────────
  const rail = document.getElementById('chapterRail');
  if (rail) {
    gsap.fromTo(rail,
      { opacity: 0, y: 12 },
      { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 1.2 }
    );
  }

  // ── Finish UI fade in ──────────────────────────────────────────────────────
  const finishUI = document.getElementById('finishUI');
  if (finishUI) {
    gsap.fromTo(finishUI,
      { opacity: 0, y: 10 },
      { opacity: 1, y: 0, duration: 1.0, ease: 'power3.out', delay: 1.4 }
    );
  }
})();
