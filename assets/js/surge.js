// Surge Alloys: logo intro, mobile menu, quote form. No dependencies.
(() => {
  const d = document, reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Logo intro: once per visit, home page only, skippable
  const intro = d.querySelector('.intro');
  if (intro) {
    let seen = false; try { seen = sessionStorage.getItem('surge-intro') === '1'; } catch (e) {}
    const close = () => { if (!intro.isConnected) return; intro.classList.add('out'); setTimeout(() => intro.remove(), 450); try { sessionStorage.setItem('surge-intro', '1'); } catch (e) {} };
    if (seen || reduce) intro.remove();
    else {
      const v = intro.querySelector('video');
      v.addEventListener('ended', close);
      v.play().catch(close);
      setTimeout(close, 8000);
      intro.querySelector('.skipi').addEventListener('click', close);
      d.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }, { once: true });
    }
  }

  // Mobile menu
  const burger = d.querySelector('.burger');
  burger && burger.addEventListener('click', () => burger.setAttribute('aria-expanded', d.body.classList.toggle('open')));

  // Quote form: prepares the enquiry for Gmail, Outlook, the email app, or the clipboard
  const MAIL = 'sales@surgealloys.com';
  d.querySelectorAll('[data-rfq]').forEach(f => {
    const part = new URLSearchParams(location.search).get('part');
    if (part && f.elements.part) f.elements.part.value = part;
    f.querySelectorAll('.chips button').forEach(b => b.addEventListener('click', () => b.setAttribute('aria-pressed', b.getAttribute('aria-pressed') !== 'true')));
    f.addEventListener('submit', e => {
      e.preventDefault();
      const v = n => (f.elements[n] && f.elements[n].value || '').trim();
      let ok = true;
      ['part', 'email'].forEach(n => { const el = f.elements[n]; const bad = !v(n) || (n === 'email' && !/^\S+@\S+\.\S+$/.test(v(n))); el.setAttribute('aria-invalid', bad); if (bad && ok) { el.focus(); ok = false; } });
      const msg = f.querySelector('.msg');
      if (!ok) { msg.textContent = 'Add the part and your email. Everything else is optional.'; return; }
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
      box.innerHTML = `<h3>Your enquiry is ready</h3><p>Send it from the app you use, with your drawing or photographs attached.</p>
        <div class="actions"><a class="btn btn--primary" target="_blank" rel="noopener" href="https://mail.google.com/mail/?view=cm&fs=1&to=${MAIL}&su=${eS}&body=${eB}">Send with Gmail</a>
        <a class="btn" target="_blank" rel="noopener" href="https://outlook.office.com/mail/deeplink/compose?to=${MAIL}&subject=${eS}&body=${eB}">Outlook</a>
        <a class="btn" href="mailto:${MAIL}?subject=${eS}&body=${eB}">Email app</a>
        <button type="button" class="btn" data-copy>Copy enquiry</button></div>`;
      box.querySelector('[data-copy]').addEventListener('click', ev => {
        const t = `To: ${MAIL}\nSubject: ${sub}\n\n${body}`;
        (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => ev.target.textContent = 'Copied', () => {
          const ta = d.createElement('textarea'); ta.value = t; d.body.append(ta); ta.select(); d.execCommand('copy'); ta.remove(); ev.target.textContent = 'Copied'; });
      });
      box.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
    });
  });

  // Part chosen on a product page: shown above the embedded enquiry form
  const pn = d.querySelector('[data-partnote]'), pp = new URLSearchParams(location.search).get('part');
  if (pn && pp) { pn.textContent = 'Enquiry for: ' + pp + '. Please mention it in the form.'; pn.hidden = false; }

  const y = d.querySelector('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
