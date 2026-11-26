(() => {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!window.gsap || !window.ScrollTrigger) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  if (reduceMotion) {
    document.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-revealed'));
    const rail = document.createElement('span');
    rail.className = 'steps__rail';
    rail.innerHTML = '<i style="transform:scaleX(1)"></i>';
    const steps = document.querySelector('.steps');
    if (steps) steps.prepend(rail);
    return;
  }

  const steps = document.querySelector('.steps');
  if (steps) {
    const rail = document.createElement('span');
    rail.className = 'steps__rail';
    rail.innerHTML = '<i></i>';
    steps.prepend(rail);
    gsap.to(rail.firstElementChild, {
      scaleX: 1,
      ease: 'none',
      scrollTrigger: { trigger: steps, start: 'top 82%', end: 'bottom 58%', scrub: 0.6 }
    });
  }

  document.querySelectorAll('[data-reveal-stagger]').forEach(group => {
    if (group.closest('.hero')) return;
    const children = Array.from(group.children).filter(el => el.hasAttribute('data-reveal'));
    if (!children.length) return;
    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.72,
      stagger: 0.09,
      ease: 'power3.out',
      scrollTrigger: { trigger: group, start: 'top 88%', once: true }
    });
  });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    if (el.closest('.hero') || el.closest('[data-reveal-stagger]')) return;
    gsap.to(el, {
      opacity: 1,
      y: 0,
      duration: 0.72,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 90%', once: true }
    });
  });

  const heroCopy = ['.hero .eyebrow', '.hero h1', '.hero .lede', '.hero-cta'].join(',');
  gsap.fromTo(heroCopy,
    { opacity: 0, y: 20 },
    { opacity: 1, y: 0, duration: 0.85, stagger: 0.1, ease: 'power3.out', delay: 0.12, clearProps: 'transform' }
  );
  gsap.to('.hero-facts > div', {
    opacity: 1,
    y: 0,
    duration: 0.7,
    stagger: 0.08,
    ease: 'power3.out',
    delay: 0.7
  });
})();
