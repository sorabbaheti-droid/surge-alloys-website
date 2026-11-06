// Inside a cone crusher: a cross-section drawn on canvas. Rock falls into the chamber, the mantle gyrates against
// the concave, rock that no longer fits the closing gap breaks into smaller pieces, and product leaves at the setting.
// Scroll moves the camera in (pinned on wide screens). Runs only while visible; a still frame under reduced motion.
(() => {
  const sec = document.querySelector('[data-crusher]');
  if (!sec) return;
  const cv = sec.querySelector('canvas'), ctx = cv.getContext('2d');
  const steps = [...sec.querySelectorAll('.cr-step')], pips = [...sec.querySelectorAll('.cr-prog i')];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pinned = () => matchMedia('(min-width: 60rem)').matches;
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const ease = x => x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x);
  const lerp = (a, b, t) => a + (b - a) * t;

  // ---- geometry (world units; x = 0 is the crusher axis, y grows downward)
  const TOP = -20, BOT = 282;                                  // chamber, feed opening to discharge
  const W = y => 150 - 55 * (y + 20) / 302 * 1.0;              // concave inner surface, half-width
  const M = y => y < 40 ? 0 : 82 * Math.min(1, (y - 40) / 232); // mantle surface, half-width from its axis
  const A = 9, OMEGA = 2 * Math.PI * 1.6;                      // eccentric throw and gyration (slowed so the eye can follow)
  let t = 0, e = 0;
  const gap = (y, s) => W(y) - M(y) - s * e;                   // s = +1 right side, -1 left side
  const mid = (y, s) => s > 0 ? ((e + M(y)) + W(y)) / 2 : ((e - M(y)) - W(y)) / 2;

  // ---- rock
  const STONE = ['#8f857a', '#a1968a', '#776f66', '#9a8c7c', '#827869', '#b0a596'];
  let rocks = [], dust = [], flashes = [];
  const shape = () => Array.from({ length: 7 }, (_, i) => 0.72 + Math.random() * 0.36);
  const rock = (x, y, r, s) => ({ x, y, r, s, vy: 40 + Math.random() * 60, vx: 0, rot: Math.random() * 6.28, vr: (Math.random() - .5) * 2, k: shape(), c: STONE[(Math.random() * STONE.length) | 0], held: false });
  const spawn = () => { const s = Math.random() < .5 ? -1 : 1; rocks.push(rock(s * (40 + Math.random() * 70), -300 - Math.random() * 40, 15 + Math.random() * 13, s)); };

  function crush(r) {
    const n = r.r > 9 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const c = rock(r.x + (Math.random() - .5) * r.r, r.y + (Math.random() - .3) * r.r * .6, r.r * (0.5 + Math.random() * .12), r.s);
      c.vy = 30; c.c = r.c; rocks.push(c);
    }
    for (let i = 0; i < 10; i++) dust.push({ x: r.x, y: r.y, vx: (Math.random() - .5) * 140, vy: (Math.random() - .7) * 120, life: .6 + Math.random() * .5, a: 1, amber: Math.random() < .35 });
    flashes.push({ x: r.x, y: r.y, life: .18 });
  }

  function step(dt, feed) {
    t += dt; e = A * Math.sin(OMEGA * t);
    if (rocks.length < 150 && Math.random() < feed * dt * 3.2) spawn();
    for (const r of rocks) {
      r.rot += r.vr * dt;
      if (r.y < TOP) {                                         // falling through the feed opening
        r.vy = Math.min(r.vy + 700 * dt, 520); r.y += r.vy * dt;
        r.x += (mid(TOP, r.s) - r.x) * Math.min(1, dt * 2.5);
        continue;
      }
      if (r.y > BOT) { r.vy = Math.min(r.vy + 700 * dt, 520); r.y += r.vy * dt; r.x += (r.s * 60 - r.x) * dt * .4; continue; }
      const g = gap(r.y + r.r * .6, r.s);
      r.x += (mid(r.y, r.s) - r.x) * Math.min(1, dt * 10);
      if (2 * r.r > g) {                                       // caught between the liners
        r.held = true; r.vy = 0;
        if (r.r > 2.6 && gap(r.y, r.s) < 2 * r.r * .86) { r.dead = true; crush(r); }
        else if (r.r <= 2.6) { r.y += 30 * dt; }
      } else {                                                 // fits: falls to the next squeeze
        r.held = false; r.vy = Math.min(r.vy + 600 * dt, 260); r.y += r.vy * dt;
      }
    }
    rocks = rocks.filter(r => !r.dead && r.y < 520);
    for (const d of dust) { d.vy += 240 * dt; d.x += d.vx * dt; d.y += d.vy * dt; d.life -= dt; }
    dust = dust.filter(d => d.life > 0);
    for (const f of flashes) f.life -= dt;
    flashes = flashes.filter(f => f.life > 0);
  }

  // ---- drawing
  let Wc = 0, Hc = 0, dpr = 1;
  function size() {
    const b = cv.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1);
    Wc = b.width; Hc = b.height; cv.width = Math.round(Wc * dpr); cv.height = Math.round(Hc * dpr);
  }
  function poly(pts) { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); }
  function draw(p) {
    const C = { ink: css('--color-ink'), muted: css('--color-muted'), rule: css('--color-rule'), accent: css('--color-accent'), amber: css('--color-amber'), paper: css('--color-paper') };
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, Wc, Hc);
    // amber work light from above
    const lg = ctx.createRadialGradient(Wc * .42, -Hc * .1, 10, Wc * .42, Hc * .2, Hc * 1.1);
    lg.addColorStop(0, 'rgba(255,170,80,0.22)'); lg.addColorStop(.45, 'rgba(255,140,50,0.07)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lg; ctx.fillRect(0, 0, Wc, Hc);

    // camera: whole machine, then into the chamber, then ease back to see the liners
    const z = !pinned() ? .15 : p < .2 ? 0 : p < .55 ? ease((p - .2) / .35) : 1 - .35 * ease((p - .78) / .22);
    const scale = Math.min(Wc / 640, Hc / 780) * lerp(1, 1.9, z);
    const cy = lerp(60, 150, z);
    ctx.translate(Wc / 2, Hc / 2); ctx.scale(scale, scale); ctx.translate(0, -cy);

    const hi = ease((p - .62) / .12);                         // liners light up in the last step
    // frame / housing
    ctx.lineWidth = 1.2 / scale * 1.2; ctx.strokeStyle = C.rule;
    poly([[-215, -30], [215, -30], [230, 300], [150, 330], [-150, 330], [-230, 300]]); ctx.stroke();
    // feed hopper
    ctx.beginPath(); ctx.moveTo(-250, -260); ctx.lineTo(-165, -30); ctx.moveTo(250, -260); ctx.lineTo(165, -30); ctx.stroke();

    // concave (bowl liner), both sides
    const conc = s => { const pts = []; for (let y = TOP; y <= BOT; y += 6) pts.push([s * W(y), y]); for (let y = BOT; y >= TOP; y -= 6) pts.push([s * (W(y) + 24), y]); return pts; };
    const steel = ctx.createLinearGradient(-200, 0, 200, 0); steel.addColorStop(0, '#5c5650'); steel.addColorStop(.5, '#9a938a'); steel.addColorStop(1, '#5c5650');
    for (const s of [-1, 1]) { poly(conc(s)); ctx.fillStyle = steel; ctx.fill(); }
    // mantle and head
    const man = []; for (let y = 40; y <= BOT; y += 6) man.push([e + M(y), y]); man.push([e + M(BOT), BOT + 26], [e - M(BOT), BOT + 26]); for (let y = BOT; y >= 40; y -= 6) man.push([e - M(y), y]);
    const mg = ctx.createLinearGradient(e - 90, 0, e + 90, 0); mg.addColorStop(0, '#4d4741'); mg.addColorStop(.45, '#a59c90'); mg.addColorStop(1, '#4d4741');
    poly(man); ctx.fillStyle = mg; ctx.fill();
    ctx.beginPath(); ctx.arc(e, 40, 10, Math.PI, 0); ctx.fillStyle = '#8d857a'; ctx.fill();
    // main shaft to the eccentric
    ctx.strokeStyle = C.rule; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(e, BOT + 26); ctx.lineTo(0, 400); ctx.stroke();
    ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(0, 400, 14, 0, Math.PI * 2); ctx.stroke();

    // liner glow (our parts)
    if (hi > 0) {
      ctx.save(); ctx.shadowColor = C.accent; ctx.shadowBlur = 18 * hi; ctx.strokeStyle = C.accent; ctx.globalAlpha = hi; ctx.lineWidth = 2.2;
      for (const s of [-1, 1]) { ctx.beginPath(); for (let y = TOP; y <= BOT; y += 6) y === TOP ? ctx.moveTo(s * W(y), y) : ctx.lineTo(s * W(y), y); ctx.stroke(); }
      ctx.beginPath(); for (let y = 40; y <= BOT; y += 6) y === 40 ? ctx.moveTo(e + M(y), y) : ctx.lineTo(e + M(y), y); ctx.stroke();
      ctx.beginPath(); for (let y = 40; y <= BOT; y += 6) y === 40 ? ctx.moveTo(e - M(y), y) : ctx.lineTo(e - M(y), y); ctx.stroke();
      ctx.restore();
    }

    // rock
    for (const r of rocks) {
      ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.rot);
      ctx.beginPath(); r.k.forEach((k, i) => { const a = i / r.k.length * Math.PI * 2; const px = Math.cos(a) * r.r * k, py = Math.sin(a) * r.r * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.closePath();
      ctx.fillStyle = r.c; ctx.fill();
      ctx.strokeStyle = 'rgba(255,190,120,0.35)'; ctx.lineWidth = 0.8; ctx.stroke();
      ctx.restore();
    }
    for (const f of flashes) { ctx.fillStyle = `rgba(255,190,110,${f.life * 2.4})`; ctx.beginPath(); ctx.arc(f.x, f.y, 10, 0, 6.28); ctx.fill(); }
    for (const d of dust) { ctx.fillStyle = d.amber ? `rgba(255,170,80,${d.life})` : `rgba(190,175,155,${d.life * .8})`; ctx.fillRect(d.x, d.y, 1.6, 1.6); }

    // labels
    const la = ease((p - .5) / .12);
    if (la > 0) {
      ctx.globalAlpha = la; ctx.fillStyle = C.ink; ctx.strokeStyle = C.muted; ctx.lineWidth = 1 / scale * 1.4;
      ctx.font = `500 ${13 / scale * 1.25}px Switzer, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Concave', W(TOP) + 12, TOP - 14 / scale * 1.4);
      ctx.fillText('Concave', -W(TOP) - 12, TOP - 14 / scale * 1.4);
      ctx.fillText('Mantle', e, 22);
      ctx.fillText('Setting: product leaves here', 0, BOT + 58);
      ctx.globalAlpha = 1;
    }
  }

  // ---- loop, scroll and visibility
  let p = 0, visible = false, last = 0, raf = 0;
  const progress = () => {
    if (!pinned()) return .62;
    const b = sec.getBoundingClientRect(), total = b.height - innerHeight;
    return Math.max(0, Math.min(.999, -b.top / total));
  };
  const setSteps = () => {
    const i = Math.min(steps.length - 1, Math.floor(p * steps.length));
    steps.forEach((s, k) => s.classList.toggle('on', !pinned() || k === i));
    pips.forEach((s, k) => s.classList.toggle('on', k <= i));
  };
  const frame = now => {
    const dt = Math.min(.033, (now - last) / 1000 || .016); last = now;
    p = progress(); setSteps();
    step(dt, p < .05 ? .6 : 1.4);
    draw(p);
    raf = visible ? requestAnimationFrame(frame) : 0;
  };
  size(); addEventListener('resize', () => { size(); if (!visible) draw(p); });
  if (reduce) { for (let i = 0; i < 900; i++) step(1 / 60, 1.4); p = .7; steps.forEach(s => s.classList.add('on')); draw(p); addEventListener('resize', () => draw(p)); return; }
  for (let i = 0; i < 240; i++) step(1 / 60, 1.2);           // start with rock already in the chamber
  new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible && !raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }, { rootMargin: '100px' }).observe(sec);
  p = progress(); setSteps(); draw(p);
})();
