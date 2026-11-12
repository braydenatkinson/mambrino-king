/* Mambrino King: the room's motion rule, its light, and the open/closed line. Runs on every page (the homepage loads it
   in <head>, menukit adds it to the menu and dish pages).
   Motion: the same rule as assets/engine.js: calm for visitors whose device asks for reduced motion; ?motion=full or
   ?motion=calm overrides it for the rest of the visit.
   Light: the room looks the way it does right now in East Aurora. From the hours in data/menu.json and the time in
   America/New_York (never the visitor's own zone): data-light="day" (open, before 16:30: window light, bulbs barely on),
   "evening" (open, after 16:30: the bulbs glowing; also the look with JavaScript off) or "closed" (the room at rest,
   bulbs at an ember). ?light=day|evening|closed forces a look for the rest of the visit, ?light=auto clears it.
   ?now=2026-11-13T22:30 pretends it is that New York wall-clock time (for testing; not kept).
   The looks themselves are all in room.css. */
(function () {
  'use strict';
  var root = document.documentElement;
  var q = new URLSearchParams(location.search);

  /* ---------- motion ---------- */
  if (!root.dataset.motion) {
    var MKEY = 'demo-motion', asked = q.get('motion'), kept = asked;
    try { if (asked === 'full' || asked === 'calm') sessionStorage.setItem(MKEY, asked); else kept = sessionStorage.getItem(MKEY); } catch (e) {}
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.dataset.motion = (kept === 'full' ? true : kept === 'calm' ? false : !reduce) ? 'on' : 'off';
  }

  /* ---------- hours ---------- */
  var DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  var NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DUSK = 16 * 60 + 30;               // after this the bulbs are what lights the room
  // A copy of data/menu.json "hours" so the light is right on first paint; the real file is read below and wins.
  var hours = { mon: null, tue: ['11:00', '21:00'], wed: ['11:00', '21:00'], thu: ['11:00', '21:00'],
    fri: ['11:00', '23:00'], sat: ['11:00', '23:00'], sun: null };

  // New York wall-clock now: { day: 0..6 (Sunday 0), min: minutes since midnight }
  function nowNY() {
    var forced = /^(\d{4})-(\d\d)-(\d\d)T(\d\d):(\d\d)/.exec(q.get('now') || '');
    if (forced) {
      var d = new Date(Date.UTC(+forced[1], +forced[2] - 1, +forced[3]));
      return { day: d.getUTCDay(), min: +forced[4] * 60 + +forced[5] };
    }
    try {
      var parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: '2-digit',
        minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
      var get = function (t) { for (var i = 0; i < parts.length; i++) if (parts[i].type === t) return parts[i].value; return ''; };
      var wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      if (wd < 0) return null;
      return { day: wd, min: (+get('hour') % 24) * 60 + +get('minute') };
    } catch (e) { return null; }
  }
  var toMin = function (s) { var m = /^(\d{1,2}):(\d\d)/.exec(s || ''); return m ? +m[1] * 60 + +m[2] : null; };
  function clock(min) {
    min = ((min % 1440) + 1440) % 1440;
    if (min === 0) return 'midnight';
    if (min === 720) return 'noon';
    var h = Math.floor(min / 60), m = min % 60, h12 = h % 12 || 12;
    return h12 + (m ? ':' + (m < 10 ? '0' : '') + m : '') + (h < 12 ? ' am' : ' pm');
  }
  // Opening spans as minutes from Sunday 00:00; a close at or before the opening time runs past midnight.
  function spans() {
    var out = [];
    for (var d = 0; d < 7; d++) {
      var h = hours[DAYS[d]];
      if (!h || h.length < 2) continue;
      var o = toMin(h[0]), c = toMin(h[1]);
      if (o === null || c === null) continue;
      if (c <= o) c += 1440;
      out.push([d * 1440 + o, d * 1440 + c]);
    }
    return out;
  }
  // { open, light, text }
  function status() {
    var n = nowNY();
    if (!n) return null;
    var t = n.day * 1440 + n.min, W = 7 * 1440, list = spans(), i, k;
    for (i = 0; i < list.length; i++) {
      for (k = -1; k <= 0; k++) {            // a span from late Saturday can run into Sunday morning
        var a = list[i][0] + k * W, b = list[i][1] + k * W;
        if (t >= a && t < b) {
          return { open: true, light: n.min >= DUSK || n.min < 5 * 60 ? 'evening' : 'day', text: 'Open now until ' + clock(b) };
        }
      }
    }
    var best = null;
    for (i = 0; i < list.length; i++) {
      var s = list[i][0]; while (s <= t) s += W;
      if (best === null || s < best) best = s;
    }
    if (best === null) return { open: false, light: 'closed', text: 'Closed now' };
    var days = Math.floor(best / 1440) - Math.floor(t / 1440), when;
    if (days === 0) when = 'today';
    else if (days === 1) when = 'tomorrow';
    else when = NAMES[Math.floor(best / 1440) % 7];
    return { open: false, light: 'closed', text: 'Closed now. Opens ' + when + ' at ' + clock(best) };
  }

  /* ---------- light ---------- */
  var LKEY = 'demo-light', LOOKS = ['day', 'evening', 'closed'];
  var forcedLight = q.get('light');
  try {
    if (LOOKS.indexOf(forcedLight) >= 0) sessionStorage.setItem(LKEY, forcedLight);
    else if (forcedLight === 'auto') { sessionStorage.removeItem(LKEY); forcedLight = null; }
    else forcedLight = sessionStorage.getItem(LKEY);
  } catch (e) { if (LOOKS.indexOf(forcedLight) < 0) forcedLight = null; }
  if (LOOKS.indexOf(forcedLight) < 0) forcedLight = null;

  function apply() {
    var st = status();
    root.dataset.light = forcedLight || (st ? st.light : 'evening');
    if (!st || document.readyState === 'loading') return;
    var places = document.querySelectorAll('.hours .hours-list, .visit .hours-list');
    for (var i = 0; i < places.length; i++) {
      var dl = places[i], line = dl.nextElementSibling;
      if (!line || !line.classList.contains('open-now')) {
        line = document.createElement('p');
        line.className = 'open-now';
        dl.parentNode.insertBefore(line, dl.nextSibling);
      }
      line.textContent = st.text + '.';
      line.dataset.open = st.open ? 'yes' : 'no';
    }
  }
  apply();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', apply);

  // the real hours from data/menu.json (the editor may have changed them since this file was written)
  var me = document.currentScript && document.currentScript.src;
  if (me && window.fetch) {
    fetch(new URL('../data/menu.json', me).href, { cache: 'no-cache' }).then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.hours) return;
        hours = j.hours;
        if (document.readyState === 'loading') return;    // the DOMContentLoaded call above will use them
        apply();
      }).catch(function () {});
  }
  // keep it right if the page stays open across opening or closing time
  setInterval(apply, 60 * 1000);
  window.__light = { status: status, apply: apply };

  /* ---------- depth: the edge objects drift a few pixels against the scroll (full motion only) ----------
     Each object's resting position is measured once (on load, resize and ScrollTrigger refresh); per frame only
     window.scrollY is read and the CSS translate property written. At most 6 objects move (plus the two strings of
     bulbs, which sway in CSS). */
  function depth() {
    if (root.dataset.motion !== 'on' || !window.requestAnimationFrame) return;
    // (the waffle stays put: its photo is cropped along the side that tucks under the card's top edge)
    var picks = [['.fig', .04], ['.decor-cup', .03], ['.decor-tostada', .03],
      ['.decor-focaccia', .025], ['.winerack', .02], ['.decor-bottle', .03], ['.decor-bonbons', .025]];
    var items = [], i, j;
    for (i = 0; i < picks.length; i++) {
      var els = document.querySelectorAll(picks[i][0]);
      for (j = 0; j < els.length; j++) items.push({ el: els[j], k: picks[i][1], mid: 0, on: false });
    }
    var vh = 0, ticking = false;
    function measure() {
      vh = window.innerHeight;
      var n = 0;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        it.el.style.translate = '';
        it.on = n < 6 && getComputedStyle(it.el).display !== 'none';
        if (it.on) {
          n++; it.el.classList.add('drift');
          var r = it.el.getBoundingClientRect();
          it.mid = r.top + window.scrollY + r.height / 2;
        } else it.el.classList.remove('drift');
      }
      frame();
    }
    function frame() {
      ticking = false;
      var c = window.scrollY + vh / 2;
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it.on) continue;
        var d = (c - it.mid) * it.k;                 // the object lags the page a little: farther back than the words
        if (d > 18) d = 18; else if (d < -18) d = -18;
        it.el.style.translate = '0 ' + d.toFixed(1) + 'px';
      }
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }, { passive: true });
    window.addEventListener('resize', measure);
    measure();
    setTimeout(measure, 1500);
    if (window.ScrollTrigger) window.ScrollTrigger.addEventListener('refresh', measure);
  }
  if (document.readyState === 'complete') depth(); else window.addEventListener('load', depth);
})();
