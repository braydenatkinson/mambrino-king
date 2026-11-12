/* Mambrino King demo: the pour.
   120 frames rendered in Blender (work/martini2.py): a creamy chocolate martini poured into their own goblet, the inside
   laced with chocolate syrup and the rim dipped in cocoa. Drawn on a canvas and scrubbed by scroll while the hero is
   pinned. On arrival the pour runs a few frames by itself so the first seconds already move. */
(function () {
  'use strict';
  const N = 120, INTRO = 12;
  const src = (i) => `assets/pour/f_${String(i + 1).padStart(3, '0')}.webp`;
  const q = new URLSearchParams(location.search);
  const still = q.get('still') === '1';
  const stillFrame = Math.max(0, Math.min(N - 1, (parseInt(q.get('f') || '1', 10) || 1) - 1));
  if (still) document.documentElement.classList.add('still');

  // calm version (reduced motion): no pin and no scrub, the glass is shown already poured
  const calm = () => document.documentElement.dataset.motion === 'off';
  const imgs = new Array(N);
  let canvas, ctx, drawn = -1, want = still ? stillFrame : 0;
  const ready = (i) => { const im = imgs[i]; return im && im.complete && im.naturalWidth; };
  function draw(i) {
    want = i;
    let j = i;
    if (!ready(j)) { for (let d = 1; d < N; d++) { if (j - d >= 0 && ready(j - d)) { j = j - d; break; } } if (!ready(j)) return; }
    if (j === drawn) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgs[j], 0, 0, canvas.width, canvas.height);
    drawn = j;
  }
  function load(i) {
    if (imgs[i]) return;
    const im = new Image(); im.decoding = 'async'; im.src = src(i);
    im.onload = () => { if (i <= want) { drawn = -1; draw(want); } };
    imgs[i] = im;
  }

  document.addEventListener('DOMContentLoaded', () => {
    canvas = document.querySelector('[data-pour-canvas]');
    if (!canvas) return;
    ctx = canvas.getContext('2d');
    if (!still && calm()) { want = N - 1; load(want); return; }
    load(want);
    // the opening frames first, then every 8th, 4th, 2nd, then the rest
    const order = [];
    for (let k = 0; k <= INTRO + 4; k++) order.push(k);
    for (const step of [8, 4, 2, 1]) for (let k = 0; k < N; k += step) if (!order.includes(k)) order.push(k);
    let n = 0; (function next() { const end = Math.min(n + 8, order.length); for (; n < end; n++) load(order[n]); if (n < order.length) setTimeout(next, 30); })();
    window.__pour = { draw, loaded: () => imgs.slice(0, INTRO + 1).every((im) => im && im.complete) };
  });

  window.siteMotion = ({ gsap, ScrollTrigger, lenis }) => {
    if (still) { window.__pour.draw(stillFrame); return; }
    let cur = 0, target = 0, prog = 0;
    const intro = { f: 0 };
    const setTarget = () => { target = Math.max(intro.f, prog * (N - 1)); };
    const t0 = performance.now();
    (function hello() {
      if (window.scrollY > 4) return;
      if (!window.__pour.loaded() && performance.now() - t0 < 3000) { setTimeout(hello, 80); return; }
      gsap.to(intro, { f: INTRO, duration: 1.4, delay: .25, ease: 'power1.inOut', onUpdate: setTarget });
    })();

    const mm = gsap.matchMedia();
    mm.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)', tall: '(min-height: 600px)' }, (c) => {
      const len = c.conditions.wide ? 200 : 150;
      const st = ScrollTrigger.create(c.conditions.tall ? {
        trigger: '[data-hero] .hero-stage', start: 'top top', end: '+=' + len + '%', pin: true, scrub: true, anticipatePin: 1,
        invalidateOnRefresh: true, onUpdate: (s) => { prog = s.progress; setTarget(); },
      } : {
        trigger: '[data-hero] .hero-stage', start: 'top top', end: 'bottom 30%', scrub: true, invalidateOnRefresh: true,
        onUpdate: (s) => { prog = s.progress; setTarget(); },
      });
      return () => st.kill();
    });

    // arriving: you walk in under their awning, so it rises and comes a little closer over the first third of a screen
    const aw = document.querySelector('.awning');
    if (aw) gsap.fromTo(aw, { yPercent: 0, scale: 1 }, { yPercent: -112, scale: 1.16, ease: 'none',
      scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: '+=38%', scrub: true } });

    gsap.ticker.add(() => {
      cur += (target - cur) * 0.28;
      if (Math.abs(target - cur) < 0.02) cur = target;
      window.__pour.draw(Math.round(cur));
    });

    // reviews: on wide screens they move sideways with the scroll, far enough to read every one (the move ends at the
    // page bottom, since the ribbon sits just above the short footer). On phones that was ~3 px sideways per 1 px of
    // scroll, so there the row is a plain swipe row instead (CSS scroll-snap, no scroll-linked motion).
    const rib = document.querySelector('[data-ribbon-full]');
    if (rib) mm.add('(min-width: 900px)', () => {
      const tw = gsap.fromTo(rib, { x: 0 }, { x: () => -Math.max(0, rib.scrollWidth - window.innerWidth * 0.92), ease: 'none',
        scrollTrigger: { trigger: '.voices', start: 'top bottom', end: () => ScrollTrigger.maxScroll(window), scrub: true, invalidateOnRefresh: true } });
      return () => { tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(rib, { clearProps: 'transform' }); };
    });
    // the kitchen clip plays only while it is on screen, unless the visitor paused it (its button is set up below)
    const vid = document.querySelector('.clip video');
    if (vid) new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { if (!vid.dataset.userPaused) { vid.preload = 'auto'; vid.play().catch(() => {}); } } else vid.pause(); }), { threshold: 0.3 }).observe(vid);

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]'); if (!a || !lenis) return;
      const el = document.querySelector(a.getAttribute('href')); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el);
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    ScrollTrigger.refresh();
  };

  // A looping video needs a way to stop it (accessibility). In the calm version it never starts by itself.
  document.addEventListener('DOMContentLoaded', () => {
    const vid = document.querySelector('.clip video'), btn = document.querySelector('[data-clip-btn]');
    if (!vid || !btn) return;
    const label = () => { btn.textContent = vid.paused ? 'Play video' : 'Pause video'; };
    vid.addEventListener('play', label); vid.addEventListener('pause', label); label();
    btn.addEventListener('click', () => {
      if (vid.paused) { delete vid.dataset.userPaused; vid.preload = 'auto'; vid.play().catch(() => {}); }
      else { vid.dataset.userPaused = '1'; vid.pause(); }
    });
  });
})();
