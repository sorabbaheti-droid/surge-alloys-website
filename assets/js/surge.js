// Surge Alloys: smooth scroll and gentle motion (Lenis + GSAP when available), logo intro, menu, hero film.
(() => {
  const d = document, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const G = window.gsap, ST = window.ScrollTrigger;

  // Logo intro: once per visit, home page only, skippable
  const intro = d.querySelector('.intro');
  if (intro) {
    let seen = false; try { seen = sessionStorage.getItem('surge-intro') === '1'; } catch (e) {}
    const close = () => { if (!intro.isConnected) return; intro.classList.add('out'); setTimeout(() => intro.remove(), 550); try { sessionStorage.setItem('surge-intro', '1'); } catch (e) {} };
    if (seen || reduce) intro.remove();
    else { const v = intro.querySelector('video'); v.addEventListener('ended', close); v.play().catch(close); setTimeout(close, 8000); intro.querySelector('.skipi').addEventListener('click', close); }
  }

  // Header: hairline once scrolled, tucks away when scrolling down
  const hdr = d.querySelector('.hdr'); let last = 0;
  const onScroll = () => { const y = scrollY; hdr.classList.toggle('scrolled', y > 8); hdr.classList.toggle('hide', y > 500 && y > last && !d.body.classList.contains('open')); last = y; };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Mobile menu
  const burger = d.querySelector('.burger');
  burger && burger.addEventListener('click', () => burger.setAttribute('aria-expanded', d.body.classList.toggle('open')));

  // Videos that play only while on screen
  const vio = new IntersectionObserver(es => es.forEach(e => { const v = e.target; if (e.isIntersecting && !reduce) { if (!v.src && v.dataset.src) v.src = v.dataset.src; v.play().catch(() => {}); } else v.pause(); }), { rootMargin: '80px' });
  d.querySelectorAll('video[data-autoplay]').forEach(v => vio.observe(v));

  // Hero film: the foundry clips play in turn, each slowly dissolving into the next
  const film = d.querySelector('[data-film]');
  if (film && !reduce) {
    const vids = [...film.querySelectorAll('video')]; let i = -1, z = 1, busy = false;
    const load = v => { if (!v.src) { v.src = v.dataset.src; v.load(); } };
    const next = () => {
      const prev = vids[i]; i = (i + 1) % vids.length; const v = vids[i];
      load(v); load(vids[(i + 1) % vids.length]);
      v.currentTime = 0; v.style.zIndex = ++z;
      v.play().then(() => { v.classList.add('on'); if (prev && prev !== v) setTimeout(() => prev.classList.remove('on'), 2000); busy = false; }).catch(() => { busy = false; });
    };
    vids.forEach(v => v.addEventListener('timeupdate', () => {
      if (v !== vids[i] || busy || !v.duration) return;
      if (v.currentTime > v.duration - 1.8) { busy = true; next(); }
    }));
    setTimeout(next, 250);
  }

  // MNxtra band: sparks drift up out of the glow
  const sk = d.querySelector('.mnx .sparks');
  if (sk && !reduce) {
    const c = sk.getContext('2d'), P = []; let on = false, W = 0, H = 0;
    const size = () => { const r = devicePixelRatio > 1 ? 2 : 1; W = sk.width = sk.clientWidth * r; H = sk.height = sk.clientHeight * r; };
    const add = () => P.push({ x: W * (0.15 + Math.random() * 0.7), y: H + 10, vx: (Math.random() - .5) * .6, vy: -(0.6 + Math.random() * 1.6), l: 1, r: .6 + Math.random() * 1.8, f: Math.random() * 6 });
    const tick = () => {
      c.clearRect(0, 0, W, H); if (P.length < 140) { add(); add(); }
      c.globalCompositeOperation = 'lighter';
      for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.x += p.vx + Math.sin(p.f += .05) * .3; p.y += p.vy; p.l -= .0045; if (p.l <= 0 || p.y < 0) { P.splice(i, 1); continue; }
        const a = p.l * (.6 + .4 * Math.sin(p.f * 3)); c.fillStyle = `rgba(255,${150 + 80 * p.l | 0},70,${a})`; c.beginPath(); c.arc(p.x, p.y, p.r * (devicePixelRatio > 1 ? 2 : 1), 0, 7); c.fill(); }
      if (on) requestAnimationFrame(tick);
    };
    size(); addEventListener('resize', size);
    new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v && !on) { on = true; requestAnimationFrame(tick); } on = v; }).observe(sk);
  }

  // Part chosen on a product page: shown above the enquiry form
  const pn = d.querySelector('[data-partnote]'), pp = new URLSearchParams(location.search).get('part');
  if (pn && pp) { pn.textContent = 'Enquiry for: ' + pp + '. Please mention it in the form.'; pn.hidden = false; }

  const y = d.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();

  // Words that light up as you read
  d.querySelectorAll('[data-lit]').forEach(p => {
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) { const f = d.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(t => { if (!t.trim()) f.append(t); else { const s = d.createElement('span'); s.className = 'w' + (n.classList && n.classList.contains('hl') ? ' hl' : ''); s.textContent = t; f.append(s); } }); c.replaceWith(f); }
      else if (c.nodeType === 1) walk(c);
    });
    walk(p);
  });

  if (reduce || !G || !ST) {                               // no motion library or reduced motion: everything visible, no tweens
    d.querySelectorAll('.w').forEach(w => w.classList.add('on'));
    d.querySelectorAll('.chain li').forEach(li => li.classList.add('on'));
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    d.querySelectorAll('.rv').forEach(el => io.observe(el));
    return;
  }

  G.registerPlugin(ST);
  if (window.Lenis) { const lenis = new Lenis({ lerp: 0.1, smoothWheel: true }); lenis.on('scroll', ST.update); G.ticker.add(t => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }

  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  // hero: lines rise, the frame opens from a smaller rounded card, the facts count up
  G.from('.hero h1 .ln > span', { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: 0.12, delay: 0.15 });
  G.from('.hero .copy > :not(h1)', { opacity: 0, y: 18, duration: 1, ease: 'expo.out', stagger: 0.07, delay: 0.4 });
  G.from('.hero .frame', { scale: 0.86, borderRadius: 48, opacity: 0, duration: 1.6, ease: 'expo.out', delay: 0.1 });
  G.from('.hero .frame img', { scale: 1.25, duration: 2.2, ease: 'expo.out', delay: 0.1 });
  d.querySelectorAll('.facts-row b').forEach((b, k) => {
    const txt = b.firstChild && b.firstChild.nodeType === 3 ? b.firstChild : null, n = txt && parseFloat(txt.textContent);
    if (!txt || isNaN(n)) return;
    const dec = (txt.textContent.split('.')[1] || '').length, o = { v: 0 };
    G.to(o, { v: n, duration: 1.6, ease: 'power3.out', delay: 0.7 + k * 0.08, onUpdate: () => { txt.textContent = o.v.toFixed(dec); } });
  });

  // section headings rise word by word
  d.querySelectorAll('main h2').forEach(h => {
    if (h.closest('.hero, .caps') || h.hasAttribute('data-mnx')) return;
    const walk = n => [...n.childNodes].forEach(c => {
      if (c.nodeType === 3) { const f = d.createDocumentFragment(); c.textContent.split(/(\s+)/).forEach(t => { if (!t.trim()) f.append(t); else { const w = d.createElement('span'); w.className = 'wr'; const i = d.createElement('span'); i.textContent = t; w.append(i); f.append(w); } }); c.replaceWith(f); }
      else if (c.nodeType === 1 && !c.classList.contains('wr')) walk(c);
    });
    walk(h);
    G.from(h.querySelectorAll('.wr > span'), { yPercent: 115, rotate: 3, duration: 1.1, ease: 'expo.out', stagger: 0.045, scrollTrigger: { trigger: h, start: 'top 88%' } });
  });

  // soft reveals for the rest
  ST.batch('.rv:not(.photo):not(.q):not(.chain)', { start: 'top 88%', onEnter: els => els.forEach((el, k) => setTimeout(() => el.classList.add('in'), k * 80)) });

  // photographs wipe open and settle
  d.querySelectorAll('.photo').forEach(f => {
    f.classList.add('in');
    const m = f.querySelector('img,video');
    G.fromTo(f, { clipPath: 'inset(14% 10% 14% 10% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 18px)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%' } });
    if (m) G.fromTo(m, { scale: 1.22 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: f, start: 'top 85%' } });
  });

  // question cards deal in
  G.set('.q', { opacity: 0, y: 60, rotate: (k) => [-3, 0, 3][k % 3] });
  ST.batch('.q', { start: 'top 92%', onEnter: els => G.to(els, { opacity: 1, y: 0, rotate: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 }) });

  // product cards rise in a wave; on a mouse they tilt toward the pointer
  if (d.querySelector('.pcard')) G.set('.pcard', { opacity: 0, y: 50 });
  ST.batch('.pcard', { start: 'top 94%', onEnter: els => G.to(els, { opacity: 1, y: 0, duration: 1, ease: 'expo.out', stagger: 0.08 }) });
  addEventListener('load', () => ST.refresh());
  if (fine) d.querySelectorAll('.pcard').forEach(c => {
    const rx = G.quickTo(c, 'rotationX', { duration: 0.5, ease: 'power3' }), ry = G.quickTo(c, 'rotationY', { duration: 0.5, ease: 'power3' });
    G.set(c, { transformPerspective: 900 });
    c.addEventListener('pointermove', e => { const b = c.getBoundingClientRect(); ry(((e.clientX - b.left) / b.width - .5) * 8); rx(-((e.clientY - b.top) / b.height - .5) * 8); });
    c.addEventListener('pointerleave', () => { rx(0); ry(0); });
  });

  // buttons lean toward the pointer
  if (fine) d.querySelectorAll('.btn').forEach(b => {
    const x = G.quickTo(b, 'x', { duration: 0.4, ease: 'power3' }), y = G.quickTo(b, 'y', { duration: 0.4, ease: 'power3' });
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); x((e.clientX - r.left - r.width / 2) * 0.22); y((e.clientY - r.top - r.height / 2) * 0.3); });
    b.addEventListener('pointerleave', () => { x(0); y(0); });
  });

  // the contact band's glow follows the pointer
  d.querySelectorAll('.close-band').forEach(c => c.addEventListener('pointermove', e => { const b = c.getBoundingClientRect(); c.style.setProperty('--mx', (e.clientX - b.left) + 'px'); c.style.setProperty('--my', (e.clientY - b.top) + 'px'); }));

  // gentle parallax on framed photographs
  d.querySelectorAll('[data-parallax]').forEach(img => G.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.closest('figure,.frame') || img, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // the plant photo strip drifts sideways as you scroll
  d.querySelectorAll('[data-drift]').forEach(row => G.fromTo(row, { x: 0 }, { x: () => -(row.scrollWidth - innerWidth) * 0.6, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }));

  // product showcase: pinned on a wide screen, the parts slide past
  const show = d.querySelector('[data-show]');
  if (show) {
    const track = show.querySelector('.show-track');
    G.from(show.querySelectorAll('.sp'), { opacity: 0, x: 120, duration: 1.3, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: show, start: 'top 70%' } });
    ST.matchMedia({ '(min-width: 62.01rem)': () => {
      const dist = () => Math.max(0, track.scrollWidth - innerWidth);
      G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: show, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, anticipatePin: 1 } });
    } });
  }

  // MNxtra settles out of a wide spacing
  const mw = d.querySelector('[data-mnx]');
  if (mw) G.fromTo(mw, { letterSpacing: '0.08em', opacity: 0, y: 50 }, { letterSpacing: '-0.06em', opacity: 1, y: 0, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: mw, start: 'top 88%' } });

  // 4.5 t: the molten letters close in as you arrive
  const mol = d.querySelector('[data-molten] .molten-mask span');
  if (mol) G.fromTo(mol, { scale: 1.5, yPercent: 10 }, { scale: 1, yPercent: 0, ease: 'none', scrollTrigger: { trigger: mol.closest('.molten'), start: 'top bottom', end: 'center center', scrub: true } });

  // statement words light up
  d.querySelectorAll('[data-lit]').forEach(p => {
    const ws = [...p.querySelectorAll('.w')];
    ST.create({ trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: s => { const n = Math.round(s.progress * ws.length); ws.forEach((w, k) => w.classList.toggle('on', k < n)); } });
  });
})();
