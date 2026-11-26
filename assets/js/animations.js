(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const reveals = Array.from(document.querySelectorAll('[data-reveal]'));

  if (!window.gsap || !window.ScrollTrigger) {
    reveals.forEach(element => element.classList.add('is-revealed'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (reduceMotion) {
    reveals.forEach(element => element.classList.add('is-revealed'));
    return;
  }

  document.querySelectorAll('[data-reveal-group]').forEach(group => {
    const children = Array.from(group.children).filter(child => child.hasAttribute('data-reveal'));
    if (!children.length) return;
    gsap.to(children, {
      opacity: 1,
      x: 0,
      duration: 0.8,
      stagger: 0.11,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 86%', once: true }
    });
  });

  reveals.forEach(element => {
    if (element.closest('.chapter--hero') || element.closest('[data-reveal-group]')) return;
    gsap.to(element, {
      opacity: 1,
      y: 0,
      duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: { trigger: element, start: 'top 88%', once: true }
    });
  });

  const heroHeading = document.querySelector('.chapter--hero h1');
  if (heroHeading) {
    gsap.fromTo(heroHeading,
      { opacity: 0, y: 38, clipPath: 'inset(0 0 18% 0)' },
      { opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: 'power4.out', delay: 0.4 }
    );
  }
  const heroSecondary = Array.from(document.querySelectorAll('.chapter--hero .lede, .chapter--hero .cta-row, .chapter--hero .credential-line'));
  if (heroSecondary.length) {
    gsap.to(heroSecondary, { opacity: 1, y: 0, duration: 0.8, stagger: 0.12, ease: 'power3.out', delay: 0.58 });
  }

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
          end: () => '+=' + Math.round(window.innerHeight * 0.9),
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true
        }
      });
    }
  }
})();
