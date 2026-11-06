// Surge Alloys — site behaviour. No dependencies.
(() => {
  const d = document, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Logo intro: once per visit, home page only
  const intro = d.querySelector('.intro');
  if (intro) {
    let seen = false; try { seen = sessionStorage.getItem('surge-intro') === '1'; } catch (e) {}
    const close = () => { intro.classList.add('out'); setTimeout(() => intro.remove(), 1100); d.documentElement.style.overflow = ''; try { sessionStorage.setItem('surge-intro', '1'); } catch (e) {} };
    if (seen || reduce) intro.remove();
    else {
      d.documentElement.style.overflow = 'hidden';
      const v = intro.querySelector('video');
      v.addEventListener('ended', close);
      v.play().catch(close);
      setTimeout(close, 8000);
      intro.querySelector('.skipi').addEventListener('click', close);
    }
  }

  // Header: solid after scroll, hides on scroll down
  const hdr = d.querySelector('.hdr'); let last = 0;
  const onScroll = () => {
    const y = scrollY;
    hdr.classList.toggle('solid', y > 40);
    hdr.classList.toggle('hide', y > 400 && y > last && !d.body.classList.contains('open'));
    last = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  // Mobile menu
  const burger = d.querySelector('.burger');
  burger && burger.addEventListener('click', () => {
    const o = d.body.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });

  // Reveal on scroll
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
  d.querySelectorAll('.rv').forEach(el => io.observe(el));

  // Horizontal process strip
  d.querySelectorAll('[data-hs]').forEach(ctl => {
    const t = d.getElementById(ctl.dataset.hs);
    ctl.querySelectorAll('button').forEach(b => b.addEventListener('click', () => t.scrollBy({ left: (b.dataset.dir === 'next' ? 1 : -1) * t.clientWidth * .8, behavior: 'smooth' })));
  });

  // Work-hardening story
  const wh = d.querySelector('.wh-track');
  if (wh) {
    const steps = [...wh.querySelectorAll('.wh-step')], pips = [...wh.querySelectorAll('.wh-prog i')];
    const hb = wh.querySelector('[data-hb]'), band = wh.querySelector('#hardband'), face = wh.querySelector('#face'),
          rocks = [...wh.querySelectorAll('.rock')], core = wh.querySelector('#corelabel'), skin = wh.querySelector('#skinlabel');
    const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
    let cur = -1;
    const draw = p => {
      const n = steps.length, i = Math.min(n - 1, Math.floor(p * n));
      if (i !== cur) { steps.forEach((s, k) => s.classList.toggle('on', k === i)); pips.forEach((s, k) => s.classList.toggle('on', k <= i)); cur = i; }
      const h = ease((p - .22) / .45);              // hardening happens during steps 2–3
      const v = Math.round(200 + 300 * h);
      hb.textContent = h >= .999 ? '500+' : v;
      band.setAttribute('height', 8 + 52 * h);
      band.style.opacity = .25 + .75 * h;
      face.style.opacity = h;
      const hit = p > .2 && p < .72;
      rocks.forEach((r, k) => { const ph = ((p * 9 + k * .33) % 1); r.style.transform = hit ? `translateY(${ -140 + 140 * ph }px)` : 'translateY(-200px)'; r.style.opacity = hit ? 1 - ph * .4 : 0; });
      skin.style.opacity = h; core.style.opacity = p > .45 ? 1 : 0;
    };
    if (matchMedia('(max-width: 900px)').matches) { steps.forEach(s => s.classList.add('on')); draw(1); }
    else {
      const tick = () => {
        const r = wh.getBoundingClientRect(), total = r.height - innerHeight;
        draw(Math.max(0, Math.min(.999, -r.top / total)));
      };
      addEventListener('scroll', tick, { passive: true }); addEventListener('resize', tick); tick();
    }
  }

  // Quote form → prepared enquiry (Gmail / Outlook / email app / copy)
  const MAIL = 'sales@surgealloys.com';
  d.querySelectorAll('[data-rfq]').forEach(f => {
    const part = new URLSearchParams(location.search).get('part');
    if (part && f.part) f.part.value = part;
    f.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    f.addEventListener('submit', e => {
      e.preventDefault();
      const v = n => (f.elements[n] && f.elements[n].value || '').trim();
      let ok = true;
      ['part', 'email'].forEach(n => { const el = f.elements[n]; const bad = !v(n) || (n === 'email' && !/^\S+@\S+\.\S+$/.test(v(n))); el.setAttribute('aria-invalid', bad); if (bad && ok) { el.focus(); ok = false; } });
      const msg = f.querySelector('.msg');
      if (!ok) { msg.textContent = 'Please add the part and your email. Everything else is optional.'; return; }
      msg.textContent = '';
      const have = [...f.querySelectorAll('.chips button[aria-pressed=true]')].map(b => b.textContent).join(', ') || 'Not stated';
      const body = [
        `Part: ${v('part')}`, `Crusher / equipment: ${v('equip') || 'Not stated'}`, `Grade: ${v('grade') || 'Please recommend'}`,
        `Quantity: ${v('qty') || 'Not stated'}`, `What I can send: ${have}`, `Problem / notes: ${v('notes') || '-'}`, '',
        `Name: ${v('name')}`, `Company: ${v('company')}`, `Email: ${v('email')}`, `Phone: ${v('phone')}`, `Country: ${v('country')}`
      ].join('\n');
      const sub = 'Enquiry: ' + v('part'), eS = encodeURIComponent(sub), eB = encodeURIComponent(body);
      let box = f.querySelector('.sendbox');
      if (!box) { box = d.createElement('div'); box.className = 'sendbox'; f.append(box); }
      box.innerHTML = `<h3>Your enquiry is ready</h3><p class="mu">Send it with the app you use. Attach your drawing or photographs before sending.</p>
        <div class="opts"><a class="btn" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=${MAIL}&su=${eS}&body=${eB}">Send with Gmail</a>
        <a class="btn ghost" target="_blank" rel="noopener" href="https://outlook.office.com/mail/deeplink/compose?to=${MAIL}&subject=${eS}&body=${eB}">Outlook</a>
        <a class="btn ghost" href="mailto:${MAIL}?subject=${eS}&body=${eB}">Email app</a>
        <button type="button" class="btn ghost" data-copy>Copy enquiry</button></div>`;
      box.querySelector('[data-copy]').addEventListener('click', ev => {
        const t = `To: ${MAIL}\nSubject: ${sub}\n\n${body}`;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => ev.target.textContent = 'Copied', () => {
          const ta = d.createElement('textarea'); ta.value = t; d.body.append(ta); ta.select(); d.execCommand('copy'); ta.remove(); ev.target.textContent = 'Copied'; });
      });
      box.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
  });

  const y = d.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
