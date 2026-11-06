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

  // Hero film: the furnace still, then the foundry clips crossfade in turn
  const film = d.querySelector('[data-film]');
  if (film && !reduce) {
    const vids = [...film.querySelectorAll('video')]; let i = -1;
    const next = () => {
      vids.forEach(v => v.classList.remove('on'));
      i = (i + 1) % vids.length; const v = vids[i];
      if (!v.src) v.src = v.dataset.src;
      v.currentTime = 0; v.play().then(() => v.classList.add('on')).catch(() => {});
      v.onended = next;
    };
    setTimeout(next, 3200);
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
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    d.querySelectorAll('.rv').forEach(el => io.observe(el));
    return;
  }

  G.registerPlugin(ST);
  if (window.Lenis) { const lenis = new Lenis({ lerp: 0.1, smoothWheel: true }); lenis.on('scroll', ST.update); G.ticker.add(t => lenis.raf(t * 1000)); G.ticker.lagSmoothing(0); }

  // hero lines rise in
  G.from('.hero h1 .ln > span', { yPercent: 110, duration: 1.1, ease: 'expo.out', stagger: 0.1, delay: 0.15 });
  G.from('.hero .copy > :not(h1)', { opacity: 0, y: 16, duration: 0.9, ease: 'expo.out', stagger: 0.06, delay: 0.35 });

  // reveals
  ST.batch('.rv', { start: 'top 88%', onEnter: els => els.forEach((el, k) => setTimeout(() => el.classList.add('in'), k * 70)) });

  // gentle parallax on framed photographs
  d.querySelectorAll('[data-parallax]').forEach(img => G.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: img.closest('figure,.frame') || img, start: 'top bottom', end: 'bottom top', scrub: true } }));

  // the plant photo strip drifts sideways as you scroll
  d.querySelectorAll('[data-drift]').forEach(row => G.fromTo(row, { x: 0 }, { x: () => -(row.scrollWidth - innerWidth) * 0.6, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }));

  // statement words light up
  d.querySelectorAll('[data-lit]').forEach(p => {
    const ws = [...p.querySelectorAll('.w')];
    ST.create({ trigger: p, start: 'top 80%', end: 'bottom 45%', scrub: true, onUpdate: s => { const n = Math.round(s.progress * ws.length); ws.forEach((w, k) => w.classList.toggle('on', k < n)); } });
  });
})();
