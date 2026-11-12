/* Shared motion engine for the local demo sites (2026-11-10).
   Needs GSAP 3 + ScrollTrigger + Lenis loaded first (see each site's index.html).
   There is no motion button (owner 2026-11-10: "remove the motion button"). Visitors whose phone or computer is set
   to reduce motion get the calm version (accessibility; restaurant sites are the most-sued kind). A link with
   ?motion=full forces full motion for the rest of the visit (the owner's PC reports reduced motion), and
   ?motion=calm shows the calm version on any device. Nothing here adds hover effects (owner rule). */
(function () {
  const root = document.documentElement;
  const KEY = 'demo-motion';
  const asked = new URLSearchParams(location.search).get('motion');
  if (asked === 'full' || asked === 'calm') { try { sessionStorage.setItem(KEY, asked); } catch (e) {} }
  let kept = asked; if (!kept) { try { kept = sessionStorage.getItem(KEY); } catch (e) {} }
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let motion = kept === 'full' ? true : kept === 'calm' ? false : !reduce;
  root.dataset.motion = motion ? 'on' : 'off';

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.querySelector('[data-motion-toggle]');
    if (btn) {
      const label = () => { btn.textContent = motion ? 'Motion on' : 'Motion off'; btn.setAttribute('aria-pressed', String(motion)); };
      label();
      btn.addEventListener('click', () => {
        motion = !motion; root.dataset.motion = motion ? 'on' : 'off';
        try { sessionStorage.setItem(KEY, motion ? 'on' : 'off'); } catch (e) {}
        label(); location.reload();
      });
    }
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    let lenis = null;
    if (motion && window.Lenis) {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
    window.demoLenis = lenis;

    document.querySelectorAll('[data-sequence]').forEach((el) => sequence(el, motion));
    if (!motion) { document.querySelectorAll('[data-reveal]').forEach((e) => e.style.opacity = 1); return; }

    // Parallax layers: data-depth="-0.3" moves up as you scroll past its section, positive moves down.
    document.querySelectorAll('[data-depth]').forEach((el) => {
      const d = parseFloat(el.dataset.depth) || 0;
      const sec = el.closest('section') || el.parentElement;
      gsap.to(el, { yPercent: d * 100, ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true } });
    });

    // One entrance per element that asks for it (not on every section).
    document.querySelectorAll('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 85%' } });
    });

    // Horizontal ribbons (reviews, services): move sideways with scroll, never auto-play.
    document.querySelectorAll('[data-ribbon]').forEach((el) => {
      const dir = el.dataset.ribbon === 'left' ? -1 : 1;
      gsap.fromTo(el, { xPercent: dir > 0 ? -18 : 0 }, { xPercent: dir > 0 ? 0 : -18, ease: 'none',
        scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    if (typeof window.siteMotion === 'function') window.siteMotion({ gsap, ScrollTrigger, lenis });
  });

  /* Image sequence on a canvas, scrubbed by scroll while its section is pinned.
     <section data-sequence data-src="frames/f_{i}.webp" data-count="120" data-pad="3" data-length="250">
       <canvas></canvas> ...
     data-length = how many % of the viewport the pin lasts. Reduced motion: shows the last frame. */
  function sequence(sec, motion) {
    const canvas = sec.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const n = parseInt(sec.dataset.count, 10);
    const pad = parseInt(sec.dataset.pad || '3', 10);
    const src = (i) => sec.dataset.src.replace('{i}', String(i + 1).padStart(pad, '0'));
    const imgs = new Array(n);
    let current = motion ? 0 : n - 1;
    const fit = sec.dataset.fit || 'cover';

    function draw(i) {
      const img = imgs[i];
      if (!img || !img.complete || !img.naturalWidth) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr); }
      const s = fit === 'contain' ? Math.min(w / img.naturalWidth, h / img.naturalHeight) : Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
    }
    function load(i) {
      if (imgs[i]) return imgs[i];
      const im = new Image(); im.decoding = 'async'; im.src = src(i);
      im.onload = () => { if (i === current) draw(i); };
      imgs[i] = im; return im;
    }
    load(current);
    // Load the rest after the first frame, in an order that fills gaps quickly (every 8th, then every 4th, ...).
    const order = [];
    for (let step = 8; step >= 1; step = step / 2) for (let i = 0; i < n; i += step) if (!order.includes(i)) order.push(i);
    let k = 0; (function next() { const end = Math.min(k + 6, order.length); for (; k < end; k++) load(order[k]); if (k < order.length) setTimeout(next, 60); })();
    window.addEventListener('resize', () => draw(current));
    if (!motion) return;
    const state = { f: 0 };
    gsap.to(state, { f: n - 1, ease: 'none', snap: 'f',
      scrollTrigger: { trigger: sec, start: 'top top', end: '+=' + (sec.dataset.length || 250) + '%', scrub: 0.4, pin: true, anticipatePin: 1 },
      onUpdate: () => { const i = Math.round(state.f); if (i !== current) { current = i; if (imgs[i] && imgs[i].complete) draw(i); else load(i); } } });
  }
})();
