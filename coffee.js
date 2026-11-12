/* Version 2 opening: coffee and chocolates (v2.html only; loaded after site.js, before engine.js).
   The page scrolls normally (no pin). As the opening leaves, the photo drifts closer to the chocolates and moves a
   little slower than the page, and the sign slides away faster, so the table reads as deeper than the sign.
   The calm version (reduced motion) never calls siteMotion, so nothing here moves. */
(function () {
  'use strict';
  const base = window.siteMotion;
  window.siteMotion = (ctx) => {
    if (typeof base === 'function') base(ctx);
    const { gsap } = ctx;
    const stage = document.querySelector('.cof-stage');
    if (!stage) return;
    const st = () => ({ trigger: stage, start: 'top top', end: 'bottom top', scrub: true, invalidateOnRefresh: true });
    gsap.fromTo('[data-cof-zoom]', { scale: 1, yPercent: 0 }, { scale: 1.2, yPercent: 10, ease: 'none', scrollTrigger: st() });
    gsap.fromTo('[data-cof-plate]', { y: 0 }, { y: () => -stage.offsetHeight * 0.32, ease: 'none', scrollTrigger: st() });
    gsap.fromTo('[data-cof-copy]', { y: 0 }, { y: () => -stage.offsetHeight * 0.1, ease: 'none', scrollTrigger: st() });
  };
})();
