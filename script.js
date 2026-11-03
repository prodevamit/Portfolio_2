(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var root = document.documentElement;
  var lenis = null;

  /* Smooth scrolling with inertia; falls back to native smooth scroll if the library does not load. */
  if (window.Lenis && !reduce) {
    try {
      lenis = new Lenis({ duration: 1.1, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); } });
      var loop = function (time) { lenis.raf(time); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
    } catch (e) { lenis = null; }
  }

  /* Anchor links */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!a) return;
    var id = a.getAttribute('href').slice(1);
    var target = id === 'top' ? null : document.getElementById(id);
    if (id !== 'top' && !target) return;
    e.preventDefault();
    var offset = -(document.querySelector('.bar').offsetHeight + 8);
    if (lenis) {
      lenis.scrollTo(target || 0, { offset: target ? offset : 0, duration: 1.4 });
    } else if (target) {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    }
  });

  /* Scroll progress */
  var bar = document.getElementById('progress');
  var ticking = false;
  function updateProgress() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(updateProgress); }
  }, { passive: true });
  window.addEventListener('resize', updateProgress);
  updateProgress();

  /* Active nav link */
  var links = {};
  document.querySelectorAll('a.nl').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var navIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
          if (links[en.target.id]) links[en.target.id].setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['work', 'about', 'contact'].forEach(function (id) {
      var s = document.getElementById(id); if (s) navIO.observe(s);
    });
  }

  /* Reveal on scroll: only elements below the fold are dimmed, and they are never fully hidden */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    document.querySelectorAll('.reveal').forEach(function (el, i) {
      if (el.getBoundingClientRect().top > window.innerHeight * 0.92) {
        el.classList.add('pre');
        io.observe(el);
      }
    });
  }

  /* Hero name: letters gain weight near the pointer */
  var nameEl = document.getElementById('name');
  var letters = [];
  var idx = 0;
  nameEl.querySelectorAll('.line').forEach(function (line) {
    var text = line.getAttribute('data-text') || '';
    var dot = line.querySelector('.dot');
    line.textContent = '';
    text.split('').forEach(function (c) {
      var s = document.createElement('span');
      s.className = 'ch'; s.textContent = c; s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', idx++);
      line.appendChild(s); letters.push(s);
    });
    if (dot) { dot.setAttribute('aria-hidden', 'true'); line.appendChild(dot); }
  });

  if (!reduce) {
    var BASE = 420, MAX = 800, cur = letters.map(function () { return BASE; });
    var pt = null, raf = 0;
    var tick = function () {
      var rects = letters.map(function (el) { return el.getBoundingClientRect(); });
      var R = Math.max(150, window.innerWidth * 0.2), moving = false;
      letters.forEach(function (el, i) {
        var target = BASE;
        if (pt) {
          var r = rects[i];
          var d = Math.hypot(pt.x - (r.left + r.width / 2), pt.y - (r.top + r.height / 2));
          target = BASE + (MAX - BASE) * Math.max(0, 1 - d / R);
        }
        cur[i] += (target - cur[i]) * 0.14;
        if (Math.abs(target - cur[i]) > 0.5) moving = true;
        el.style.setProperty('--w', cur[i].toFixed(1));
      });
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    var kick = function () { if (!raf) raf = requestAnimationFrame(tick); };
    var hero = document.getElementById('hero');
    hero.addEventListener('pointermove', function (e) { pt = { x: e.clientX, y: e.clientY }; kick(); });
    hero.addEventListener('pointerleave', function () { pt = null; kick(); });
    hero.addEventListener('pointercancel', function () { pt = null; kick(); });
  }

  /* Live clock for working hours (IST) */
  var live = document.getElementById('live'), liveText = document.getElementById('live-text');
  function clock() {
    try {
      var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
      var h = 0, m = 0;
      parts.forEach(function (p) { if (p.type === 'hour') h = parseInt(p.value, 10) % 24; if (p.type === 'minute') m = parseInt(p.value, 10); });
      var t = ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
      var open = h >= 10 && h < 18;
      live.classList.toggle('on', open);
      liveText.textContent = t + ' IST · ' + (open ? 'online now' : 'back at 10:00');
    } catch (e) {}
  }
  clock(); setInterval(clock, 30000);

  /* Theme toggle */
  var themeBtn = document.getElementById('theme');
  function effective() {
    var a = root.getAttribute('data-theme');
    if (a) return a;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  themeBtn.addEventListener('click', function () {
    root.setAttribute('data-theme', effective() === 'dark' ? 'light' : 'dark');
  });

  /* Copy email */
  var copyBtn = document.getElementById('copy'), emailEl = document.getElementById('email');
  copyBtn.addEventListener('click', function () {
    var text = emailEl.textContent, label;
    function done(ok) {
      copyBtn.textContent = ok ? 'Copied' : 'Selected, press copy';
      clearTimeout(copyBtn._t);
      copyBtn._t = setTimeout(function () { copyBtn.textContent = 'Copy address'; }, 2200);
    }
    function fallback() {
      var ok = false;
      try {
        var range = document.createRange(); range.selectNodeContents(emailEl);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        ok = document.execCommand('copy');
      } catch (e) {}
      done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, fallback);
    } else { fallback(); }
  });
})();
