(() => {
  const year = document.getElementById('yr');
  if (year) year.textContent = String(new Date().getFullYear());

  const burger = document.getElementById('burger');
  const navlinks = document.getElementById('navlinks');
  if (burger && navlinks) {
    const close = () => {
      navlinks.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
    };
    burger.addEventListener('click', () => {
      const open = !navlinks.classList.contains('is-open');
      navlinks.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
    });
    navlinks.addEventListener('click', event => {
      if (event.target.closest('a')) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });
    window.addEventListener('resize', () => {
      if (window.innerWidth > 1000) close();
    });
  }

  const preloader = document.querySelector('[data-preloader]');
  if (preloader) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      preloader.classList.add('is-done');
    };
    window.addEventListener('load', finish);
    setTimeout(finish, 1400);
  }
})();
